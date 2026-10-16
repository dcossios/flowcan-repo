// GET /api/viajes/:id  (Bearer) → recibo. Solo el dueño del pase puede verlo.
import { paseRequerido } from '../_lib/auth.js'
import { db, ok, type Viaje } from '../_lib/db.js'
import { ErrorApi } from '../_lib/errores.js'
import { manejador, param } from '../_lib/http.js'
import { disponibleHoy, recibo, reconciliar, vehiculoPorId } from '../_lib/viajes.js'

export default manejador({
  GET: async (req) => {
    const pase = await paseRequerido(req)
    const id = param(req, 'id')
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ErrorApi('NO_ENCONTRADO', 'No encontramos ese recibo.')
    let viaje = ok(
      await db().from('viajes').select('*').eq('id', id).eq('pase_id', pase.id).maybeSingle(),
      'viaje'
    ) as Viaje | null
    if (!viaje) throw new ErrorApi('NO_ENCONTRADO', 'No encontramos ese recibo.')
    viaje = await reconciliar(viaje, pase)
    const v = await vehiculoPorId(viaje.vehiculo_id)
    return recibo(viaje, v, await disponibleHoy(pase))
  }
})
