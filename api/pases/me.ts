// GET /api/pases/me  (Bearer) → { activo, topeDiario, disponibleHoy, venceEn, walletAddress }
import { paseRequerido } from '../_lib/auth.js'
import { manejador } from '../_lib/http.js'
import { aPesos } from '../_lib/op.js'
import { disponibleHoy, venceEn } from '../_lib/viajes.js'

export default manejador({
  GET: async (req) => {
    const pase = await paseRequerido(req)
    return {
      activo: true,
      topeDiario: aPesos(pase.tope_diario, pase.asset_scale),
      disponibleHoy: await disponibleHoy(pase),
      venceEn: venceEn(pase),
      walletAddress: pase.wallet_address
    }
  }
})
