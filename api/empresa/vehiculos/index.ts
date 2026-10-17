// GET  /api/empresa/vehiculos  (X-Empresa-Pin) → todos los vehículos, también los inactivos
// POST /api/empresa/vehiculos  (X-Empresa-Pin) { id, nombre, ruta, tipo, tarifa } → vehículo creado
// Todos los vehículos cobran en la wallet de la flota (AGENTS.md §2) y quedan con un turno abierto, sin nombre:
// el vehículo no tiene conductor (un bus tiene varios) y cada viaje queda atado a su turno.
import { db, ok, type Vehiculo } from '../../_lib/db.js'
import { exigirPinEmpresa, walletFlota } from '../../_lib/empresa.js'
import { ErrorApi } from '../../_lib/errores.js'
import { abrirTurno, tarifaMinimas, texto, turnosAbiertos, vehiculoGestion } from '../../_lib/gestion.js'
import { body, manejador } from '../../_lib/http.js'
import { obtenerWallet } from '../../_lib/op.js'

export default manejador({
  GET: async (req) => {
    exigirPinEmpresa(req)
    const [vs, turnos] = await Promise.all([db().from('vehiculos').select('*').order('creado_en'), turnosAbiertos()])
    return (ok(vs, 'vehiculos') as Vehiculo[]).map((v) => vehiculoGestion(v, turnos.get(v.id) ?? null))
  },
  POST: async (req, res) => {
    exigirPinEmpresa(req)
    const b = body(req)
    const id = texto(b.id, 'el código del vehículo', 30).toLowerCase()
    if (!/^[a-z0-9][a-z0-9-]{1,29}$/.test(id)) {
      throw new ErrorApi('DATOS_INVALIDOS', 'El código solo puede tener letras, números y guiones (ej. bus-03).')
    }
    const tipo = b.tipo === 'taxi' ? 'taxi' : b.tipo === 'bus' ? 'bus' : null
    if (!tipo) throw new ErrorApi('DATOS_INVALIDOS', 'El tipo debe ser bus o taxi.')

    const flota = await obtenerWallet(walletFlota())
    const tarifa = tarifaMinimas(b.tarifa, flota.assetScale)
    const r = await db()
      .from('vehiculos')
      .insert({
        id,
        nombre: texto(b.nombre, 'el nombre'),
        ruta: texto(b.ruta, 'la ruta'),
        tipo,
        wallet_address: flota.id,
        tarifa,
        asset_code: flota.assetCode,
        asset_scale: flota.assetScale,
        tarifa_cop: Math.round(Number(b.tarifa)),
        activo: true
      })
      .select('*')
      .single()
    if (r.error?.code === '23505') throw new ErrorApi('DATOS_INVALIDOS', `Ya existe un vehículo con el código ${id}.`)
    const v = ok(r, 'crear vehiculo') as Vehiculo
    const turno = await abrirTurno(v.id)
    res.status(201)
    return vehiculoGestion(v, turno)
  }
})
