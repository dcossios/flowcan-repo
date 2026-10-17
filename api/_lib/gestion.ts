// Gestión de vehículos de la empresa: validación de datos, formato de respuesta y turnos.
import { db, ok, type Turno, type Vehiculo } from './db.js'
import { ErrorApi } from './errores.js'
import { aMinimas, aPesos } from './op.js'

export const TARIFA_MAX = 50_000 // pesos

export function vehiculoGestion(v: Vehiculo, turno: Turno | null) {
  return {
    id: v.id,
    nombre: v.nombre,
    ruta: v.ruta,
    tipo: v.tipo,
    tarifa: aPesos(v.tarifa, v.asset_scale),
    moneda: v.asset_code,
    activo: v.activo,
    turnoDesde: turno?.inicio ?? null
  }
}

export const texto = (v: unknown, campo: string, max = 80): string => {
  if (typeof v !== 'string' || !v.trim()) throw new ErrorApi('DATOS_INVALIDOS', `Falta ${campo}.`)
  const t = v.trim()
  if (t.length > max) throw new ErrorApi('DATOS_INVALIDOS', `${campo} es demasiado largo.`)
  return t
}

export function tarifaMinimas(v: unknown, scale: number): number {
  const pesos = Number(v)
  if (!Number.isFinite(pesos) || pesos <= 0 || pesos > TARIFA_MAX) throw new ErrorApi('DATOS_INVALIDOS', 'La tarifa no es válida.')
  return Number(aMinimas(pesos, scale))
}

export async function turnosAbiertos(): Promise<Map<string, Turno>> {
  const t = ok(await db().from('turnos').select('*').is('fin', null), 'turnos abiertos') as Turno[]
  return new Map(t.map((x) => [x.vehiculo_id, x]))
}

export async function cerrarTurno(vehiculoId: string): Promise<void> {
  ok(await db().from('turnos').update({ fin: new Date().toISOString() }).eq('vehiculo_id', vehiculoId).is('fin', null), 'cerrar turno')
}

/** Abre un turno sin nombre: el vehículo no tiene conductor y cada viaje queda atado a su turno (viajes.turno_id). */
export async function abrirTurno(vehiculoId: string): Promise<Turno> {
  return ok(await db().from('turnos').insert({ vehiculo_id: vehiculoId }).select('*').single(), 'abrir turno') as Turno
}
