// POST /api/pases  { walletAddress, topeDiario, volver } → { paseId, redirectUrl }
// Pide el grant interactivo (outgoing-payment con tope diario) y guarda lo necesario para verificar el hash.
import { randomUUID } from 'node:crypto'
import { db, ok } from '../_lib/db.js'
import { ErrorApi } from '../_lib/errores.js'
import { appUrl, body, manejador } from '../_lib/http.js'
import { aMinimas, obtenerWallet, solicitarPase } from '../_lib/op.js'

const TOPE_MAX = 100_000 // pesos

export default manejador({
  POST: async (req) => {
    const b = body(req)
    const walletAddress = typeof b.walletAddress === 'string' ? b.walletAddress.trim() : ''
    const topeDiario = Number(b.topeDiario)
    // Solo rutas internas (evita redirecciones abiertas).
    const volver = typeof b.volver === 'string' && /^\/(?!\/)/.test(b.volver) ? b.volver : null
    if (!walletAddress) throw new ErrorApi('DATOS_INVALIDOS', 'Escriba la dirección de su wallet.')
    if (!Number.isFinite(topeDiario) || topeDiario <= 0 || topeDiario > TOPE_MAX) {
      throw new ErrorApi('DATOS_INVALIDOS', 'El tope diario no es válido.')
    }

    const wallet = await obtenerWallet(walletAddress)
    const paseId = randomUUID()
    const finishUri = `${appUrl(req)}/pase/listo?paseId=${paseId}${volver ? `&volver=${encodeURIComponent(volver)}` : ''}`
    const { clientNonce, pendiente } = await solicitarPase({
      walletAddress: wallet.id,
      topeMinimas: aMinimas(topeDiario, wallet.assetScale),
      finishUri
    })

    ok(
      await db().from('pases').insert({
        id: paseId,
        wallet_address: wallet.id,
        auth_server: wallet.authServer,
        resource_server: wallet.resourceServer,
        asset_code: wallet.assetCode,
        asset_scale: wallet.assetScale,
        tope_diario: Number(aMinimas(topeDiario, wallet.assetScale)),
        estado: 'pendiente',
        client_nonce: clientNonce,
        interact_finish: pendiente.interact.finish,
        continue_uri: pendiente.continue.uri,
        continue_token: pendiente.continue.access_token.value,
        volver
      }),
      'crear pase'
    )
    return { paseId, redirectUrl: pendiente.interact.redirect }
  }
})
