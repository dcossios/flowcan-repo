/**
 * Spike de pago real contra la Interledger Test Wallet.
 *
 * Recorre el flujo completo de Súbase: pase interactivo (con tope diario) → verificación del hash →
 * grant.continue → incoming payment → quote → outgoing payment → confirmación → rotación de token.
 * Al final imprime los hallazgos que hay que pasar a AGENTS.md §8.1.
 *
 * Uso: cp .env.example .env.local (llenarlo) y, dentro de scripts/: npm i && npm run spike
 * Firmas verificadas contra @interledger/open-payments 7.4.0 (ver AGENTS.md §8.1).
 */
import {
  createAuthenticatedClient,
  isFinalizedGrantWithAccessToken,
  isPendingGrant,
  OpenPaymentsClientError
} from '@interledger/open-payments'
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import { createServer } from 'node:http'
import { Buffer } from 'node:buffer'

const env = (name: string, fallback?: string): string => {
  const v = process.env[name] ?? fallback
  if (!v) throw new Error(`Falta la variable ${name} (ver .env.example)`)
  return v
}

// La Test Wallet muestra direcciones como $ilp.interledger-test.dev/nombre; el SDK exige https://
const https = (w: string) => (w.startsWith('$') ? `https://${w.slice(1)}` : w)

const PUERTO = Number(env('SPIKE_PUERTO', '3999'))
const CALLBACK = `http://localhost:${PUERTO}/callback`
const MONTO = env('SPIKE_MONTO', '100')
const TOPE = env('SPIKE_TOPE', '1000')
const hallazgos: string[] = []
const paso = (n: string, msg: string, data?: unknown) =>
  console.log(`\n[${n}] ${msg}`, data === undefined ? '' : JSON.stringify(data, null, 2))

/** Intervalo diario que reinicia a medianoche de Colombia (UTC-5): R/<hoy>T05:00:00Z/P1D */
function intervaloDiario(): string {
  const colombia = new Date(Date.now() - 5 * 3600 * 1000)
  return `R/${colombia.toISOString().slice(0, 10)}T05:00:00Z/P1D`
}

/** Levanta un servidor local y espera el redirect de la wallet con interact_ref y hash. */
function esperarCallback(): Promise<{ interactRef: string; hash: string }> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${PUERTO}`)
      if (url.pathname !== '/callback') {
        res.writeHead(404).end()
        return
      }
      const interactRef = url.searchParams.get('interact_ref')
      const hash = url.searchParams.get('hash')
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      res.end('<h3>Pase autorizado. Puedes volver a la terminal.</h3>')
      server.close()
      if (!interactRef || !hash) {
        reject(new Error(`Redirect sin interact_ref/hash: ${url.search}`))
        return
      }
      resolve({ interactRef, hash })
    })
    server.listen(PUERTO)
  })
}

const sha256b64 = (s: string) => createHash('sha256').update(s).digest('base64')

async function main() {
  const privateKey = process.env.OP_PRIVATE_KEY_B64
    ? Buffer.from(process.env.OP_PRIVATE_KEY_B64, 'base64')
    : env('OP_PRIVATE_KEY_PATH', './private.key')

  const client = await createAuthenticatedClient({
    walletAddressUrl: https(env('OP_CLIENT_WALLET_ADDRESS')),
    keyId: env('OP_KEY_ID'),
    privateKey
  })

  // 1. Wallet addresses
  const pasajero = await client.walletAddress.get({ url: https(env('SPIKE_PASAJERO_WALLET')) })
  const vehiculo = await client.walletAddress.get({ url: https(env('SPIKE_VEHICULO_WALLET')) })
  paso('1', 'Wallet addresses', { pasajero, vehiculo })
  hallazgos.push(
    `Moneda pasajero: ${pasajero.assetCode}/${pasajero.assetScale}; vehículo: ${vehiculo.assetCode}/${vehiculo.assetScale}`
  )

  // 2. Pase: grant interactivo de outgoing-payment con tope diario
  const clientNonce = randomUUID()
  const interval = intervaloDiario()
  const pendiente = await client.grant.request(
    { url: pasajero.authServer },
    {
      access_token: {
        access: [
          {
            type: 'outgoing-payment',
            actions: ['create', 'read'],
            identifier: pasajero.id,
            limits: {
              debitAmount: { value: TOPE, assetCode: pasajero.assetCode, assetScale: pasajero.assetScale },
              interval
            }
          }
        ]
      },
      interact: { start: ['redirect'], finish: { method: 'redirect', uri: CALLBACK, nonce: clientNonce } }
    }
  )
  if (!isPendingGrant(pendiente)) throw new Error('Se esperaba un grant interactivo (pendiente)')
  paso('2', 'Grant del pase pendiente. Abre este enlace y aprueba:', pendiente.interact.redirect)
  const esperando = esperarCallback()

  // 3. Callback + verificación del hash
  const { interactRef, hash } = await esperando
  const base = (authServer: string) =>
    `${clientNonce}\n${pendiente.interact.finish}\n${interactRef}\n${authServer}`
  const variantes = [pasajero.authServer, pasajero.authServer.replace(/\/$/, ''), `${pasajero.authServer.replace(/\/$/, '')}/`]
  const coincide = variantes.find((v) => {
    const a = Buffer.from(sha256b64(base(v)))
    const b = Buffer.from(hash)
    return a.length === b.length && timingSafeEqual(a, b)
  })
  paso('3', coincide ? 'Hash verificado con authServer' : 'EL HASH NO COINCIDE', { coincide, authServer: pasajero.authServer })
  hallazgos.push(
    coincide
      ? `Hash OK con la URL del authServer tal como la devuelve la wallet: "${coincide}"`
      : 'Hash NO coincide con ninguna variante de la URL del authServer: revisar el orden de los campos'
  )
  if (!coincide) throw new Error('Hash inválido')

  // 4. Continuar el grant
  const grant = await client.grant.continue(
    { url: pendiente.continue.uri, accessToken: pendiente.continue.access_token.value },
    { interact_ref: interactRef }
  )
  if (!isFinalizedGrantWithAccessToken(grant)) throw new Error('El grant no quedó finalizado')
  const pase = grant.access_token
  paso('4', 'Pase activo', { expires_in: pase.expires_in, access: pase.access })
  hallazgos.push(`access_token.expires_in del pase: ${pase.expires_in ?? 'no viene (sin vencimiento declarado)'}`)

  // 5. Incoming payment en la wallet del vehículo (grant no interactivo)
  const grantIncoming = await client.grant.request(
    { url: vehiculo.authServer },
    { access_token: { access: [{ type: 'incoming-payment', actions: ['create', 'read', 'complete'] }] } }
  )
  if (!isFinalizedGrantWithAccessToken(grantIncoming)) throw new Error('El grant incoming-payment pidió interacción')
  const incoming = await client.incomingPayment.create(
    { url: vehiculo.resourceServer, accessToken: grantIncoming.access_token.value },
    {
      walletAddress: vehiculo.id,
      incomingAmount: { value: MONTO, assetCode: vehiculo.assetCode, assetScale: vehiculo.assetScale },
      metadata: { vehiculoId: 'bus-01', turnoId: 'spike', viajeId: randomUUID() }
    }
  )
  paso('5', 'Incoming payment creado', incoming)
  hallazgos.push(`metadata del incoming payment devuelta por la wallet: ${JSON.stringify(incoming.metadata ?? null)}`)

  // 6. Quote en la wallet del pasajero (grant no interactivo)
  const grantQuote = await client.grant.request(
    { url: pasajero.authServer },
    { access_token: { access: [{ type: 'quote', actions: ['create', 'read'] }] } }
  )
  if (!isFinalizedGrantWithAccessToken(grantQuote)) throw new Error('El grant quote pidió interacción')
  const quote = await client.quote.create(
    { url: pasajero.resourceServer, accessToken: grantQuote.access_token.value },
    { walletAddress: pasajero.id, receiver: incoming.id, method: 'ilp' }
  )
  paso('6', 'Quote', { debitAmount: quote.debitAmount, receiveAmount: quote.receiveAmount, expiresAt: quote.expiresAt })

  // 7. Outgoing payment con el token del pase
  const t0 = Date.now()
  const saliente = await client.outgoingPayment.create(
    { url: pasajero.resourceServer, accessToken: pase.value },
    { walletAddress: pasajero.id, quoteId: quote.id, metadata: { descripcion: 'Súbase · Bus 01 · Spike' } }
  )
  paso('7', 'Outgoing payment creado', saliente)
  hallazgos.push(`grantSpentDebitAmount en la respuesta: ${JSON.stringify(saliente.grantSpentDebitAmount ?? null)}`)

  // 8. Confirmar que el dinero llegó (no basta con crear el pago)
  let estado = 'pendiente'
  for (let i = 0; i < 30 && estado === 'pendiente'; i++) {
    const op = await client.outgoingPayment.get({ url: saliente.id, accessToken: pase.value })
    if (op.failed) estado = 'fallido'
    else if (op.sentAmount.value === op.debitAmount.value) estado = 'pagado'
    else await new Promise((r) => setTimeout(r, 1000))
  }
  const ms = Date.now() - t0
  paso('8', `Estado del pago: ${estado} (${ms} ms desde la creación)`)
  hallazgos.push(`Liquidación: ${estado} en ${ms} ms`)

  const gastado = await client.outgoingPayment.getGrantSpentAmounts({
    url: pasajero.resourceServer,
    accessToken: pase.value
  })
  paso('9', 'Gastado en el intervalo actual (de aquí sale "disponible hoy")', gastado)

  // 10. Rotación del token (invalida el anterior: se hace al final)
  const rotado = await client.token.rotate({ url: pase.manage, accessToken: pase.value })
  paso('10', 'Token rotado', { expires_in: rotado.access_token.expires_in, tieneManage: !!rotado.access_token.manage })
  hallazgos.push('token.rotate devuelve value + manage nuevos: se guardan ambos')

  // 11. Opcional: pago sin quote
  if (process.env.SPIKE_SIN_QUOTE === '1') {
    try {
      const inc2 = await client.incomingPayment.create(
        { url: vehiculo.resourceServer, accessToken: grantIncoming.access_token.value },
        { walletAddress: vehiculo.id, incomingAmount: { value: MONTO, assetCode: vehiculo.assetCode, assetScale: vehiculo.assetScale } }
      )
      const op2 = await client.outgoingPayment.create(
        { url: pasajero.resourceServer, accessToken: rotado.access_token.value },
        {
          walletAddress: pasajero.id,
          incomingPayment: inc2.id,
          debitAmount: { value: MONTO, assetCode: pasajero.assetCode, assetScale: pasajero.assetScale }
        }
      )
      hallazgos.push(`Pago sin quote: FUNCIONA (${op2.id})`)
    } catch (e) {
      hallazgos.push(`Pago sin quote: NO funciona (${e instanceof Error ? e.message : e})`)
    }
  }

  console.log('\n===== HALLAZGOS (pasar a AGENTS.md §8.1) =====')
  hallazgos.forEach((h) => console.log('-', h))
}

main().catch((e) => {
  if (e instanceof OpenPaymentsClientError) {
    console.error('\nOpenPaymentsClientError:', { message: e.message, status: e.status, code: e.code, description: e.description, details: e.details })
  } else {
    console.error(e)
  }
  process.exit(1)
})
