// GET  /api/viajes  (Bearer) → mis viajes: [{ viajeId, monto, moneda, montoPagado, monedaPagada, cashback, estado, fecha, vehiculo }]
//      monto/moneda = lo que recibió el bus (COP); montoPagado/monedaPagada = lo que pagó el pasajero en su moneda
// POST /api/viajes  (Bearer) { vehiculoId } → recibo { viajeId, monto, cashback, vehiculo, fecha, estado, disponibleHoy }
import { paseRequerido } from '../_lib/auth.js'
import { db, ok, type Vehiculo, type Viaje } from '../_lib/db.js'
import { ErrorApi } from '../_lib/errores.js'
import { body, manejador } from '../_lib/http.js'
import { aPesos } from '../_lib/op.js'
import { cobrarViaje, pagado } from '../_lib/viajes.js'

type FilaViaje = Pick<
  Viaje,
  'id' | 'monto' | 'cashback' | 'asset_code' | 'asset_scale' | 'estado' | 'creado_en' | 'debito_valor' | 'debito_moneda' | 'debito_escala'
> & {
  vehiculos: Pick<Vehiculo, 'id' | 'nombre' | 'ruta'> | null
}

export default manejador({
  GET: async (req) => {
    const pase = await paseRequerido(req)
    const filas = ok(
      await db()
        .from('viajes')
        .select('id, monto, cashback, asset_code, asset_scale, estado, creado_en, debito_valor, debito_moneda, debito_escala, vehiculos(id, nombre, ruta)')
        .eq('pase_id', pase.id)
        .order('creado_en', { ascending: false })
        .limit(50),
      'mis viajes'
    ) as unknown as FilaViaje[]
    return filas.map((f) => ({
      viajeId: f.id,
      monto: aPesos(f.monto, f.asset_scale),
      moneda: f.asset_code,
      ...pagado(f),
      cashback: aPesos(f.cashback, f.asset_scale),
      estado: f.estado,
      fecha: f.creado_en,
      vehiculo: f.vehiculos ?? { id: '', nombre: 'Vehículo', ruta: '' }
    }))
  },
  POST: async (req) => {
    const pase = await paseRequerido(req)
    const vehiculoId = body(req).vehiculoId
    if (typeof vehiculoId !== 'string' || !vehiculoId) throw new ErrorApi('DATOS_INVALIDOS', 'Falta el vehículo.')
    return cobrarViaje(pase, vehiculoId)
  }
})
