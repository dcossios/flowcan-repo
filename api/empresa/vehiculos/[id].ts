// PATCH /api/empresa/vehiculos/:id  (X-Empresa-Pin) { nombre?, ruta?, tarifa?, activo? } → vehículo
// - Desactivar cierra el turno y el QR deja de cobrar (el historial se conserva).
// - Reactivar (sin turno abierto) abre un turno sin nombre: el vehículo no tiene conductor.
import { db, ok, type Vehiculo } from '../../_lib/db.js'
import { exigirPinEmpresa } from '../../_lib/empresa.js'
import { ErrorApi } from '../../_lib/errores.js'
import { abrirTurno, cerrarTurno, tarifaMinimas, texto, turnosAbiertos, vehiculoGestion } from '../../_lib/gestion.js'
import { body, manejador, param } from '../../_lib/http.js'

export default manejador({
  PATCH: async (req) => {
    exigirPinEmpresa(req)
    const id = param(req, 'id')
    const b = body(req)
    const actual = ok(await db().from('vehiculos').select('*').eq('id', id).maybeSingle(), 'vehiculo') as Vehiculo | null
    if (!actual) throw new ErrorApi('NO_ENCONTRADO', 'Ese vehículo no existe.')

    const cambios: Partial<Vehiculo> = {}
    if (b.nombre !== undefined) cambios.nombre = texto(b.nombre, 'el nombre')
    if (b.ruta !== undefined) cambios.ruta = texto(b.ruta, 'la ruta')
    if (b.tarifa !== undefined) {
      cambios.tarifa = tarifaMinimas(b.tarifa, actual.asset_scale)
      cambios.tarifa_cop = Math.round(Number(b.tarifa))
    }
    if (b.activo !== undefined) {
      if (typeof b.activo !== 'boolean') throw new ErrorApi('DATOS_INVALIDOS', 'activo debe ser true o false.')
      cambios.activo = b.activo
    }
    if (Object.keys(cambios).length === 0) throw new ErrorApi('DATOS_INVALIDOS', 'No hay cambios.')

    const v = ok(await db().from('vehiculos').update(cambios).eq('id', id).select('*').single(), 'editar vehiculo') as Vehiculo

    const turno = (await turnosAbiertos()).get(id) ?? null
    if (!v.activo) {
      if (turno) await cerrarTurno(id)
      return vehiculoGestion(v, null)
    }
    if (!turno) return vehiculoGestion(v, await abrirTurno(id))
    return vehiculoGestion(v, turno)
  }
})
