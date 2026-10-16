// Sesión del pase: token propio (nunca el de Open Payments) en localStorage del front,
// enviado como Authorization: Bearer. En la base de datos solo se guarda su sha256.
import type { VercelRequest } from '@vercel/node'
import { createHash, randomBytes } from 'node:crypto'
import { db, ok, type Pase } from './db.js'
import { ErrorApi } from './errores.js'

export const hashPaseToken = (token: string) => createHash('sha256').update(token).digest('hex')

/** 32 bytes aleatorios en base64url. El token va al front; a la base solo va el hash. */
export function generarPaseToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashPaseToken(token) }
}

export function leerBearer(req: VercelRequest): string | null {
  const h = req.headers.authorization
  if (!h || !h.startsWith('Bearer ')) return null
  const token = h.slice(7).trim()
  return token.length >= 20 ? token : null
}

/** Pase del Bearer, o null si no hay Bearer (para rutas con auth opcional). */
export async function paseOpcional(req: VercelRequest): Promise<Pase | null> {
  const token = leerBearer(req)
  if (!token) return null
  const pase = ok(
    await db().from('pases').select('*').eq('pase_token_hash', hashPaseToken(token)).maybeSingle(),
    'pase por token'
  ) as Pase | null
  return pase
}

/** Pase activo del Bearer. Lanza PASE_INVALIDO o PASE_VENCIDO. */
export async function paseRequerido(req: VercelRequest): Promise<Pase> {
  const pase = await paseOpcional(req)
  if (!pase) throw new ErrorApi('PASE_INVALIDO')
  if (pase.estado === 'vencido' || pase.estado === 'revocado') throw new ErrorApi('PASE_VENCIDO')
  if (pase.estado !== 'activo' || !pase.access_token || !pase.manage_url) throw new ErrorApi('PASE_INVALIDO')
  return pase
}
