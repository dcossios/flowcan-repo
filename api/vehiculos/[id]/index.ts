// GET /api/vehiculos/:id  (Bearer opcional) → { id, nombre, ruta, tarifa, moneda, paseActivo, disponibleHoy, topeDiario, monedaPase }
// tarifa va en `moneda` (la del bus, COP); topeDiario y disponibleHoy en `monedaPase` (la del pasajero).
import { paseOpcional } from '../../_lib/auth.js'
import { ErrorApi } from '../../_lib/errores.js'
import { manejador, param } from '../../_lib/http.js'
import { aPesos } from '../../_lib/op.js'
import { disponibleHoy, vehiculoPorId } from '../../_lib/viajes.js'

export default manejador({
  GET: async (req) => {
    const v = await vehiculoPorId(param(req, 'id'))
    const base = {
      id: v.id,
      nombre: v.nombre,
      ruta: v.ruta,
      tarifa: aPesos(v.tarifa, v.asset_scale),
      moneda: v.asset_code,
      paseActivo: false,
      disponibleHoy: null as number | null,
      topeDiario: null as number | null,
      monedaPase: null as string | null
    }
    const pase = await paseOpcional(req)
    if (!pase || pase.estado !== 'activo') return base
    try {
      return {
        ...base,
        paseActivo: true,
        topeDiario: aPesos(pase.tope_diario, pase.asset_scale),
        disponibleHoy: await disponibleHoy(pase),
        monedaPase: pase.asset_code
      }
    } catch (e) {
      // Un pase vencido no impide ver el vehículo: el front ofrece activarlo de nuevo.
      if (e instanceof ErrorApi && e.code === 'PASE_VENCIDO') return base
      throw e
    }
  }
})
