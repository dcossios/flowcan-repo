// POST /api/pases/:paseId/confirmar  { interactRef, hash } → { paseToken, pase }
// Verifica el hash de GNAP ANTES de continuar el grant. Devuelve un token propio (nunca el de Open Payments).
import { generarPaseToken } from '../../_lib/auth.js'
import { db, ok, type Pase } from '../../_lib/db.js'
import { ErrorApi } from '../../_lib/errores.js'
import { body, manejador, param } from '../../_lib/http.js'
import { aPesos, continuarPase, verificarHash } from '../../_lib/op.js'
import { venceEn } from '../../_lib/viajes.js'

export default manejador({
  POST: async (req) => {
    const paseId = param(req, 'paseId')
    const b = body(req)
    const interactRef = typeof b.interactRef === 'string' ? b.interactRef : ''
    const hash = typeof b.hash === 'string' ? b.hash : ''
    if (!interactRef || !hash) throw new ErrorApi('PASE_INVALIDO', 'Faltan los datos de la wallet. Active el pase de nuevo.')

    const pase = ok(await db().from('pases').select('*').eq('id', paseId).maybeSingle(), 'pase') as Pase | null
    if (!pase || pase.estado !== 'pendiente' || !pase.interact_finish || !pase.continue_uri || !pase.continue_token) {
      throw new ErrorApi('PASE_INVALIDO', 'Este enlace de activación ya se usó o no es válido.')
    }
    const hashOk = verificarHash({
      clientNonce: pase.client_nonce,
      interactFinish: pase.interact_finish,
      interactRef,
      authServer: pase.auth_server,
      hash
    })
    if (!hashOk) throw new ErrorApi('PASE_INVALIDO', 'No pudimos verificar la autorización de su wallet.')

    const t = await continuarPase({ continueUri: pase.continue_uri, continueToken: pase.continue_token, interactRef })
    const { token, hash: tokenHash } = generarPaseToken()
    const ahora = new Date().toISOString()
    // Solo activa si sigue pendiente: evita activar dos veces con el mismo enlace.
    const activado = ok(
      await db()
        .from('pases')
        .update({
          estado: 'activo',
          access_token: t.accessToken,
          manage_url: t.manageUrl,
          token_expira_en: t.expiraEn,
          pase_token_hash: tokenHash,
          activado_en: ahora,
          continue_token: null
        })
        .eq('id', pase.id)
        .eq('estado', 'pendiente')
        .select('*')
        .maybeSingle(),
      'activar pase'
    ) as Pase | null
    if (!activado) throw new ErrorApi('PASE_INVALIDO', 'Este enlace de activación ya se usó.')

    const tope = aPesos(activado.tope_diario, activado.asset_scale)
    return {
      paseToken: token,
      pase: { id: activado.id, walletAddress: activado.wallet_address, topeDiario: tope, disponibleHoy: tope, venceEn: venceEn(activado) }
    }
  }
})
