import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, CircleCheck, Clock, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { AppShell, mensajeErrorPasajero } from '../components/AppShell';
import {
  clearPaseToken,
  ErrorCode,
  EstadoViaje,
  fetchMiPase,
  fetchMisViajes,
  getFriendlyErrorMessage,
  getPaseToken,
  MiViaje,
  PaseMeResponse,
  SubaseApiError,
} from '../lib/api';
import { formatCOP, formatFechaHora } from '../lib/format';
import { leerUltimoVehiculo } from '../lib/ultimoVehiculo';

function fechaCorta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', timeZone: 'America/Bogota' });
}

const walletCorta = (w?: string) => (w ? w.replace(/^https:\/\//, '$') : '');

const EstadoChip: React.FC<{ estado: EstadoViaje }> = ({ estado }) => {
  if (estado === 'pagado') {
    return (
      <span className="inline-flex items-center gap-1.5 text-white">
        <CircleCheck className="w-4 h-4 text-[#D2B99A] shrink-0" strokeWidth={1.5} />
        Pagado
      </span>
    );
  }
  if (estado === 'pendiente') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[#C3C5C6]">
        <Clock className="w-4 h-4 shrink-0" strokeWidth={1.5} />
        Confirmando…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[#C3C5C6]">
      <XCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
      No se cobró
    </span>
  );
};

export const MiPasePage: React.FC = () => {
  const navigate = useNavigate();
  const ultimo = leerUltimoVehiculo();
  const [pase, setPase] = useState<PaseMeResponse | null>(null);
  const [viajes, setViajes] = useState<MiViaje[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(getPaseToken()));
  const [sinPase, setSinPase] = useState<boolean>(!getPaseToken());
  const [errorInfo, setErrorInfo] = useState<{ code: ErrorCode; message: string } | null>(null);
  const [confirmarQuitar, setConfirmarQuitar] = useState(false);

  const cargar = useCallback(async () => {
    if (!getPaseToken()) {
      setSinPase(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorInfo(null);
    try {
      const [p, v] = await Promise.all([fetchMiPase(), fetchMisViajes()]);
      setPase(p);
      setViajes(v);
      setSinPase(!p.activo);
    } catch (err) {
      if (err instanceof SubaseApiError && (err.code === 'PASE_INVALIDO' || err.code === 'PASE_VENCIDO')) {
        clearPaseToken();
        setSinPase(true);
      } else {
        const f = getFriendlyErrorMessage(err);
        setErrorInfo({ code: f.code, message: mensajeErrorPasajero(f.code, f.message) });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const quitarPase = () => {
    clearPaseToken();
    navigate('/', { replace: true });
  };

  const pct =
    pase && pase.topeDiario > 0
      ? Math.min(100, Math.max(0, Math.round((pase.disponibleHoy / pase.topeDiario) * 100)))
      : 0;
  const cashbackTotal = viajes.filter((v) => v.estado === 'pagado').reduce((s, v) => s + v.cashback, 0);

  return (
    <AppShell vehiculoIdActual={ultimo?.id}>
      <div className="flex-1 flex flex-col">
        <h1 className="text-[32px] font-light text-white leading-tight">Mi pase</h1>
        <div className="subase-sand-rule mt-2.5" />

        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#D2B99A] animate-spin" strokeWidth={1.5} />
            <p className="text-[15px] font-normal text-[#C3C5C6] mt-3">Consultando su pase…</p>
          </div>
        )}

        {!loading && errorInfo && (
          <div role="alert" className="mt-6">
            <p className="text-[15px] font-normal text-[#C3C5C6] leading-relaxed">{errorInfo.message}</p>
            <button type="button" onClick={cargar} className="subase-btn-primary mt-6">
              <RefreshCw className="w-5 h-5" strokeWidth={1.5} />
              Reintentar
            </button>
          </div>
        )}

        {!loading && !errorInfo && sinPase && (
          <div className="mt-4">
            <p className="text-[18px] font-normal text-white leading-snug">
              Todavía no tiene un pase en este celular.
            </p>
            <p className="text-[15px] font-normal text-[#C3C5C6] mt-3 leading-relaxed">
              Escanee el QR de un bus y toque «Pagar». Activa el pase una sola vez y después paga con un
              toque.
            </p>
            {ultimo ? (
              <Link to={`/v/${encodeURIComponent(ultimo.id)}`} className="subase-btn-primary mt-8">
                Ir a pagar en {ultimo.nombre.split(/\s+[—–-]\s+/)[0]}
              </Link>
            ) : (
              <Link to="/pase/activar" className="subase-btn-primary mt-8">
                Activar mi pase
              </Link>
            )}
          </div>
        )}

        {!loading && !errorInfo && !sinPase && pase && (
          <>
            {/* Resumen del pase */}
            <section aria-label="Resumen del pase" className="mt-6">
              <p className="text-[15px] font-normal text-[#C3C5C6]">Disponible hoy</p>
              <p className="text-[48px] font-light text-white leading-none tracking-tight tabular-nums mt-2">
                {formatCOP(pase.disponibleHoy)}
              </p>
              <p className="text-[15px] font-normal text-[#C3C5C6] mt-2">
                de {formatCOP(pase.topeDiario)} diarios · se renueva cada medianoche
              </p>
              <div aria-hidden="true" className="mt-3 h-[6px] w-full bg-[rgba(195,197,198,0.15)] overflow-hidden">
                {pct > 0 && <div className="h-full bg-[#D2B99A] rounded-r-[4px]" style={{ width: `${pct}%` }} />}
              </div>

              <dl className="mt-6 border-t border-[rgba(195,197,198,0.2)]">
                <div className="flex items-baseline justify-between gap-4 py-3 border-b border-[rgba(195,197,198,0.2)]">
                  <dt className="text-[15px] font-normal text-[#C3C5C6]">Vence</dt>
                  <dd className="text-[15px] font-normal text-white text-right">{fechaCorta(pase.venceEn)}</dd>
                </div>
                {pase.walletAddress && (
                  <div className="flex items-baseline justify-between gap-4 py-3 border-b border-[rgba(195,197,198,0.2)]">
                    <dt className="text-[15px] font-normal text-[#C3C5C6] shrink-0">Billetera</dt>
                    <dd className="text-[15px] font-normal text-white text-right min-w-0 break-all">
                      {walletCorta(pase.walletAddress)}
                    </dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-4 py-3 border-b border-[rgba(195,197,198,0.2)]">
                  <dt className="text-[15px] font-normal text-[#C3C5C6]">Cashback acumulado (simulado)</dt>
                  <dd className="text-[15px] font-normal text-white text-right">+{formatCOP(cashbackTotal)}</dd>
                </div>
              </dl>
            </section>

            {/* Mis viajes */}
            <section aria-labelledby="mis-viajes" className="mt-10">
              <h2 id="mis-viajes" className="text-[18px] font-normal text-white">
                Mis viajes
              </h2>
              {viajes.length === 0 ? (
                <p className="mt-3 py-6 border-t border-b border-[rgba(195,197,198,0.2)] text-[15px] font-normal text-[#C3C5C6]">
                  Aún no tiene viajes. Cuando pague un pasaje, aparece aquí.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-[rgba(195,197,198,0.2)] border-t border-b border-[rgba(195,197,198,0.2)]">
                  {viajes.map((v) => (
                    <li key={v.viajeId}>
                      <Link
                        to={`/recibo/${encodeURIComponent(v.viajeId)}`}
                        className="flex items-center gap-3 py-3.5 min-h-11 group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="text-[16px] font-normal text-white truncate group-hover:underline">
                              {v.vehiculo.nombre}
                            </span>
                            <span className="text-[16px] font-normal text-white tabular-nums shrink-0">
                              {formatCOP(v.monto)}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mt-1 text-[14px] font-normal">
                            <span className="text-[#C3C5C6]">{formatFechaHora(v.fecha)}</span>
                            <EstadoChip estado={v.estado} />
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-[#C3C5C6] shrink-0" strokeWidth={1.5} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {ultimo && (
              <Link to={`/v/${encodeURIComponent(ultimo.id)}`} className="subase-btn-primary mt-8">
                Pagar otro viaje
              </Link>
            )}

            <div className="mt-8">
              {confirmarQuitar ? (
                <div className="subase-card p-4">
                  <p className="text-[15px] font-normal text-white leading-relaxed">
                    ¿Quitar el pase de este celular? Para volver a pagar tendrá que activarlo otra vez.
                  </p>
                  <div className="mt-4 flex flex-col min-[400px]:flex-row gap-3">
                    <button
                      type="button"
                      onClick={quitarPase}
                      className="min-h-11 px-4 rounded-[12px] border border-[#D2B99A] text-[15px] font-normal text-white cursor-pointer"
                    >
                      Sí, quitarlo
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmarQuitar(false)}
                      className="min-h-11 px-4 rounded-[12px] border border-[rgba(195,197,198,0.2)] text-[15px] font-normal text-[#C3C5C6] cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmarQuitar(true)}
                  className="inline-flex items-center min-h-11 text-[15px] font-normal text-[#C3C5C6] hover:text-white underline-offset-4 hover:underline cursor-pointer"
                >
                  Quitar el pase de este celular
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
};
