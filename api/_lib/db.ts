// Cliente de Supabase con la service role key. Solo se usa en el backend (api/).
// Las tablas tienen RLS activo y sin políticas: nadie más puede leerlas.
// Esquema: "Database Infrastructure/supabase-setup.sql" (migración 0001).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface Vehiculo {
  id: string
  nombre: string
  ruta: string
  conductor: string
  tipo: 'bus' | 'taxi'
  wallet_address: string
  tarifa: number // unidades mínimas (COP con assetScale 2 → 3.200 COP = 320000)
  asset_code: string
  asset_scale: number
  tarifa_cop: number
  activo: boolean
}

export interface Turno {
  id: string
  vehiculo_id: string
  conductor: string
  inicio: string
  fin: string | null
}

export interface Pase {
  id: string
  wallet_address: string
  auth_server: string
  resource_server: string
  asset_code: string
  asset_scale: number
  tope_diario: number // unidades mínimas
  estado: 'pendiente' | 'activo' | 'vencido' | 'revocado'
  client_nonce: string
  interact_finish: string | null
  continue_uri: string | null
  continue_token: string | null
  access_token: string | null
  manage_url: string | null
  token_expira_en: string | null
  pase_token_hash: string | null
  volver: string | null
  activado_en: string | null
  creado_en: string
}

export interface Viaje {
  id: string
  pase_id: string
  vehiculo_id: string
  turno_id: string | null
  monto: number // unidades mínimas
  asset_code: string
  asset_scale: number
  cashback: number
  estado: 'pendiente' | 'pagado' | 'fallido'
  error_code: string | null
  incoming_payment_id: string | null
  quote_id: string | null
  outgoing_payment_id: string | null
  /** Lo que pagó el pasajero en SU moneda (migración 0002). null en viajes viejos = misma moneda que `monto`. */
  debito_valor: number | null
  debito_moneda: string | null
  debito_escala: number | null
  creado_en: string
}

let cliente: SupabaseClient | undefined

export function db(): SupabaseClient {
  if (!cliente) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
    cliente = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  }
  return cliente
}

/** Lanza si la consulta falló; devuelve los datos. */
export function ok<T>(r: { data: T | null; error: { message: string } | null }, que: string): T {
  if (r.error) throw new Error(`Supabase (${que}): ${r.error.message}`)
  return r.data as T
}
