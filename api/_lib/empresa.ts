// Acceso de la empresa (panel /flota y gestión de vehículos): PIN en el header X-Empresa-Pin.
// El PIN vive en la variable EMPRESA_PIN (Vercel / .env.local), nunca en el repo.
import type { VercelRequest } from '@vercel/node'
import { createHash, timingSafeEqual } from 'node:crypto'
import { ErrorApi } from './errores.js'

const sha = (s: string) => createHash('sha256').update(s).digest()

export function exigirPinEmpresa(req: VercelRequest): void {
  const esperado = process.env.EMPRESA_PIN
  if (!esperado) throw new ErrorApi('NO_AUTORIZADO', 'Falta configurar EMPRESA_PIN en el servidor.')
  const h = req.headers['x-empresa-pin']
  const pin = Array.isArray(h) ? h[0] : h
  // Comparar hashes de igual largo evita filtrar el PIN por tiempo de respuesta.
  if (!pin || !timingSafeEqual(sha(pin), sha(esperado))) throw new ErrorApi('NO_AUTORIZADO')
}

/** Wallet que recibe los pagos de todos los vehículos (una sola address COP por cuenta en la Test Wallet). */
export const walletFlota = () => process.env.FLOTA_WALLET_ADDRESS || process.env.OP_CLIENT_WALLET_ADDRESS || ''

/** Día de Colombia (YYYY-MM-DD) → rango UTC [05:00 de ese día, 05:00 del siguiente). */
export function rangoDiaColombia(fecha?: string): { fecha: string; desde: string; hasta: string } {
  const f =
    fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha)
      ? fecha
      : new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10)
  const desde = new Date(`${f}T05:00:00Z`)
  if (Number.isNaN(desde.getTime())) throw new ErrorApi('DATOS_INVALIDOS', 'La fecha no es válida.')
  return { fecha: f, desde: desde.toISOString(), hasta: new Date(desde.getTime() + 86_400_000).toISOString() }
}
