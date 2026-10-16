/**
 * Servidor local de la API: ejecuta las mismas Vercel Functions de api/ en http://localhost:3001
 * (el proxy de vite.config.ts manda /api ahí). Para probar sin la CLI de Vercel.
 * Uso desde la raíz: npm run dev:api   (lee .env.local)
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

const API_DIR = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'api')
const PUERTO = Number(process.env.API_PORT ?? 3001)

interface Ruta { patron: RegExp; params: string[]; archivo: string; estatica: boolean }

function rutas(dir: string): Ruta[] {
  const out: Ruta[] = []
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    if (n.startsWith('_') || n === 'tsconfig.json') continue
    if (statSync(p).isDirectory()) out.push(...rutas(p))
    else if (n.endsWith('.ts')) {
      const segs = relative(API_DIR, p).replace(/\.ts$/, '').split(sep).filter((s) => s !== 'index')
      const params: string[] = []
      const re = segs.map((s) => (/^\[(.+)\]$/.test(s) ? (params.push(s.slice(1, -1)), '([^/]+)') : s)).join('/')
      out.push({ patron: new RegExp(`^/api/${re}/?$`), params, archivo: p, estatica: params.length === 0 })
    }
  }
  return out.sort((a, b) => Number(b.estatica) - Number(a.estatica)) // las rutas fijas (me.ts) antes que [paseId]
}

const tabla = rutas(API_DIR)

async function leerBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const c of req) chunks.push(c as Buffer)
  const raw = Buffer.concat(chunks).toString()
  if (!raw) return undefined
  try { return JSON.parse(raw) } catch { return raw }
}

createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PUERTO}`)
  const ruta = tabla.find((r) => r.patron.test(url.pathname))
  if (!ruta) return void res.writeHead(404, { 'content-type': 'application/json' }).end('{"error":{"code":"NO_ENCONTRADO","message":"Ruta no existe"}}')
  const m = url.pathname.match(ruta.patron)!
  const query: Record<string, string> = Object.fromEntries(url.searchParams)
  ruta.params.forEach((p, i) => (query[p] = decodeURIComponent(m[i + 1])))
  const vreq = Object.assign(req, { query, body: await leerBody(req), cookies: {} })
  const vres = Object.assign(res, {
    status(code: number) { res.statusCode = code; return vres },
    json(data: unknown) { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(data)); return vres },
    send(data: unknown) { res.end(data as string); return vres }
  })
  const mod = await import(pathToFileURL(ruta.archivo).href)
  await mod.default(vreq, vres)
  console.log(`${req.method} ${url.pathname} → ${res.statusCode}`)
}).listen(PUERTO, () => {
  console.log(`API local en http://localhost:${PUERTO}`)
  tabla.forEach((r) => console.log('  ', r.patron.source))
})
