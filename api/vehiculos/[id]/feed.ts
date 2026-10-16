// GET /api/vehiculos/:id/feed?desde=  → [{ viajeId, monto, estado, fecha }]
// Viajes del turno abierto (o de las últimas 12 h). `desde` filtra por última actualización,
// así un viaje que pasa de `pendiente` a `pagado` vuelve a aparecer.
import { db, ok, type Viaje } from '../../_lib/db.js'
import { manejador, param } from '../../_lib/http.js'
import { aPesos } from '../../_lib/op.js'
import { turnoAbierto, vehiculoPorId } from '../../_lib/viajes.js'

export default manejador({
  GET: async (req) => {
    const v = await vehiculoPorId(param(req, 'id'))
    const turno = await turnoAbierto(v.id)
    const desdeTurno = turno?.inicio ?? new Date(Date.now() - 12 * 3600_000).toISOString()
    let q = db()
      .from('viajes')
      .select('id, monto, asset_scale, estado, creado_en, actualizado_en')
      .eq('vehiculo_id', v.id)
      .gte('creado_en', desdeTurno)
      .order('creado_en', { ascending: false })
      .limit(100)
    const desde = typeof req.query.desde === 'string' ? req.query.desde : undefined
    if (desde && !Number.isNaN(Date.parse(desde))) q = q.gt('actualizado_en', new Date(desde).toISOString())
    const filas = ok(await q, 'feed') as (Pick<Viaje, 'id' | 'monto' | 'asset_scale' | 'estado' | 'creado_en'> & { actualizado_en: string })[]
    return filas.map((f) => ({ viajeId: f.id, monto: aPesos(f.monto, f.asset_scale), estado: f.estado, fecha: f.creado_en }))
  }
})
