/**
 * ¿Se puede rotar el token del pase después de que venció?
 *
 * Activa un pase (pide aprobación en el navegador), espera a que el access token venza
 * (expires_in + 60 s), comprueba que el token vencido ya no sirve y lo intenta rotar.
 * Si la rotación funciona, prueba el token nuevo. Uso (dentro de scripts/): npm run rotacion
 */
import {
  createAuthenticatedClient,
  isFinalizedGrantWithAccessToken,
  isPendingGrant,
  OpenPaymentsClientError
} from '@interledger/open-payments'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { Buffer } from 'node:buffer'

const env = (n: string, d?: string) => {
  const v = process.env[n] ?? d
  if (!v) throw new Error(`Falta ${n}`)
  return v
}
const PUERTO = Number(env('SPIKE_PUERTO', '3999'))
const desc = (e: unknown) =>
  e instanceof OpenPaymentsClientError ? `${e.status} ${e.code ?? ''} ${e.description}` : String(e)

function esperarInteractRef(): Promise<string> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${PUERTO}`)
      if (url.pathname !== '/callback') return void res.writeHead(404).end()
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end('<h3>Pase autorizado. Vuelve a la terminal.</h3>')
      server.close()
      resolve(url.searchParams.get('interact_ref') ?? '')
    })
    server.listen(PUERTO)
  })
}

async function main() {
  const client = await createAuthenticatedClient({
    walletAddressUrl: env('OP_CLIENT_WALLET_ADDRESS'),
    keyId: env('OP_KEY_ID'),
    privateKey: process.env.OP_PRIVATE_KEY_B64
      ? Buffer.from(process.env.OP_PRIVATE_KEY_B64, 'base64')
      : env('OP_PRIVATE_KEY_PATH')
  })
  const pasajero = await client.walletAddress.get({ url: env('SPIKE_PASAJERO_WALLET') })
  const hoy = new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10)

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
              debitAmount: { value: env('SPIKE_TOPE', '1000'), assetCode: pasajero.assetCode, assetScale: pasajero.assetScale },
              interval: `R/${hoy}T05:00:00Z/P1D`
            }
          }
        ]
      },
      interact: { start: ['redirect'], finish: { method: 'redirect', uri: `http://localhost:${PUERTO}/callback`, nonce: randomUUID() } }
    }
  )
  if (!isPendingGrant(pendiente)) throw new Error('Se esperaba un grant interactivo')
  console.log(`\n[1] Abre y aprueba con la cuenta del pasajero:\n${pendiente.interact.redirect}\n`)
  const interactRef = await esperarInteractRef()

  const grant = await client.grant.continue(
    { url: pendiente.continue.uri, accessToken: pendiente.continue.access_token.value },
    { interact_ref: interactRef }
  )
  if (!isFinalizedGrantWithAccessToken(grant)) throw new Error('Grant no finalizado')
  const { value, manage, expires_in } = grant.access_token
  const esperaS = (expires_in ?? 600) + 60
  console.log(`[2] Pase activo. expires_in=${expires_in}. Esperando ${esperaS} s (hasta ${new Date(Date.now() + esperaS * 1000).toLocaleTimeString()})…`)
  await new Promise((r) => setTimeout(r, esperaS * 1000))

  const spent = (accessToken: string) =>
    client.outgoingPayment.getGrantSpentAmounts({ url: pasajero.resourceServer, accessToken })

  try {
    await spent(value)
    console.log('[3] El token vencido TODAVÍA funciona (no venció en realidad)')
  } catch (e) {
    console.log(`[3] Token vencido rechazado, como se esperaba: ${desc(e)}`)
  }

  try {
    const rotado = await client.token.rotate({ url: manage, accessToken: value })
    console.log(`[4] ROTACIÓN DE TOKEN VENCIDO: FUNCIONA (nuevo expires_in=${rotado.access_token.expires_in})`)
    await spent(rotado.access_token.value)
    console.log('[5] El token nuevo funciona: el pase sobrevive sin uso')
  } catch (e) {
    console.log(`[4] ROTACIÓN DE TOKEN VENCIDO: NO FUNCIONA → ${desc(e)}`)
  }
}

main().catch((e) => {
  console.error(desc(e))
  process.exit(1)
})
