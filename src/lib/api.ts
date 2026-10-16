// Cliente de API del Frontend de Súbase
// Sigue estrictamente el Contrato de API de AGENTS.md (sección 7).

export type ErrorCode =
  | 'SALDO_INSUFICIENTE'
  | 'TOPE_ALCANZADO'
  | 'PAGO_DUPLICADO'
  | 'PASE_INVALIDO'
  | 'PASE_VENCIDO'
  | 'OP_ERROR'
  | 'BACKEND_OFFLINE';

export interface VehiculoInfo {
  id: string;
  nombre: string;
  ruta: string;
  tarifa: number;
  moneda: string;
  paseActivo: boolean;
  disponibleHoy?: number | null;
  topeDiario?: number | null;
}

export interface CrearPaseRequest {
  walletAddress: string;
  topeDiario: number;
  volver?: string;
}

export interface CrearPaseResponse {
  paseId: string;
  redirectUrl: string;
}

export interface ConfirmarPaseRequest {
  interactRef: string;
  hash?: string;
}

export interface ConfirmarPaseResponse {
  paseToken: string;
  pase: {
    id?: string;
    walletAddress?: string;
    topeDiario: number;
    disponibleHoy: number;
    venceEn: string;
  };
}

export interface PaseMeResponse {
  activo: boolean;
  topeDiario: number;
  disponibleHoy: number;
  venceEn: string;
  walletAddress?: string;
}

export interface ReciboViaje {
  viajeId: string;
  monto: number;
  cashback: number;
  vehiculo: {
    id: string;
    nombre: string;
    ruta: string;
  } | string;
  fecha: string;
  disponibleHoy: number;
  duplicado?: boolean;
}

export interface FeedItem {
  viajeId: string;
  monto: number;
  estado: string;
  fecha: string;
}

const TOKEN_STORAGE_KEY = 'subase_pase_token';
const PENDING_PASE_KEY = 'subase_pending_pase';
const UI_PREVIEW_KEY = 'subase_ui_preview_mode';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export class SubaseApiError extends Error {
  code: ErrorCode;
  details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'SubaseApiError';
    this.code = code;
    this.details = details;
  }
}

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  SALDO_INSUFICIENTE: 'Su billetera no tiene saldo suficiente para este pasaje.',
  TOPE_ALCANZADO: 'Llegó al tope diario de su pase. Mañana se renueva, o puede ampliarlo ahora.',
  PAGO_DUPLICADO: 'Ya pagó este bus hace menos de 2 minutos. No le cobramos dos veces.',
  PASE_INVALIDO: 'Su pase ya no es válido. Actívelo de nuevo.',
  PASE_VENCIDO: 'Su pase de 30 días venció. Active uno nuevo en segundos.',
  OP_ERROR: 'No pudimos completar el pago con su billetera. Intente de nuevo.',
  BACKEND_OFFLINE: 'El servidor de Súbase no responde. Intente de nuevo en unos segundos.',
};

export function getFriendlyErrorMessage(err: unknown): { code: ErrorCode; message: string } {
  if (err instanceof SubaseApiError) {
    return {
      code: err.code,
      message: err.message || ERROR_MESSAGES[err.code] || ERROR_MESSAGES.OP_ERROR,
    };
  }
  return {
    code: 'OP_ERROR',
    message: err instanceof Error ? err.message : ERROR_MESSAGES.OP_ERROR,
  };
}

// --- Gestión de sesión del pase en localStorage (AGENTS.md sección 2: nunca cookies) ---

export function getPaseToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem('paseToken');
  } catch {
    return null;
  }
}

export function setPaseToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem('paseToken', token);
  } catch {
    // ignore storage errors
  }
}

export function clearPaseToken(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem('paseToken');
  } catch {
    // ignore
  }
}

export function savePendingPaseContext(ctx: { paseId: string; volver?: string; topeDiario?: number }): void {
  try {
    localStorage.setItem(PENDING_PASE_KEY, JSON.stringify(ctx));
  } catch {
    // ignore
  }
}

export function getPendingPaseContext(): { paseId?: string; volver?: string; topeDiario?: number } | null {
  try {
    const raw = localStorage.getItem(PENDING_PASE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPendingPaseContext(): void {
  try {
    localStorage.removeItem(PENDING_PASE_KEY);
  } catch {
    // ignore
  }
}

// --- Modo Vista Previa UI (exclusivamente para probar maquetación cuando server/ está apagado) ---

export function isUiPreviewMode(): boolean {
  try {
    return localStorage.getItem(UI_PREVIEW_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setUiPreviewMode(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(UI_PREVIEW_KEY, 'true');
    } else {
      localStorage.removeItem(UI_PREVIEW_KEY);
    }
    window.dispatchEvent(new Event('subase-preview-change'));
  } catch {
    // ignore
  }
}

const PREVIEW_VEHICULOS: Record<string, Omit<VehiculoInfo, 'paseActivo' | 'disponibleHoy' | 'topeDiario'>> = {
  'bus-101': {
    id: 'bus-101',
    nombre: 'Cootransvi · Buseta 101',
    ruta: 'Santa Cruz · Estación Acevedo',
    tarifa: 3200,
    moneda: 'COP',
  },
  'bus-204': {
    id: 'bus-204',
    nombre: 'Rápido San Javier · 204',
    ruta: 'La Loma · Estación San Javier',
    tarifa: 3200,
    moneda: 'COP',
  },
  'taxi-88': {
    id: 'taxi-88',
    nombre: 'Coopebombas · Taxi T-88',
    ruta: 'Carrera Mínima · Valle de Aburrá',
    tarifa: 7000,
    moneda: 'COP',
  },
};

// --- Helper HTTP ---

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getPaseToken();
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new SubaseApiError('BACKEND_OFFLINE', ERROR_MESSAGES.BACKEND_OFFLINE);
  }

  let payload: unknown = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    if (response.status >= 500 && payload === null) {
      throw new SubaseApiError('BACKEND_OFFLINE', ERROR_MESSAGES.BACKEND_OFFLINE);
    }
    const errObj = (payload as { error?: { code?: ErrorCode; message?: string } })?.error;
    const code: ErrorCode = errObj?.code && errObj.code in ERROR_MESSAGES ? errObj.code : 'OP_ERROR';
    const message = errObj?.message || ERROR_MESSAGES[code] || `Error HTTP ${response.status}`;
    throw new SubaseApiError(code, message, payload);
  }

  return payload as T;
}

// --- Endpoints del Contrato (AGENTS.md sección 7) ---

export async function fetchVehiculo(vehiculoId: string): Promise<VehiculoInfo> {
  if (isUiPreviewMode()) {
    const base = PREVIEW_VEHICULOS[vehiculoId] || {
      id: vehiculoId,
      nombre: `Cootransvi · Vehículo ${vehiculoId.toUpperCase()}`,
      ruta: 'Ruta Barrial Medellín',
      tarifa: 3200,
      moneda: 'COP',
    };
    const hasToken = Boolean(getPaseToken());
    const tope = Number(localStorage.getItem('subase_preview_tope') || 20000);
    const disp = Number(localStorage.getItem('subase_preview_disp') ?? tope);
    return {
      ...base,
      paseActivo: hasToken,
      topeDiario: hasToken ? tope : null,
      disponibleHoy: hasToken ? disp : null,
    };
  }
  return apiRequest<VehiculoInfo>(`/api/vehiculos/${encodeURIComponent(vehiculoId)}`);
}

export async function crearPase(body: CrearPaseRequest): Promise<CrearPaseResponse> {
  if (isUiPreviewMode()) {
    const paseId = `pase-preview-${Date.now()}`;
    savePendingPaseContext({ paseId, volver: body.volver, topeDiario: body.topeDiario });
    localStorage.setItem('subase_preview_tope', String(body.topeDiario));
    localStorage.setItem('subase_preview_disp', String(body.topeDiario));
    localStorage.setItem('subase_preview_wallet', body.walletAddress);
    const volverParam = body.volver ? `&volver=${encodeURIComponent(body.volver)}` : '';
    return {
      paseId,
      redirectUrl: `/pase/listo?paseId=${encodeURIComponent(paseId)}&interact_ref=preview_ref_gnap&hash=preview_hash${volverParam}`,
    };
  }
  return apiRequest<CrearPaseResponse>('/api/pases', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function confirmarPase(
  paseId: string,
  body: ConfirmarPaseRequest
): Promise<ConfirmarPaseResponse> {
  if (isUiPreviewMode()) {
    const tope = Number(localStorage.getItem('subase_preview_tope') || 20000);
    const token = `preview_token_${paseId}`;
    setPaseToken(token);
    const vence = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    return {
      paseToken: token,
      pase: {
        id: paseId,
        walletAddress: localStorage.getItem('subase_preview_wallet') || 'https://ilp.interledger-test.dev/pasajero',
        topeDiario: tope,
        disponibleHoy: tope,
        venceEn: vence,
      },
    };
  }
  return apiRequest<ConfirmarPaseResponse>(`/api/pases/${encodeURIComponent(paseId)}/confirmar`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function fetchMiPase(): Promise<PaseMeResponse> {
  if (isUiPreviewMode()) {
    const hasToken = Boolean(getPaseToken());
    const tope = Number(localStorage.getItem('subase_preview_tope') || 20000);
    const disp = Number(localStorage.getItem('subase_preview_disp') ?? tope);
    return {
      activo: hasToken,
      topeDiario: tope,
      disponibleHoy: disp,
      venceEn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      walletAddress: localStorage.getItem('subase_preview_wallet') || 'https://ilp.interledger-test.dev/pasajero',
    };
  }
  return apiRequest<PaseMeResponse>('/api/pases/me');
}

export async function pagarViaje(vehiculoId: string): Promise<ReciboViaje> {
  if (isUiPreviewMode()) {
    const veh = await fetchVehiculo(vehiculoId);
    const dispActual = veh.disponibleHoy ?? 20000;
    if (dispActual < veh.tarifa) {
      throw new SubaseApiError('TOPE_ALCANZADO', ERROR_MESSAGES.TOPE_ALCANZADO);
    }
    const nuevoDisp = dispActual - veh.tarifa;
    localStorage.setItem('subase_preview_disp', String(nuevoDisp));
    const recibo: ReciboViaje = {
      viajeId: `viaje-${Date.now().toString().slice(-6)}`,
      monto: veh.tarifa,
      cashback: Math.round(veh.tarifa * 0.02),
      vehiculo: {
        id: veh.id,
        nombre: veh.nombre,
        ruta: veh.ruta,
      },
      fecha: new Date().toISOString(),
      disponibleHoy: nuevoDisp,
    };
    const prevList = JSON.parse(localStorage.getItem('subase_preview_viajes') || '[]') as ReciboViaje[];
    prevList.unshift(recibo);
    localStorage.setItem('subase_preview_viajes', JSON.stringify(prevList.slice(0, 30)));
    return recibo;
  }
  return apiRequest<ReciboViaje>('/api/viajes', {
    method: 'POST',
    body: JSON.stringify({ vehiculoId }),
  });
}

export async function fetchViaje(viajeId: string): Promise<ReciboViaje> {
  if (isUiPreviewMode()) {
    const prevList = JSON.parse(localStorage.getItem('subase_preview_viajes') || '[]') as ReciboViaje[];
    const found = prevList.find((v) => v.viajeId === viajeId);
    if (found) return found;
    return {
      viajeId,
      monto: 3200,
      cashback: 64,
      vehiculo: {
        id: 'bus-101',
        nombre: 'Cootransvi · Buseta 101',
        ruta: 'Santa Cruz · Estación Acevedo',
      },
      fecha: new Date().toISOString(),
      disponibleHoy: Number(localStorage.getItem('subase_preview_disp') ?? 16800),
    };
  }
  return apiRequest<ReciboViaje>(`/api/viajes/${encodeURIComponent(viajeId)}`);
}

export async function fetchVehiculoFeed(vehiculoId: string, desde?: string): Promise<FeedItem[]> {
  if (isUiPreviewMode()) {
    const prevList = JSON.parse(localStorage.getItem('subase_preview_viajes') || '[]') as ReciboViaje[];
    return prevList
      .filter((v) => {
        const vId = typeof v.vehiculo === 'string' ? v.vehiculo : v.vehiculo.id;
        if (vId !== vehiculoId) return false;
        if (desde && new Date(v.fecha) <= new Date(desde)) return false;
        return true;
      })
      .map((v) => ({
        viajeId: v.viajeId,
        monto: v.monto,
        estado: 'pagado',
        fecha: v.fecha,
      }));
  }
  const query = desde ? `?desde=${encodeURIComponent(desde)}` : '';
  return apiRequest<FeedItem[]>(`/api/vehiculos/${encodeURIComponent(vehiculoId)}/feed${query}`);
}
