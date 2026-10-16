// Envoltura común de las Vercel Functions: método permitido, sin caché y errores con { error: { code, message } }.
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ErrorApi, responderError } from './errores.js'

type Metodo = 'GET' | 'POST' | 'PATCH'
type Handler = (req: VercelRequest, res: VercelResponse) => Promise<unknown>

export function manejador(metodos: Partial<Record<Metodo, Handler>>) {
  return async (req: VercelRequest, res: VercelResponse) => {
    res.setHeader('Cache-Control', 'no-store')
    const h = metodos[req.method as Metodo]
    if (!h) {
      res.setHeader('Allow', Object.keys(metodos).join(', '))
      res.status(405).json({ error: { code: 'DATOS_INVALIDOS', message: 'Método no permitido.' } })
      return
    }
    try {
      const datos = await h(req, res)
      if (!res.headersSent) res.json(datos) // 200 salvo que el handler haya fijado otro (p. ej. 201)
    } catch (e) {
      responderError(res, e)
    }
  }
}

/** Parámetro de ruta ([id]) o de query como string. */
export function param(req: VercelRequest, nombre: string): string {
  const v = req.query[nombre]
  const s = Array.isArray(v) ? v[0] : v
  if (!s) throw new ErrorApi('DATOS_INVALIDOS', `Falta ${nombre}.`)
  return s
}

/** Body JSON como objeto (Vercel ya lo parsea cuando el Content-Type es application/json). */
export function body(req: VercelRequest): Record<string, unknown> {
  const b = typeof req.body === 'string' ? safeJson(req.body) : req.body
  return b && typeof b === 'object' ? (b as Record<string, unknown>) : {}
}

const safeJson = (s: string) => {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

/** URL pública de la app (para interact.finish.uri). APP_URL manda; si falta, se usa el host del request. */
export function appUrl(req: VercelRequest): string {
  const app = process.env.APP_URL?.trim().replace(/\/$/, '')
  // Acepta "flowcan-repo.vercel.app" sin esquema: la wallet necesita una URL completa para volver.
  if (app) return /^https?:\/\//.test(app) ? app : `https://${app}`
  const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https'
  return `${proto}://${req.headers.host}`
}
