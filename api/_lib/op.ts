// Cliente de Open Payments de Súbase. Firmas verificadas en @interledger/open-payments 7.4.0
// y contra la Test Wallet con scripts/spike-pago.ts (AGENTS.md §8.1).
import {
  createAuthenticatedClient,
  isFinalizedGrantWithAccessToken,
  isPendingGrant,
  OpenPaymentsClientError,
  type AuthenticatedClient,
  type PendingGrant,
  type WalletAddress
} from '@interledger/open-payments'
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { db, ok, type Pase, type Vehiculo } from './db.js'
import { desdeOpenPayments, ErrorApi } from './errores.js'

// ---------- Cliente ----------

let clientePromesa: Promise<AuthenticatedClient> | undefined

/** Un solo cliente por instancia de la función (se reutiliza entre invocaciones en caliente). */
export function opClient(): Promise<AuthenticatedClient> {
  if (!clientePromesa) {
    const b64 = process.env.OP_PRIVATE_KEY_B64
    const ruta = process.env.OP_PRIVATE_KEY_PATH
    const walletAddressUrl = process.env.OP_CLIENT_WALLET_ADDRESS
    const keyId = process.env.OP_KEY_ID
    if (!walletAddressUrl || !keyId || !(b64 || ruta)) {
      throw new Error('Faltan OP_CLIENT_WALLET_ADDRESS, OP_KEY_ID u OP_PRIVATE_KEY_B64/OP_PRIVATE_KEY_PATH')
    }
    clientePromesa = createAuthenticatedClient({
      walletAddressUrl: normalizarWallet(walletAddressUrl),
      keyId,
      privateKey: b64 ? llavePrivada(b64) : ruta!
    }).catch((e) => {
      clientePromesa = undefined
      throw e
    })
  }
  return clientePromesa
}

/**
 * OP_PRIVATE_KEY_B64 se acepta de tres formas, porque al pegarla en Vercel es fácil equivocarse:
 * base64 del archivo .key, el PEM tal cual (con saltos de línea) o el PEM con "\n" escritos como texto.
 */
export function llavePrivada(valor: string): Buffer {
  const v = valor.trim()
  if (v.includes('-----BEGIN')) return Buffer.from(v.replace(/\\n/g, '\n'))
  return Buffer.from(v.replace(/\s+/g, ''), 'base64')
}

/** Ejecuta una llamada al SDK y traduce sus errores a los códigos de la API. */
async function op<T>(operacion: string, fn: (c: AuthenticatedClient) => Promise<T>): Promise<T> {
  const c = await opClient()
  try {
    return await fn(c)
  } catch (e) {
    if (e instanceof OpenPaymentsClientError) throw desdeOpenPayments(e, operacion)
    throw e
  }
}

// ---------- Utilidades ----------

/** La Test Wallet muestra "$ilp.interledger-test.dev/x"; el SDK exige "https://ilp.interledger-test.dev/x". */
export function normalizarWallet(w: string): string {
  const t = w.trim()
  return t.startsWith('$') ? `https://${t.slice(1)}` : t
}

/** Pesos (lo que ve el front) → unidades mínimas en string (lo que pide Open Payments). */
export const aMinimas = (pesos: number, scale: number): string => String(Math.round(pesos * 10 ** scale))

/** Unidades mínimas → pesos. */
export const aPesos = (minimas: number | string, scale: number): number => Number(minimas) / 10 ** scale

/** Tope que se reinicia cada día a medianoche de Colombia (UTC-5): R/<hoy>T05:00:00Z/P1D. */
export function intervaloDiario(ahora = new Date()): string {
  const colombia = new Date(ahora.getTime() - 5 * 3600 * 1000)
  return `R/${colombia.toISOString().slice(0, 10)}T05:00:00Z/P1D`
}

const cacheWallets = new Map<string, { w: WalletAddress; expira: number }>()

export async function obtenerWallet(url: string): Promise<WalletAddress> {
  const u = normalizarWallet(url)
  const c = cacheWallets.get(u)
  if (c && c.expira > Date.now()) return c.w
  const w = await op('walletAddress.get', (cl) => cl.walletAddress.get({ url: u })).catch((e) => {
    // Una wallet que no existe no es un error de Open Payments: es un dato inválido del usuario.
    if (e instanceof ErrorApi && e.code === 'OP_ERROR') throw new ErrorApi('DATOS_INVALIDOS', 'No encontramos esa wallet.')
    throw e
  })
  cacheWallets.set(u, { w, expira: Date.now() + 10 * 60_000 })
  return w
}

// ---------- Pase (grant interactivo) ----------

export interface PaseSolicitado {
  wallet: WalletAddress
  clientNonce: string
  pendiente: PendingGrant
}

/** Pide el grant interactivo de outgoing-payment con tope diario y sin receiver. */
export async function solicitarPase(args: {
  walletAddress: string
  topeMinimas: string
  finishUri: string
}): Promise<PaseSolicitado> {
  const wallet = await obtenerWallet(args.walletAddress)
  const clientNonce = randomUUID()
  const grant = await op('grant.request (pase)', (c) =>
    c.grant.request(
      { url: wallet.authServer },
      {
        access_token: {
          access: [
            {
              type: 'outgoing-payment',
              actions: ['create', 'read'],
              identifier: wallet.id,
              limits: {
                debitAmount: { value: args.topeMinimas, assetCode: wallet.assetCode, assetScale: wallet.assetScale },
                interval: intervaloDiario()
              }
            }
          ]
        },
        interact: { start: ['redirect'], finish: { method: 'redirect', uri: args.finishUri, nonce: clientNonce } }
      }
    )
  )
  if (!isPendingGrant(grant)) throw new ErrorApi('OP_ERROR', 'La wallet no pidió autorización para el pase.')
  return { wallet, clientNonce, pendiente: grant }
}

/**
 * Hash de GNAP: sha256 en base64 de "nonceCliente\nnonceServidor\ninteract_ref\nauthServer".
 * Verificado contra la Test Wallet: authServer tal como lo devuelve la wallet (sin "/" final).
 */
export function verificarHash(a: {
  clientNonce: string
  interactFinish: string
  interactRef: string
  authServer: string
  hash: string
}): boolean {
  const esperado = createHash('sha256')
    .update(`${a.clientNonce}\n${a.interactFinish}\n${a.interactRef}\n${a.authServer}`)
    .digest('base64')
  const x = Buffer.from(esperado)
  const y = Buffer.from(a.hash)
  return x.length === y.length && timingSafeEqual(x, y)
}

/** Termina el grant del pase. Devuelve el access token, su URL de manejo y cuándo vence. */
export async function continuarPase(a: { continueUri: string; continueToken: string; interactRef: string }) {
  const grant = await op('grant.continue', (c) =>
    c.grant.continue({ url: a.continueUri, accessToken: a.continueToken }, { interact_ref: a.interactRef })
  ).catch((e) => {
    if (e instanceof ErrorApi) throw new ErrorApi('PASE_INVALIDO', 'La wallet no confirmó el pase. Actívelo de nuevo.', e.details)
    throw e
  })
  if (!isFinalizedGrantWithAccessToken(grant)) throw new ErrorApi('PASE_INVALIDO', 'La wallet aún no aprueba el pase.')
  const { value, manage, expires_in } = grant.access_token
  return { accessToken: value, manageUrl: manage, expiraEn: vencimiento(expires_in) }
}

const vencimiento = (expiresIn?: number) =>
  expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null

/**
 * Devuelve un access token del pase que sirva al menos 60 s más.
 * En la Test Wallet el token dura 600 s, así que casi siempre rota. Guarda value, manage y vencimiento nuevos.
 */
export async function asegurarToken(pase: Pase): Promise<string> {
  if (!pase.access_token || !pase.manage_url) throw new ErrorApi('PASE_INVALIDO')
  const vence = pase.token_expira_en ? Date.parse(pase.token_expira_en) : Infinity
  if (vence - Date.now() > 60_000) return pase.access_token

  try {
    const { access_token } = await op('token.rotate', (c) =>
      c.token.rotate({ url: pase.manage_url!, accessToken: pase.access_token! })
    )
    const cambios = {
      access_token: access_token.value,
      manage_url: access_token.manage,
      token_expira_en: vencimiento(access_token.expires_in)
    }
    ok(await db().from('pases').update(cambios).eq('id', pase.id), 'guardar token rotado')
    Object.assign(pase, cambios)
    return access_token.value
  } catch (e) {
    // Rotar un token vencido SÍ funciona (verificado con scripts/prueba-rotacion.ts). Si falla con 401/403,
    // el grant fue revocado o no existe: el pase queda vencido.
    if (e instanceof ErrorApi && e.code === 'PASE_VENCIDO') {
      ok(await db().from('pases').update({ estado: 'vencido' }).eq('id', pase.id), 'marcar pase vencido')
    }
    throw e
  }
}

// ---------- Grants no interactivos (incoming-payment y quote), cacheados por instancia ----------

const cacheGrants = new Map<string, { token: string; expira: number }>()

async function grantNoInteractivo(authServer: string, tipo: 'incoming-payment' | 'quote'): Promise<string> {
  const clave = `${authServer}|${tipo}`
  const c = cacheGrants.get(clave)
  if (c && c.expira - Date.now() > 60_000) return c.token
  const access =
    tipo === 'incoming-payment'
      ? [{ type: 'incoming-payment' as const, actions: ['create' as const, 'read' as const, 'complete' as const] }]
      : [{ type: 'quote' as const, actions: ['create' as const, 'read' as const] }]
  const grant = await op(`grant.request (${tipo})`, (cl) => cl.grant.request({ url: authServer }, { access_token: { access } }))
  if (!isFinalizedGrantWithAccessToken(grant)) throw new ErrorApi('OP_ERROR', `El grant de ${tipo} pidió interacción.`)
  const t = grant.access_token
  cacheGrants.set(clave, { token: t.value, expira: Date.now() + (t.expires_in ?? 600) * 1000 })
  return t.value
}

/** Reintenta una vez con un grant nuevo si el cacheado ya no sirve (401). */
async function conGrant<T>(authServer: string, tipo: 'incoming-payment' | 'quote', fn: (token: string) => Promise<T>) {
  try {
    return await fn(await grantNoInteractivo(authServer, tipo))
  } catch (e) {
    if (!(e instanceof ErrorApi && e.code === 'PASE_VENCIDO')) throw e
    cacheGrants.delete(`${authServer}|${tipo}`)
    return fn(await grantNoInteractivo(authServer, tipo))
  }
}

// ---------- Cobro de un viaje ----------

export interface PagoCreado {
  incomingPaymentId: string
  quoteId: string
  outgoingPaymentId: string
  /** Lo que se le debitará al pasajero en SU moneda (debitAmount de la quote). Puede ser CAD, USD, etc. */
  debito: { valor: number; moneda: string; escala: number }
}

/**
 * incoming payment (wallet de la flota, con metadata) → quote (wallet del pasajero, method 'ilp')
 * → outgoing payment con el token del pase. No espera la liquidación: ver esperarConfirmacion.
 *
 * Pago entre monedas: el incoming payment fija lo que RECIBE el bus (tarifa en COP). La quote se crea en la
 * wallet del pasajero y su proveedor calcula el debitAmount en la moneda del pasajero con su tasa de cambio
 * (verificado en la Test Wallet: 3.200 COP ← 1,44 CAD). Súbase no maneja tasas.
 */
export async function crearPago(a: {
  pase: Pase
  accessToken: string
  vehiculo: Vehiculo
  viajeId: string
  turnoId: string | null
}): Promise<PagoCreado> {
  const flota = await obtenerWallet(a.vehiculo.wallet_address)
  const pasajero = await obtenerWallet(a.pase.wallet_address)

  const incoming = await conGrant(flota.authServer, 'incoming-payment', (accessToken) =>
    op('incomingPayment.create', (c) =>
      c.incomingPayment.create(
        { url: flota.resourceServer, accessToken },
        {
          walletAddress: flota.id,
          incomingAmount: { value: String(a.vehiculo.tarifa), assetCode: a.vehiculo.asset_code, assetScale: a.vehiculo.asset_scale },
          expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
          metadata: { vehiculoId: a.vehiculo.id, turnoId: a.turnoId, viajeId: a.viajeId }
        }
      )
    )
  )

  // La quote vence a los 5 min: se crea justo antes del outgoing payment.
  const quote = await conGrant(pasajero.authServer, 'quote', (accessToken) =>
    op('quote.create', (c) =>
      c.quote.create(
        { url: pasajero.resourceServer, accessToken },
        { walletAddress: pasajero.id, receiver: incoming.id, method: 'ilp' }
      )
    )
  )

  const saliente = await op('outgoingPayment.create', (c) =>
    c.outgoingPayment.create(
      { url: pasajero.resourceServer, accessToken: a.accessToken },
      {
        walletAddress: pasajero.id,
        quoteId: quote.id,
        metadata: { descripcion: `Súbase · ${a.vehiculo.nombre} · ${a.vehiculo.ruta}` }
      }
    )
  )

  return {
    incomingPaymentId: incoming.id,
    quoteId: quote.id,
    outgoingPaymentId: saliente.id,
    debito: {
      valor: Number(quote.debitAmount.value),
      moneda: quote.debitAmount.assetCode,
      escala: quote.debitAmount.assetScale
    }
  }
}

/**
 * Espera a que el pago se liquide (en la Test Wallet tarda ~3-6 s).
 * Se confirma del lado del BUS: el incoming payment recibió la tarifa completa. No se usa
 * `sentAmount === debitAmount` del outgoing: en pagos dentro del mismo Rafiki se debita
 * debitAmount MENOS comisiones (rafiki outgoing/lifecycle.ts), así que con conversión de moneda
 * o comisiones esa igualdad puede no cumplirse nunca.
 * `failed` sin nada enviado se trata como saldo insuficiente (TODO verificar con una wallet sin saldo).
 */
export async function esperarConfirmacion(
  a: { outgoingPaymentId: string; incomingPaymentId: string; walletFlota: string; accessToken: string },
  maxMs = 15_000
): Promise<{ estado: 'pagado' | 'fallido' | 'pendiente'; errorCode?: 'SALDO_INSUFICIENTE' | 'OP_ERROR' }> {
  const flota = await obtenerWallet(a.walletFlota)
  const fin = Date.now() + maxMs
  for (;;) {
    const entrante = await conGrant(flota.authServer, 'incoming-payment', (accessToken) =>
      op('incomingPayment.get', (c) => c.incomingPayment.get({ url: a.incomingPaymentId, accessToken }))
    )
    const esperado = BigInt(entrante.incomingAmount?.value ?? '0')
    if (entrante.completed || (esperado > 0n && BigInt(entrante.receivedAmount.value) >= esperado)) {
      return { estado: 'pagado' }
    }
    const saliente = await op('outgoingPayment.get', (c) =>
      c.outgoingPayment.get({ url: a.outgoingPaymentId, accessToken: a.accessToken })
    )
    if (saliente.failed) {
      return { estado: 'fallido', errorCode: saliente.sentAmount.value === '0' ? 'SALDO_INSUFICIENTE' : 'OP_ERROR' }
    }
    if (Date.now() > fin) return { estado: 'pendiente' }
    await new Promise((r) => setTimeout(r, 700))
  }
}

// ---------- Billetera del pasajero: moneda y topes sugeridos ----------

/** Topes diarios sugeridos (en unidades de la moneda, no mínimas). El del medio es el sugerido. */
export function topesPara(moneda: string): number[] {
  const tabla: Record<string, number[]> = {
    COP: [10_000, 20_000, 30_000],
    MXN: [50, 100, 200],
    BRL: [10, 20, 50],
    ZAR: [50, 100, 200],
    JPY: [500, 1_000, 2_000]
  }
  return tabla[moneda] ?? [5, 10, 20] // USD, CAD, EUR, GBP, …
}

/** "turista1", "$ilp.interledger-test.dev/turista1" o la URL completa → URL https de la Test Wallet. */
export function direccionWallet(entrada: string): string {
  const t = entrada.trim()
  if (/^https?:\/\//.test(t) || t.startsWith('$')) return normalizarWallet(t)
  if (t.includes('/')) return `https://${t}`
  return `https://ilp.interledger-test.dev/${t}`
}

/** Lo debitado en el intervalo actual del pase (unidades mínimas). De aquí sale "disponible hoy". */
export async function gastadoHoy(pase: Pase, accessToken: string): Promise<number> {
  const r = await op('outgoingPayment.getGrantSpentAmounts', (c) =>
    c.outgoingPayment.getGrantSpentAmounts({ url: pase.resource_server, accessToken })
  )
  return Number(r.spentDebitAmount?.value ?? 0)
}
