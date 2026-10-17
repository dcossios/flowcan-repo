import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Bus,
  CarTaxiFront,
  CircleCheck,
  Clock,
  Loader2,
  LockKeyhole,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { AppShell, mensajeErrorPasajero } from '../components/AppShell';
import { FlotaVehiculos } from '../components/FlotaVehiculos';
import {
  clearEmpresaPin,
  ErrorCode,
  fetchFlota,
  FlotaResumen,
  getEmpresaPin,
  getFriendlyErrorMessage,
  isUiPreviewMode,
  setEmpresaPin,
  setUiPreviewMode,
  SubaseApiError,
} from '../lib/api';
import { formatCOP } from '../lib/format';

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

function textoUltimoPago(ultimoPagoEn: string | null): string {
  if (!ultimoPagoEn) return 'Sin pagos hoy';
  const ts = new Date(ultimoPagoEn).getTime();
  if (Number.isNaN(ts)) return 'Sin pagos hoy';
  const diffMin = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (diffMin < 1) return 'Último pago hace un momento';
  if (diffMin < 60) return `Último pago hace ${diffMin} min`;
  const horas = Math.floor(diffMin / 60);
  const resto = diffMin % 60;
  return `Último pago hace ${horas} h${resto ? ` ${resto} min` : ''}`;
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

const PinEmpresa: React.FC<{ onListo: () => void; error: boolean }> = ({ onListo, error }) => {
  const [pin, setPin] = useState('');
  return (
    <div className="flex-1 flex flex-col max-w-sm w-full">
      <LockKeyhole className="w-8 h-8 text-[#D2B99A]" strokeWidth={1.5} />
      <h1 className="text-[30px] min-[360px]:text-[34px] font-semibold leading-[1.05] tracking-[-0.01em] text-white mt-4">Panel de la empresa</h1>
      <div className="subase-sand-rule mt-2.5" />
      <p className="text-[15px] font-normal text-[#C3C5C6] mt-4 leading-relaxed">
        Escriba el PIN de la empresa para ver el recaudo y gestionar los vehículos.
      </p>
      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!pin.trim()) return;
          setEmpresaPin(pin.trim());
          onListo();
        }}
      >
        <label htmlFor="pin-empresa" className="block text-[14px] font-normal text-[#C3C5C6] mb-1.5">
          PIN
        </label>
        <input
          id="pin-empresa"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="w-full min-h-[52px] rounded-[12px] bg-black border border-[rgba(195,197,198,0.35)] px-4 text-[20px] tracking-[0.3em] text-white focus:outline-none focus:border-[#D2B99A]"
        />
        {error && (
          <p role="alert" className="text-[15px] text-[#D2B99A] mt-3">
            Ese PIN no es correcto. Intente de nuevo.
          </p>
        )}
        <button type="submit" className="subase-btn-primary mt-6" disabled={!pin.trim()}>
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

  const cargarFlota = useCallback(async (silencioso = false) => {
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
  }, [pedirPinDeNuevo]);

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

  const maxRutaRecaudo =
    resumen && resumen.porRuta.length > 0
      ? Math.max(...resumen.porRuta.map((r) => r.recaudo), 0)
      : 0;

  const maxVehiculoRecaudo =
    resumen && resumen.porVehiculo.length > 0
      ? Math.max(...resumen.porVehiculo.map((v) => v.recaudo), 0)
      : 0;

  const mapaNombresVehiculo = new Map<string, string>();
  if (resumen) {
    for (const v of resumen.porVehiculo) {
      mapaNombresVehiculo.set(v.id, v.nombre);
    }
  }

  return (
    <AppShell ancho="amplio" rol="empresa">
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
        <nav aria-label="Secciones de la empresa" className="mb-8 flex items-center justify-between gap-3">
          <div className="inline-grid grid-cols-2 p-1 rounded-[12px] border border-[rgba(195,197,198,0.2)] flex-1 sm:flex-none">
            {(['resumen', 'vehiculos'] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-current={tab === t ? 'page' : undefined}
                onClick={() => setSearchParams(t === 'resumen' ? {} : { tab: t })}
                className={`min-h-11 px-5 rounded-[9px] text-[15px] font-normal cursor-pointer ${
                  tab === t ? 'bg-white text-[#1E2230]' : 'text-[#C3C5C6] hover:text-white'
                }`}
              >
                {t === 'resumen' ? 'Resumen' : 'Vehículos'}
              </button>
            ))}
          </div>
          {!isUiPreviewMode() && (
            <button
              type="button"
              onClick={() => {
                clearEmpresaPin();
                setPinIncorrecto(false);
                setTienePin(false);
              }}
              className="inline-flex items-center min-h-11 px-2 text-[15px] font-normal text-[#C3C5C6] hover:text-white cursor-pointer"
            >
              Salir
            </button>
          )}
        </nav>
        {tab === 'vehiculos' ? (
          <FlotaVehiculos onNoAutorizado={pedirPinDeNuevo} />
        ) : cargaFallida ? (
          <>
            <h1 className="text-[30px] min-[360px]:text-[34px] font-semibold leading-[1.05] tracking-[-0.01em] text-white">
              No pudimos cargar la flota
            </h1>
            <div className="subase-sand-rule mt-2.5" />

            {errorInfo && (
              <div className="mt-8 flex-1 flex flex-col max-w-lg">
                <p className="text-[15px] font-normal text-[#C3C5C6] leading-relaxed">
                  {errorInfo.message}
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => cargarFlota(false)}
                    className="subase-btn-primary"
                  >
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
                      className="min-h-11 px-4 rounded-[12px] border border-[rgba(195,197,198,0.2)] text-[15px] font-normal text-white cursor-pointer"
                    >
                      Activar Vista Previa UI
                    </button>
                  )}
                </div>
                <p className="text-[13px] font-normal text-[#C3C5C6] mt-8">{errorInfo.code}</p>
              </div>
            )}
          </>
        ) : (
          <>
            <header>
              <h1 className="text-[30px] min-[360px]:text-[34px] font-semibold leading-[1.05] tracking-[-0.01em] text-white">
                Recaudo de la flota
              </h1>
              <div className="subase-sand-rule mt-2.5" />
              <p className="text-[15px] font-normal text-[#C3C5C6] mt-3">
                Hoy · {fechaTexto} · se actualiza cada 5 segundos
              </p>
            </header>

            {loading && !resumen && (
              <div className="flex-1 flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-[#D2B99A] animate-spin" strokeWidth={1.5} />
                <p className="text-[15px] font-normal text-[#C3C5C6] mt-3">
                  Consultando la flota…
                </p>
              </div>
            )}

            {resumen && (
              <>
                {/* Cuatro cifras principales */}
                <section aria-label="Indicadores del día" className="mt-8">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-6">
                    <div className="border-t border-[rgba(195,197,198,0.2)] pt-4">
                      <p className="text-[15px] font-normal text-[#C3C5C6]">Recaudo de hoy</p>
                      <p className="text-[40px] md:text-[48px] font-semibold text-white leading-none tracking-[-0.01em] tabular-nums mt-2">
                        {formatCOP(resumen.totales.recaudo)}
                      </p>
                      <p className="text-[15px] font-normal text-[#C3C5C6] mt-2">
                        {resumen.totales.pasajes}{' '}
                        {resumen.totales.pasajes === 1 ? 'pasaje pagado' : 'pasajes pagados'}
                      </p>
                    </div>

                    <div className="border-t border-[rgba(195,197,198,0.2)] pt-4">
                      <p className="text-[15px] font-normal text-[#C3C5C6]">Pasajes</p>
                      <p className="text-[40px] md:text-[48px] font-semibold text-white leading-none tracking-[-0.01em] tabular-nums mt-2">
                        {resumen.totales.pasajes}
                      </p>
                      {resumen.totales.pendientes > 0 && (
                        <p className="text-[15px] font-normal text-[#C3C5C6] mt-2">
                          {resumen.totales.pendientes} confirmando
                        </p>
                      )}
                    </div>

                    <div className="border-t border-[rgba(195,197,198,0.2)] pt-4">
                      <p className="text-[15px] font-normal text-[#C3C5C6]">
                        Vehículos con pagos
                      </p>
                      <p className="text-[40px] md:text-[48px] font-semibold text-white leading-none tracking-[-0.01em] tabular-nums mt-2">
                        {resumen.totales.vehiculosConPagos} de {resumen.totales.vehiculos}
                      </p>
                      <p className="text-[15px] font-normal text-[#C3C5C6] mt-2">en ruta hoy</p>
                    </div>

                    <div className="border-t border-[rgba(195,197,198,0.2)] pt-4">
                      <p className="text-[15px] font-normal text-[#C3C5C6]">Comisión Súbase</p>
                      <p className="text-[40px] md:text-[48px] font-semibold text-white leading-none tracking-[-0.01em] tabular-nums mt-2">
                        {formatCOP(Math.round(resumen.totales.recaudo * 0.015))}
                      </p>
                      <p className="text-[15px] font-normal text-[#C3C5C6] mt-2">
                        estimada, 1,5 % por transacción
                      </p>
                    </div>
                  </div>

                  {resumen.totales.fallidos > 0 && (
                    <div className="mt-5 flex items-center gap-2 text-[15px] font-normal text-white">
                      <AlertTriangle
                        className="w-5 h-5 text-[#D2B99A] shrink-0"
                        strokeWidth={1.5}
                      />
                      <span>
                        {resumen.totales.fallidos === 1
                          ? '1 pago fallido hoy'
                          : `${resumen.totales.fallidos} pagos fallidos hoy`}
                      </span>
                    </div>
                  )}
                </section>

                {/* Dos columnas desde 1024px */}
                <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                  <div className="lg:col-span-7 space-y-10 min-w-0">
                    {/* Sección Por ruta */}
                    <section aria-labelledby="flota-por-ruta">
                      <h2
                        id="flota-por-ruta"
                        className="text-[18px] font-normal text-white"
                      >
                        Por ruta
                      </h2>
                      <ol className="mt-3 divide-y divide-[rgba(195,197,198,0.2)] border-t border-b border-[rgba(195,197,198,0.2)]">
                        {resumen.porRuta.map((item) => {
                          const pct =
                            maxRutaRecaudo > 0 && item.recaudo > 0
                              ? Math.min(100, Math.round((item.recaudo / maxRutaRecaudo) * 100))
                              : 0;
                          return (
                            <li key={item.ruta} className="py-4">
                              <div className="flex items-baseline justify-between gap-4">
                                <span className="text-[16px] font-normal text-white min-w-0">
                                  {item.ruta}
                                </span>
                                <span className="text-[16px] font-normal text-white tabular-nums shrink-0">
                                  {formatCOP(item.recaudo)}
                                </span>
                              </div>
                              <p className="text-[15px] font-normal text-[#C3C5C6] mt-1">
                                {item.pasajes} {item.pasajes === 1 ? 'pasaje' : 'pasajes'} ·{' '}
                                {item.vehiculos}{' '}
                                {item.vehiculos === 1 ? 'vehículo' : 'vehículos'}
                              </p>
                              <div
                                aria-hidden="true"
                                className="mt-3 h-[6px] w-full bg-[rgba(195,197,198,0.15)] overflow-hidden"
                              >
                                {pct > 0 && (
                                  <div
                                    className="h-full bg-[#D2B99A] rounded-r-[4px] rounded-l-none"
                                    style={{ width: `${pct}%` }}
                                  />
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    </section>

                    {/* Sección Por vehículo */}
                    <section aria-labelledby="flota-por-vehiculo">
                      <h2
                        id="flota-por-vehiculo"
                        className="text-[18px] font-normal text-white"
                      >
                        Por vehículo
                      </h2>
                      <ol className="mt-3 divide-y divide-[rgba(195,197,198,0.2)] border-t border-b border-[rgba(195,197,198,0.2)]">
                        {resumen.porVehiculo.map((v) => {
                          const pct =
                            maxVehiculoRecaudo > 0 && v.recaudo > 0
                              ? Math.min(
                                  100,
                                  Math.round((v.recaudo / maxVehiculoRecaudo) * 100)
                                )
                              : 0;
                          const IconoVehiculo = v.tipo === 'taxi' ? CarTaxiFront : Bus;
                          const lineaConductorRuta = v.conductor
                            ? `${v.conductor} · ${v.ruta}`
                            : v.ruta;
                          const textoFallidos =
                            v.fallidos > 0
                              ? ` · ${v.fallidos} ${v.fallidos === 1 ? 'fallido' : 'fallidos'}`
                              : '';

                          return (
                            <li key={v.id}>
                              <Link
                                to={`/conductor/${encodeURIComponent(v.id)}`}
                                aria-label={`Ver terminal de ${v.nombre}`}
                                className="block py-4 group min-h-11"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <IconoVehiculo
                                      className="w-5 h-5 text-[#D2B99A] shrink-0"
                                      strokeWidth={1.5}
                                    />
                                    <span className="text-[16px] font-normal text-white group-hover:underline truncate">
                                      {v.nombre}
                                    </span>
                                  </div>
                                  <span className="text-[16px] font-normal text-white tabular-nums shrink-0">
                                    {formatCOP(v.recaudo)}
                                  </span>
                                </div>
                                <p className="text-[15px] font-normal text-[#C3C5C6] mt-1">
                                  {lineaConductorRuta}
                                </p>
                                <p className="text-[15px] font-normal text-[#C3C5C6] mt-0.5">
                                  {textoUltimoPago(v.ultimoPagoEn)}
                                  {textoFallidos}
                                </p>
                                <div
                                  aria-hidden="true"
                                  className="mt-3 h-[6px] w-full bg-[rgba(195,197,198,0.15)] overflow-hidden"
                                >
                                  {pct > 0 && (
                                    <div
                                      className="h-full bg-[#D2B99A] rounded-r-[4px] rounded-l-none"
                                      style={{ width: `${pct}%` }}
                                    />
                                  )}
                                </div>
                              </Link>
                            </li>
                          );
                        })}
                      </ol>
                    </section>
                  </div>

                  {/* Sección Últimos pagos */}
                  <section
                    aria-labelledby="flota-ultimos-pagos"
                    className="lg:col-span-5 min-w-0"
                  >
                    <h2
                      id="flota-ultimos-pagos"
                      className="text-[18px] font-normal text-white"
                    >
                      Últimos pagos
                    </h2>

                    {resumen.ultimosPagos.length === 0 ? (
                      <div className="mt-3 py-6 border-t border-b border-[rgba(195,197,198,0.2)]">
                        <p className="text-[15px] font-normal text-[#C3C5C6]">
                          Todavía no hay pagos hoy.
                        </p>
                      </div>
                    ) : (
                      <ul className="mt-3 divide-y divide-[rgba(195,197,198,0.2)] border-t border-b border-[rgba(195,197,198,0.2)]">
                        {resumen.ultimosPagos.slice(0, 10).map((pago) => {
                          const esPagado = pago.estado === 'pagado';
                          const esPendiente = pago.estado === 'pendiente';
                          const nombreCorto = nombreCortoVehiculo(
                            pago.vehiculoId,
                            mapaNombresVehiculo.get(pago.vehiculoId)
                          );

                          return (
                            <li
                              key={pago.viajeId}
                              className={`py-3.5 flex items-center justify-between gap-3 text-[15px] font-normal ${
                                esPagado ? 'text-white' : 'text-[#C3C5C6]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="tabular-nums text-[#C3C5C6] shrink-0">
                                  {formatearHoraHHMM(pago.fecha)}
                                </span>
                                <span className="truncate">{nombreCorto}</span>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <span className="inline-flex items-center gap-1.5 text-[15px]">
                                  {esPagado ? (
                                    <>
                                      <CircleCheck
                                        className="w-4 h-4 text-[#D2B99A] shrink-0"
                                        strokeWidth={1.5}
                                      />
                                      <span>Pagado</span>
                                    </>
                                  ) : esPendiente ? (
                                    <>
                                      <Clock
                                        className="w-4 h-4 text-[#C3C5C6] shrink-0"
                                        strokeWidth={1.5}
                                      />
                                      <span>Confirmando…</span>
                                    </>
                                  ) : (
                                    <>
                                      <XCircle
                                        className="w-4 h-4 text-[#C3C5C6] shrink-0"
                                        strokeWidth={1.5}
                                      />
                                      <span>Fallido</span>
                                    </>
                                  )}
                                </span>
                                <span className="tabular-nums font-normal">
                                  {formatCOP(pago.monto)}
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                </div>
              </>
            )}
          </>
        )}
      </div>
      )}
    </AppShell>
  );
};
