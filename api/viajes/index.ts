// POST /api/viajes  (Bearer) { vehiculoId } → recibo { viajeId, monto, cashback, vehiculo, fecha, estado, disponibleHoy }
import { paseRequerido } from '../_lib/auth.js'
import { ErrorApi } from '../_lib/errores.js'
import { body, manejador } from '../_lib/http.js'
import { cobrarViaje } from '../_lib/viajes.js'

export default manejador({
  POST: async (req) => {
    const pase = await paseRequerido(req)
    const vehiculoId = body(req).vehiculoId
    if (typeof vehiculoId !== 'string' || !vehiculoId) throw new ErrorApi('DATOS_INVALIDOS', 'Falta el vehículo.')
    return cobrarViaje(pase, vehiculoId)
  }
})
