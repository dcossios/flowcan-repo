// GET /api/flota?fecha=YYYY-MM-DD  (X-Empresa-Pin) → resumen del día para el panel de la empresa.
// Formato acordado en ESTADO.md §2.1. Montos en pesos. recaudo y pasajes cuentan solo `pagado`.
import { db, ok, type Turno, type Vehiculo, type Viaje } from './_lib/db.js'
import { exigirPinEmpresa, rangoDiaColombia } from './_lib/empresa.js'
import { manejador } from './_lib/http.js'
import { aPesos } from './_lib/op.js'

type FilaViaje = Pick<Viaje, 'id' | 'vehiculo_id' | 'monto' | 'asset_scale' | 'estado' | 'creado_en'>

export default manejador({
  GET: async (req) => {
    exigirPinEmpresa(req)
    const { fecha, desde, hasta } = rangoDiaColombia(typeof req.query.fecha === 'string' ? req.query.fecha : undefined)

    const [vehiculos, viajes, turnos] = await Promise.all([
      db().from('vehiculos').select('*').order('id'),
      db()
        .from('viajes')
        .select('id, vehiculo_id, monto, asset_scale, estado, creado_en')
        .gte('creado_en', desde)
        .lt('creado_en', hasta)
        .order('creado_en', { ascending: false }),
      db().from('turnos').select('*').is('fin', null)
    ])
    const vs = ok(vehiculos, 'vehiculos') as Vehiculo[]
    const vj = ok(viajes, 'viajes del día') as FilaViaje[]
    const conductorTurno = new Map((ok(turnos, 'turnos') as Turno[]).map((t) => [t.vehiculo_id, t.conductor]))

    const pesos = (v: FilaViaje) => aPesos(v.monto, v.asset_scale)
    const pagados = vj.filter((v) => v.estado === 'pagado')

    // Vehículos activos, más los inactivos que tuvieron viajes ese día (para que cuadren los totales).
    const conViajes = new Set(vj.map((v) => v.vehiculo_id))
    const visibles = vs.filter((v) => v.activo || conViajes.has(v.id))

    const porVehiculo = visibles
      .map((v) => {
        const propios = pagados.filter((p) => p.vehiculo_id === v.id)
        return {
          id: v.id,
          nombre: v.nombre,
          ruta: v.ruta,
          tipo: v.tipo,
          conductor: conductorTurno.get(v.id) ?? v.conductor ?? null,
          tarifa: aPesos(v.tarifa, v.asset_scale),
          recaudo: propios.reduce((s, p) => s + pesos(p), 0),
          pasajes: propios.length,
          fallidos: vj.filter((p) => p.vehiculo_id === v.id && p.estado === 'fallido').length,
          ultimoPagoEn: propios[0]?.creado_en ?? null
        }
      })
      .sort((a, b) => b.recaudo - a.recaudo)

    const rutas = new Map<string, { ruta: string; recaudo: number; pasajes: number; vehiculos: number }>()
    for (const v of porVehiculo) {
      const r = rutas.get(v.ruta) ?? { ruta: v.ruta, recaudo: 0, pasajes: 0, vehiculos: 0 }
      r.recaudo += v.recaudo
      r.pasajes += v.pasajes
      r.vehiculos += 1
      rutas.set(v.ruta, r)
    }

    return {
      fecha,
      actualizadoEn: new Date().toISOString(),
      totales: {
        recaudo: pagados.reduce((s, p) => s + pesos(p), 0),
        pasajes: pagados.length,
        pendientes: vj.filter((v) => v.estado === 'pendiente').length,
        fallidos: vj.filter((v) => v.estado === 'fallido').length,
        vehiculosConPagos: porVehiculo.filter((v) => v.pasajes > 0).length,
        vehiculos: porVehiculo.length
      },
      porRuta: [...rutas.values()].sort((a, b) => b.recaudo - a.recaudo),
      porVehiculo,
      ultimosPagos: vj.slice(0, 20).map((v) => ({
        viajeId: v.id,
        vehiculoId: v.vehiculo_id,
        monto: pesos(v),
        estado: v.estado,
        fecha: v.creado_en
      }))
    }
  }
})
