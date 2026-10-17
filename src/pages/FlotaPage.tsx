import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, RefreshCw } from 'lucide-react';
import { AppShell, mensajeErrorPasajero } from '../components/AppShell';
import { FlotaVehiculos } from '../components/FlotaVehiculos';
import { Bajada, ETIQUETA, FichaEstado, PanelCrema, Pasaje, TINTA, Titulo } from '../components/Sistema';
import { coloresDeRuta, insigniaChica, partirNombre, rutaConFlechas } from '../lib/rutas';
import {
  clearEmpresaPin,
  ErrorCode,
  EstadoViaje,
  fetchFlota,
  FlotaResumen,
  FlotaVehiculo,
  getEmpresaPin,
  getFriendlyErrorMessage,
  isUiPreviewMode,
  setEmpresaPin,
  setUiPreviewMode,
  SubaseApiError,
} from '../lib/api';
import { formatCOP } from '../lib/format';

/*
REFERENCIA: mapa de Mini Metro + tablero de llegadas de la Terminal del Norte de Medellín
TIPOGRAFÍA: Poppins 600 a 30/34 px; montos 600 tabulares; ETIQUETA 12 px versalitas; horas en mono 14 px
PALETA:     campo crema #F0E9D6 · tinta #1E2230 · color de cada línea · verde #2F865F y rojo #B8403A solo en FichaEstado
RIESGO:     cada vehículo es una línea de metro dibujada: una estación por pasaje; el dato es el dibujo
*/

function formatearFechaLarga(fechaYYYYMMDD: string): string {
  try {
    const d = new Date(`${fechaYYYYMMDD}T12:00:00-05:00`);
    if (Number.isNaN(d.getTime())) return fechaYYYYMMDD;
    return d.toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'America/Bogota',
    });
  } catch {
    return fechaYYYYMMDD;
  }
}

function formatearHoraHHMM(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return isoDate;
    return d.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Bogota',
    });
  } catch {
    return isoDate;
  }
}

function nombreCortoVehiculo(vehiculoId: string, nombreCompleto?: string): string {
  if (nombreCompleto) {
    const partes = nombreCompleto.split(/\s+[—–-]\s+/);
    if (partes[0]) return partes[0].trim();
  }
  if (vehiculoId === 'bus-01') return 'Bus 01';
  if (vehiculoId === 'bus-02') return 'Bus 02';
  if (vehiculoId === 'taxi-01') return 'Taxi 01';
  return vehiculoId;
}

function datosFichaVehiculo(vehiculoId: string, nombreCompleto?: string, tipo?: 'bus' | 'taxi') {
  const { tipo: tipoNombre, numero, empresa } = partirNombre(nombreCompleto || '');
  const esTaxi = tipo === 'taxi' || vehiculoId.startsWith('taxi');
  const num =
    numero ||
    vehiculoId.match(/\d+/)?.[0] ||
    (esTaxi ? 'TX' : vehiculoId.slice(0, 2).toUpperCase());
  const colores = coloresDeRuta(esTaxi && !vehiculoId.startsWith('taxi-01') ? 'taxi-01' : vehiculoId);
  const etiquetaTipo = (tipoNombre || (esTaxi ? 'Taxi' : 'Bus')).toUpperCase();
  return { num, colores, etiquetaTipo, empresa };
}

function normalizarEstadoPago(estado: string): EstadoViaje {
  if (estado === 'pendiente' || estado === 'fallido') return estado;
  return 'pagado';
}

/** Línea del día: una estación por pasaje pagado; los fallidos van con X. */
const LineaPasajes: React.FC<{ color: string; pagados: number; fallidos: number }> = ({
  color,
  pagados,
  fallidos,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => setAncho(el.clientWidth);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const PAD = 10;
  const PASO = 26;
  const R = 7;
  const ALTO = 28;
  const y = ALTO / 2;
  const total = pagados + fallidos;
  const maxFit = ancho > 0 ? Math.max(1, Math.floor((Math.max(0, ancho - 2 * PAD) ) / PASO) + 1) : 1;
  const overflow = total > maxFit;
  const visiblesReales = overflow ? Math.max(0, maxFit - 1) : total;
  const ocultos = overflow ? total - visiblesReales : 0;
  const dibujos = overflow ? maxFit : total;
  const lastX = dibujos <= 0 ? PAD : PAD + (dibujos - 1) * PASO;

  return (
    <div ref={ref} className="w-full min-w-0 h-7">
      {ancho > 0 && (
        <svg aria-hidden="true" width={ancho} height={ALTO} viewBox={`0 0 ${ancho} ${ALTO}`} className="block">
          <line x1={0} y1={y} x2={ancho} y2={y} stroke={color} strokeWidth={8} opacity={0.25} />
          {total > 0 && <line x1={0} y1={y} x2={lastX} y2={y} stroke={color} strokeWidth={8} />}
          {Array.from({ length: visiblesReales }, (_, i) => {
            const x = PAD + i * PASO;
            const esFallido = i >= pagados;
            if (esFallido) {
              return (
                <g key={i}>
                  <rect x={x - 7} y={y - 7} width={14} height={14} rx={1} fill="#B8403A" />
                  <path
                    d={`M${x - 3.5} ${y - 3.5}l7 7M${x + 3.5} ${y - 3.5}l-7 7`}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    strokeLinecap="square"
                  />
                </g>
              );
            }
            return (
              <circle key={i} cx={x} cy={y} r={R} fill="#FFFFFF" stroke={TINTA} strokeWidth={3} />
            );
          })}
          {overflow && (
            <g>
              <circle cx={lastX} cy={y} r={10} fill={TINTA} />
              <text
                x={lastX}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#FFFFFF"
                fontSize={11}
                fontWeight={600}
                fontFamily="Poppins, sans-serif"
              >
                +{ocultos}
              </text>
            </g>
          )}
        </svg>
      )}
    </div>
  );
};

const FilaMapa: React.FC<{ v: FlotaVehiculo }> = ({ v }) => {
  const { num, colores, etiquetaTipo } = datosFichaVehiculo(v.id, v.nombre, v.tipo);
  const ultimo = v.ultimoPagoEn ? formatearHoraHHMM(v.ultimoPagoEn) : null;

  return (
    <li className="border-b border-[rgba(30,34,48,0.16)]">
      <Link
        to={`/conductor/${encodeURIComponent(v.id)}`}
        aria-label={`Ver terminal de ${v.nombre}`}
        className="block py-3.5 min-h-11 rounded-[3px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E2230]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 min-w-0 sm:w-[200px] sm:shrink-0">
            <span
              className="inline-flex items-center justify-center min-w-11 h-11 px-2 rounded-[3px] text-[22px] font-semibold tabular-nums leading-none shrink-0"
              style={{ backgroundColor: colores.color, color: colores.texto }}
            >
              {num}
            </span>
            <div className="min-w-0 leading-tight">
              <span className={`block ${ETIQUETA} text-[#1E2230]`}>
                {etiquetaTipo} {num}
              </span>
              <span className="block text-[14px] font-medium text-[#3A3F4E] mt-0.5">
                {rutaConFlechas(v.ruta)}
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <LineaPasajes color={colores.color} pagados={v.pasajes} fallidos={v.fallidos} />
          </div>

          <div className="sm:text-right shrink-0 min-w-0">
            <p
              className="inline-flex rounded-[3px] px-2.5 py-1 text-[18px] font-semibold leading-none tabular-nums text-white"
              style={{ backgroundColor: TINTA }}
            >
              {formatCOP(v.recaudo)}
            </p>
            <p className="text-[14px] text-[#3A3F4E] mt-1">
              {v.pasajes} {v.pasajes === 1 ? 'pasaje' : 'pasajes'}
              {ultimo ? ` · último ${ultimo}` : ''}
            </p>
          </div>
        </div>
      </Link>
    </li>
  );
};

const PinEmpresa: React.FC<{ onListo: () => void; error: boolean }> = ({ onListo, error }) => {
  const [pin, setPin] = useState('');
  return (
    <div className="flex-1 flex flex-col">
      <PanelCrema>
        <p className={`${ETIQUETA} text-[#3A3F4E]`}>Empresa · Flota 1</p>
        <Titulo className="mt-2.5">Panel de la empresa</Titulo>
        <Bajada className="mt-2">
          Escriba el PIN de la empresa para ver el recaudo en vivo y gestionar los vehículos de la flota.
        </Bajada>
      </PanelCrema>

      <form
        className="mt-6 max-w-sm w-full"
        onSubmit={(e) => {
          e.preventDefault();
          if (!pin.trim()) return;
          setEmpresaPin(pin.trim());
          onListo();
        }}
      >
        <label htmlFor="pin-empresa" className="block text-[15px] font-semibold text-[#1E2230] mb-2">
          PIN de la empresa
        </label>
        <input
          id="pin-empresa"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="w-full min-h-11 rounded-[3px] bg-white border-[1.5px] border-[rgba(30,34,48,0.3)] px-4 text-[20px] tracking-[0.3em] text-[#1E2230] focus:outline-none focus:border-[#1E2230]"
        />
        {error && (
          <p role="alert" className="mt-3 flex items-center gap-2.5 text-[16px] text-[#1E2230]">
            <FichaEstado estado="fallido" tamano={22} />
            Ese PIN no es correcto. Intente de nuevo.
          </p>
        )}
        <button type="submit" className="subase-btn-primary subase-btn-tinta mt-6" disabled={!pin.trim()}>
          Entrar
        </button>
      </form>
    </div>
  );
};

export const FlotaPage: React.FC = () => {
  const isDev = import.meta.env.DEV;
  const [resumen, setResumen] = useState<FlotaResumen | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorInfo, setErrorInfo] = useState<{ code: ErrorCode; message: string } | null>(null);
  const [tienePin, setTienePin] = useState<boolean>(() => Boolean(getEmpresaPin()) || isUiPreviewMode());
  const [pinIncorrecto, setPinIncorrecto] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'vehiculos' ? 'vehiculos' : 'resumen';

  const pedirPinDeNuevo = useCallback(() => {
    clearEmpresaPin();
    setResumen(null);
    setPinIncorrecto(true);
    setTienePin(false);
  }, []);

  const cargarFlota = useCallback(
    async (silencioso = false) => {
      if (!silencioso) {
        setLoading(true);
        setErrorInfo(null);
      }
      try {
        const data = await fetchFlota();
        setResumen(data);
        setErrorInfo(null);
      } catch (err) {
        if (err instanceof SubaseApiError && err.code === 'NO_AUTORIZADO') {
          pedirPinDeNuevo();
          return;
        }
        if (!silencioso) {
          const friendly = getFriendlyErrorMessage(err);
          setErrorInfo({
            code: friendly.code,
            message: mensajeErrorPasajero(friendly.code, friendly.message),
          });
        }
      } finally {
        if (!silencioso) {
          setLoading(false);
        }
      }
    },
    [pedirPinDeNuevo]
  );

  // El resumen se consulta cada 5 s solo mientras está a la vista.
  useEffect(() => {
    if (!tienePin || tab !== 'resumen') return;
    cargarFlota(false);
    const intervalId = window.setInterval(() => {
      cargarFlota(true);
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [cargarFlota, tienePin, tab]);

  const cargaFallida = !loading && !resumen;

  const fechaTexto = resumen
    ? formatearFechaLarga(resumen.fecha)
    : formatearFechaLarga(new Date().toISOString().slice(0, 10));

  const mapaVehiculoPorId = new Map<string, { nombre: string; tipo: 'bus' | 'taxi' }>();
  if (resumen) {
    for (const v of resumen.porVehiculo) {
      mapaVehiculoPorId.set(v.id, { nombre: v.nombre, tipo: v.tipo });
    }
  }

  const barraSuperior = (
    <nav
      aria-label="Secciones de la empresa"
      className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[rgba(30,34,48,0.16)]"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="inline-flex items-center justify-center h-7 px-2 rounded-[3px] bg-[#1E2230] text-white text-[12px] font-semibold uppercase tracking-[0.1em]">
          Flota 1
        </span>
        <span className="hidden sm:inline font-mono text-[14px] text-[#3A3F4E]">
          $ilp.interledger-test.dev/flota1
        </span>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
        <div className="inline-grid grid-cols-2 p-1 rounded-[3px] border-[1.5px] border-[rgba(30,34,48,0.28)] bg-white/55 flex-1 sm:flex-none">
          {(['resumen', 'vehiculos'] as const).map((t) => {
            const activa = tab === t;
            return (
              <button
                key={t}
                type="button"
                aria-current={activa ? 'page' : undefined}
                onClick={() => setSearchParams(t === 'resumen' ? {} : { tab: t })}
                className={`min-h-11 px-4 rounded-[2px] text-[15px] font-semibold cursor-pointer ${
                  activa ? 'bg-[#1E2230] text-white' : 'text-[#1E2230] hover:bg-[#1E2230]/10'
                }`}
              >
                {t === 'resumen' ? 'Resumen' : 'Vehículos'}
              </button>
            );
          })}
        </div>
        {!isUiPreviewMode() && (
          <button
            type="button"
            onClick={() => {
              clearEmpresaPin();
              setPinIncorrecto(false);
              setTienePin(false);
            }}
            className="inline-flex items-center min-h-11 px-2 text-[14px] font-medium text-[#3A3F4E] underline underline-offset-4 hover:text-[#1E2230] cursor-pointer shrink-0"
          >
            Salir
          </button>
        )}
      </div>
    </nav>
  );

  return (
    <AppShell ancho="amplio" rol="empresa" fondo="crema">
      {!tienePin ? (
        <PinEmpresa
          error={pinIncorrecto}
          onListo={() => {
            setPinIncorrecto(false);
            setTienePin(true);
          }}
        />
      ) : (
        <div className="flex-1 flex flex-col">
          {tab === 'vehiculos' ? (
            <FlotaVehiculos onNoAutorizado={pedirPinDeNuevo} barraSuperior={barraSuperior} />
          ) : cargaFallida ? (
            <>
              <PanelCrema>
                {barraSuperior}
                <Titulo className="mt-5">No pudimos cargar la flota</Titulo>
                {errorInfo && (
                  <p className="mt-3 flex items-start gap-2.5 text-[16px] text-[#1E2230]">
                    <FichaEstado estado="fallido" tamano={22} />
                    <span>{errorInfo.message}</span>
                  </p>
                )}
              </PanelCrema>

              {errorInfo && (
                <div className="mt-6 flex-1 flex flex-col max-w-lg">
                  <div className="flex flex-col gap-3">
                    <button type="button" onClick={() => cargarFlota(false)} className="subase-btn-primary subase-btn-tinta">
                      <RefreshCw className="w-5 h-5" strokeWidth={1.5} />
                      Reintentar
                    </button>
                    {isDev && errorInfo.code === 'BACKEND_OFFLINE' && (
                      <button
                        type="button"
                        onClick={() => {
                          setUiPreviewMode(true);
                          cargarFlota(false);
                        }}
                        className="inline-flex items-center justify-center min-h-11 px-4 rounded-[3px] border-[1.5px] border-[#1E2230] text-[15px] font-semibold text-[#1E2230] cursor-pointer"
                      >
                        Activar Vista Previa UI
                      </button>
                    )}
                  </div>
                  <p className="text-[14px] font-normal text-[#3A3F4E] mt-8">{errorInfo.code}</p>
                </div>
              )}
            </>
          ) : (
            <>
              <PanelCrema>
                {barraSuperior}

                <div className="mt-5">
                  <Titulo>Recaudo de la flota</Titulo>
                  <Bajada className="mt-1.5">
                    Hoy · {fechaTexto} · se actualiza cada 5 segundos
                  </Bajada>
                  {resumen && (
                    <Pasaje
                      monto={resumen.totales.recaudo}
                      etiqueta="Recaudo de hoy"
                      grande
                      className="mt-5"
                    />
                  )}
                </div>

                {resumen && (
                  <p className="mt-4 text-[16px] leading-snug text-[#1E2230]">
                    <span className="font-semibold tabular-nums">
                      {resumen.totales.pasajes} {resumen.totales.pasajes === 1 ? 'pasaje' : 'pasajes'}
                    </span>
                    {' · '}
                    <span className="font-semibold tabular-nums">
                      {resumen.totales.vehiculosConPagos} de {resumen.totales.vehiculos}{' '}
                      {resumen.totales.vehiculos === 1 ? 'bus' : 'buses'} en ruta
                    </span>
                    {' · '}
                    <span className="text-[14px] text-[#3A3F4E]">
                      comisión Súbase{' '}
                      <span className="tabular-nums">{formatCOP(Math.round(resumen.totales.recaudo * 0.015))}</span>
                      {' '}estimada, 1,5 %
                    </span>
                  </p>
                )}

                {resumen && resumen.totales.fallidos > 0 && (
                  <div className="mt-3 flex items-center gap-2.5 text-[16px] font-medium text-[#1E2230]">
                    <FichaEstado estado="fallido" tamano={22} />
                    <span>
                      {resumen.totales.fallidos === 1
                        ? '1 pago fallido hoy · no se descontó al pasajero'
                        : `${resumen.totales.fallidos} pagos fallidos hoy · no se descontó al pasajero`}
                    </span>
                  </div>
                )}

                {loading && !resumen && (
                  <div className="mt-5 flex items-center gap-3 py-2">
                    <Loader2 className="w-6 h-6 animate-spin text-[#1E2230]" strokeWidth={1.5} />
                    <Bajada>Consultando la flota…</Bajada>
                  </div>
                )}
              </PanelCrema>

              {resumen && (
                <div className="mt-2 pt-6 border-t border-[rgba(30,34,48,0.16)] flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-10">
                  <section aria-labelledby="flota-mapa" className="lg:w-2/3 min-w-0">
                    <h2 id="flota-mapa" className={`${ETIQUETA} text-[#1E2230]`}>
                      Mapa de la flota
                    </h2>
                    <ol className="mt-2 border-t border-[rgba(30,34,48,0.16)]">
                      {resumen.porVehiculo.map((v) => (
                        <FilaMapa key={v.id} v={v} />
                      ))}
                    </ol>
                  </section>

                  <section aria-labelledby="flota-llegadas" className="lg:w-1/3 min-w-0">
                    <div className="rounded-[3px] p-4" style={{ backgroundColor: TINTA }}>
                      <h2 id="flota-llegadas" className={`${ETIQUETA} text-[#C9CCCE]`}>
                        Llegadas · Open Payments
                      </h2>

                      {resumen.ultimosPagos.length === 0 ? (
                        <p className="mt-3 py-3 text-[16px] text-[#C9CCCE]">Todavía no hay pagos hoy.</p>
                      ) : (
                        <ul className="mt-1">
                          {resumen.ultimosPagos.map((pago) => {
                            const estadoPago = normalizarEstadoPago(pago.estado);
                            const infoVehiculo = mapaVehiculoPorId.get(pago.vehiculoId);
                            const nombreCorto = nombreCortoVehiculo(pago.vehiculoId, infoVehiculo?.nombre);
                            const { num } = datosFichaVehiculo(
                              pago.vehiculoId,
                              infoVehiculo?.nombre,
                              infoVehiculo?.tipo
                            );
                            const chica = insigniaChica(pago.vehiculoId);
                            const esPagado = estadoPago === 'pagado';

                            return (
                              <li
                                key={pago.viajeId}
                                className="py-3 flex items-center gap-2.5 min-h-11 border-b border-white/[0.12] last:border-b-0"
                              >
                                <span className="font-mono text-[14px] text-white tabular-nums shrink-0">
                                  {formatearHoraHHMM(pago.fecha)}
                                </span>
                                <span
                                  className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1 rounded-[2px] text-[14px] font-semibold tabular-nums leading-none shrink-0"
                                  style={{ backgroundColor: chica.fondo, color: chica.texto }}
                                >
                                  {num}
                                </span>
                                <span className="text-[16px] font-medium text-white min-w-0">{nombreCorto}</span>
                                <span className="ml-auto text-[16px] font-semibold tabular-nums text-white shrink-0">
                                  {esPagado ? `+${formatCOP(pago.monto)}` : formatCOP(pago.monto)}
                                </span>
                                <FichaEstado estado={estadoPago} tamano={22} />
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </section>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </AppShell>
  );
};
