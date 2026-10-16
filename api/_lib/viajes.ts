// Lógica compartida entre endpoints: vehículos, "disponible hoy", recibos y cobro de un viaje.
import { randomUUID } from 'node:crypto'
import { db, ok, type Pase, type Turno, type Vehiculo, type Viaje } from './db.js'
import { ErrorApi } from './errores.js'
import { aPesos, asegurarToken, crearPago, esperarConfirmacion, gastadoHoy } from './op.js'

const VENTANA_DUPLICADO_MS = 2 * 60_000
const CASHBACK = 0.02 // simulado: se calcula y se muestra, no se paga
export const VIGENCIA_PASE_DIAS = 30

export async function vehiculoPorId(id: string): Promise<Vehiculo> {
  const v = ok(await db().from('vehiculos').select('*').eq('id', id).maybeSingle(), 'vehiculo') as Vehiculo | null
  if (!v || !v.activo) throw new ErrorApi('NO_ENCONTRADO', 'Ese vehículo no existe o no está activo.')
  return v
}

export async function turnoAbierto(vehiculoId: string): Promise<Turno | null> {
  return ok(
    await db().from('turnos').select('*').eq('vehiculo_id', vehiculoId).is('fin', null).maybeSingle(),
    'turno abierto'
  ) as Turno | null
}

export const venceEn = (p: Pase) =>
  new Date(Date.parse(p.activado_en ?? p.creado_en) + VIGENCIA_PASE_DIAS * 86_400_000).toISOString()

/** Inicio del día de hoy en Colombia (05:00 UTC), igual que el interval del pase. */
function inicioDiaColombia(): string {
  const hoy = new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10)
  return `${hoy}T05:00:00Z`
}

/**
 * Disponible hoy en pesos. Fuente: Open Payments (getGrantSpentAmounts).
 * Si la wallet no responde, se calcula con los viajes pagados de hoy en nuestra base.
 */
export async function disponibleHoy(pase: Pase): Promise<number> {
  let gastado: number
  try {
    gastado = await gastadoHoy(pase, await asegurarToken(pase))
  } catch (e) {
    if (e instanceof ErrorApi && e.code === 'PASE_VENCIDO') throw e
    const filas = ok(
      await db().from('viajes').select('monto').eq('pase_id', pase.id).eq('estado', 'pagado').gte('creado_en', inicioDiaColombia()),
      'gastado hoy (respaldo)'
    ) as { monto: number }[]
    gastado = filas.reduce((s, f) => s + Number(f.monto), 0)
  }
  return aPesos(Math.max(0, pase.tope_diario - gastado), pase.asset_scale)
}

export function recibo(v: Viaje, veh: Pick<Vehiculo, 'id' | 'nombre' | 'ruta'>, disponible: number, duplicado = false) {
  return {
    viajeId: v.id,
    monto: aPesos(v.monto, v.asset_scale),
    cashback: aPesos(v.cashback, v.asset_scale),
    vehiculo: { id: veh.id, nombre: veh.nombre, ruta: veh.ruta },
    fecha: v.creado_en,
    estado: v.estado,
    disponibleHoy: disponible,
    ...(duplicado ? { duplicado: true } : {})
  }
}

async function actualizarViaje(id: string, cambios: Partial<Viaje>): Promise<Viaje> {
  return ok(await db().from('viajes').update(cambios).eq('id', id).select('*').single(), 'actualizar viaje') as Viaje
}

/**
 * Cobra un pasaje (AGENTS.md §8): idempotencia 2 min → token vigente → incoming/quote/outgoing
 * → confirmación → recibo. El viaje se guarda como `pendiente` antes de mover dinero.
 */
export async function cobrarViaje(pase: Pase, vehiculoId: string) {
  const vehiculo = await vehiculoPorId(vehiculoId)

  const reciente = ok(
    await db()
      .from('viajes')
      .select('*')
      .eq('pase_id', pase.id)
      .eq('vehiculo_id', vehiculo.id)
      .in('estado', ['pendiente', 'pagado'])
      .gte('creado_en', new Date(Date.now() - VENTANA_DUPLICADO_MS).toISOString())
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle(),
    'viaje reciente'
  ) as Viaje | null
  if (reciente) {
    throw new ErrorApi('PAGO_DUPLICADO', undefined, { recibo: recibo(reciente, vehiculo, await disponibleHoy(pase), true) })
  }

  if (vehiculo.asset_code !== pase.asset_code) {
    // TODO verificar: entre monedas distintas la quote convierte, pero el tope y el monto del recibo quedarían en monedas diferentes.
    throw new ErrorApi('DATOS_INVALIDOS', 'Por ahora el pase y el vehículo deben estar en la misma moneda.')
  }

  const accessToken = await asegurarToken(pase)
  const turno = await turnoAbierto(vehiculo.id)
  const viajeId = randomUUID()
  let viaje = ok(
    await db()
      .from('viajes')
      .insert({
        id: viajeId,
        pase_id: pase.id,
        vehiculo_id: vehiculo.id,
        turno_id: turno?.id ?? null,
        monto: vehiculo.tarifa,
        asset_code: vehiculo.asset_code,
        asset_scale: vehiculo.asset_scale,
        cashback: Math.round(vehiculo.tarifa * CASHBACK),
        estado: 'pendiente'
      })
      .select('*')
      .single(),
    'crear viaje'
  ) as Viaje

  try {
    const pago = await crearPago({ pase, accessToken, vehiculo, viajeId, turnoId: turno?.id ?? null })
    viaje = await actualizarViaje(viajeId, {
      incoming_payment_id: pago.incomingPaymentId,
      quote_id: pago.quoteId,
      outgoing_payment_id: pago.outgoingPaymentId
    })
    const r = await esperarConfirmacion(pago.outgoingPaymentId, accessToken)
    if (r.estado !== 'pendiente') {
      viaje = await actualizarViaje(viajeId, { estado: r.estado, error_code: r.errorCode ?? null })
    }
    if (r.estado === 'fallido') throw new ErrorApi(r.errorCode ?? 'OP_ERROR')
  } catch (e) {
    if (viaje.estado === 'pendiente' && !viaje.outgoing_payment_id) {
      await actualizarViaje(viajeId, { estado: 'fallido', error_code: e instanceof ErrorApi ? e.code : 'OP_ERROR' })
    }
    throw e
  }

  return recibo(viaje, vehiculo, await disponibleHoy(pase))
}

/** Si un viaje quedó `pendiente` (la wallet tardó más de 15 s), vuelve a consultar el pago. */
export async function reconciliar(viaje: Viaje, pase: Pase): Promise<Viaje> {
  if (viaje.estado !== 'pendiente' || !viaje.outgoing_payment_id) return viaje
  const r = await esperarConfirmacion(viaje.outgoing_payment_id, await asegurarToken(pase), 0)
  if (r.estado === 'pendiente') return viaje
  return actualizarViaje(viaje.id, { estado: r.estado, error_code: r.errorCode ?? null })
}
