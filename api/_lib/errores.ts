// Errores de la API: siempre { error: { code, message } } (AGENTS.md §7).
import type { VercelResponse } from '@vercel/node'
import { OpenPaymentsClientError } from '@interledger/open-payments'

export type CodigoError =
  | 'SALDO_INSUFICIENTE'
  | 'TOPE_ALCANZADO'
  | 'PAGO_DUPLICADO'
  | 'PASE_INVALIDO'
  | 'PASE_VENCIDO'
  | 'NO_ENCONTRADO'
  | 'DATOS_INVALIDOS'
  | 'OP_ERROR'

const STATUS: Record<CodigoError, number> = {
  SALDO_INSUFICIENTE: 402,
  TOPE_ALCANZADO: 402,
  PAGO_DUPLICADO: 409,
  PASE_INVALIDO: 401,
  PASE_VENCIDO: 401,
  NO_ENCONTRADO: 404,
  DATOS_INVALIDOS: 400,
  OP_ERROR: 502
}

const MENSAJES: Record<CodigoError, string> = {
  SALDO_INSUFICIENTE: 'Su wallet no tiene saldo suficiente para este pasaje.',
  TOPE_ALCANZADO: 'Ya alcanzó el tope diario de su pase.',
  PAGO_DUPLICADO: 'Este pasaje ya se pagó hace un momento.',
  PASE_INVALIDO: 'El pase no es válido. Actívelo de nuevo.',
  PASE_VENCIDO: 'Su pase venció. Actívelo de nuevo.',
  NO_ENCONTRADO: 'No encontramos lo que busca.',
  DATOS_INVALIDOS: 'Faltan datos o no son válidos.',
  OP_ERROR: 'No pudimos completar el pago con Open Payments. Intente de nuevo.'
}

export class ErrorApi extends Error {
  constructor(
    public code: CodigoError,
    message = MENSAJES[code],
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ErrorApi'
  }
}

/**
 * Traduce un error del SDK a nuestros códigos. Verificado en el código de Rafiki (backend de la Test Wallet):
 * - 401 = token inválido o vencido (auth/middleware.ts) → PASE_VENCIDO
 * - 403 al crear el outgoing payment = OutgoingPaymentError.InsufficientGrant (el grant no alcanza) → TOPE_ALCANZADO
 * El saldo insuficiente NO falla al crear: el pago queda `failed` después (ver op.ts → esperarConfirmacion).
 */
export function desdeOpenPayments(e: OpenPaymentsClientError, operacion: string): ErrorApi {
  const detalle = { operacion, status: e.status, description: e.description }
  if (e.status === 401) return new ErrorApi('PASE_VENCIDO', undefined, detalle)
  if (e.status === 403 && operacion === 'outgoingPayment.create') return new ErrorApi('TOPE_ALCANZADO', undefined, detalle)
  return new ErrorApi('OP_ERROR', undefined, detalle)
}

export function responderError(res: VercelResponse, e: unknown): void {
  const err =
    e instanceof ErrorApi
      ? e
      : e instanceof OpenPaymentsClientError
        ? desdeOpenPayments(e, 'desconocida')
        : new ErrorApi('OP_ERROR', 'Error interno.')
  if (!(e instanceof ErrorApi) || err.code === 'OP_ERROR') {
    // Nunca loguear tokens: solo el código y la descripción.
    console.error('[api]', err.code, err.details ?? (e instanceof Error ? e.message : e))
  }
  // PAGO_DUPLICADO devuelve el recibo existente en error.recibo (lo espera src/lib/api.ts).
  const extra = err.code === 'PAGO_DUPLICADO' && err.details?.recibo ? { recibo: err.details.recibo } : {}
  res.status(STATUS[err.code]).json({ error: { code: err.code, message: err.message, ...extra } })
}
