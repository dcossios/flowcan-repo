// GET /api/wallet?direccion=turista1  → { direccion, nombre, moneda, escala, topes, topeSugerido }
// Antes de activar el pase: confirma de quién es la billetera y en qué moneda paga, y sugiere topes diarios
// en esa moneda. Acepta "turista1", "$ilp.interledger-test.dev/turista1" o la URL completa.
import { ErrorApi } from './_lib/errores.js'
import { manejador } from './_lib/http.js'
import { direccionWallet, obtenerWallet, topesPara } from './_lib/op.js'

export default manejador({
  GET: async (req) => {
    const entrada = typeof req.query.direccion === 'string' ? req.query.direccion : ''
    if (!entrada.trim()) throw new ErrorApi('DATOS_INVALIDOS', 'Escriba el nombre de su billetera.')
    const w = await obtenerWallet(direccionWallet(entrada))
    const topes = topesPara(w.assetCode)
    return {
      direccion: w.id,
      nombre: w.publicName ?? '',
      moneda: w.assetCode,
      escala: w.assetScale,
      topes,
      topeSugerido: topes[1]
    }
  }
})
