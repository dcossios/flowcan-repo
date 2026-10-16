import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Bus,
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import {
  clearPaseToken,
  ErrorCode,
  fetchVehiculo,
  getFriendlyErrorMessage,
  getPaseToken,
  pagarViaje,
  setUiPreviewMode,
  VehiculoInfo,
} from '../lib/api';
import { formatCOP } from '../lib/format';
import { playPaymentChime, unlockAudio } from '../lib/sound';

export const VehiculoCobroPage: React.FC = () => {
  const { vehiculoId = 'bus-101' } = useParams<{ vehiculoId: string }>();
  const navigate = useNavigate();

  const [vehiculo, setVehiculo] = useState<VehiculoInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [paying, setPaying] = useState<boolean>(false);
  const [errorInfo, setErrorInfo] = useState<{ code: ErrorCode; message: string } | null>(null);

  const cargarVehiculo = useCallback(async () => {
    setLoading(true);
    setErrorInfo(null);
    try {
      const data = await fetchVehiculo(vehiculoId);
      setVehiculo(data);
    } catch (err) {
      setErrorInfo(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [vehiculoId]);

  useEffect(() => {
    cargarVehiculo();
  }, [cargarVehiculo]);

  const handlePagar = async () => {
    if (!vehiculo || paying) return;
    unlockAudio();
    setPaying(true);
    setErrorInfo(null);

    try {
      const recibo = await pagarViaje(vehiculo.id);
      playPaymentChime();
      navigate(`/recibo/${encodeURIComponent(recibo.viajeId)}`, {
        state: { recibo, vehiculo },
      });
    } catch (err) {
      setErrorInfo(getFriendlyErrorMessage(err));
    } finally {
      setPaying(false);
    }
  };

  const handleCambiarPase = () => {
    clearPaseToken();
    navigate(`/pase/activar?volver=${encodeURIComponent(`/v/${vehiculoId}`)}`);
  };

  const tieneTokenLocal = Boolean(getPaseToken());
  const paseActivo = Boolean(vehiculo?.paseActivo);
  const disponibleHoy = vehiculo?.disponibleHoy ?? 0;
  const topeDiario = vehiculo?.topeDiario ?? 20000;
  const porcentajeDisponible =
    topeDiario > 0 ? Math.min(100, Math.max(0, Math.round((disponibleHoy / topeDiario) * 100))) : 0;

  return (
    <AppShell vehiculoIdActual={vehiculoId}>
      <div className="flex-1 flex flex-col justify-between gap-6">
        {/* Encabezado alineado a la izquierda con subrayado corto de arena (#D2B99A, 45x3 px) */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-light uppercase tracking-[0.16em] text-[#D2B99A]">
              SOLICITUD Y EJECUCIÓN · QR VEHÍCULO
            </span>
            <span className="text-xs font-mono text-[#C3C5C6] border border-white/25 rounded-[12px] px-2.5 py-0.5">
              {vehiculoId}
            </span>
          </div>

          <h1 className="text-3xl font-light uppercase tracking-wide text-white leading-tight">
            {vehiculo ? vehiculo.nombre : 'CARGANDO VEHÍCULO'}
          </h1>
          <div className="subase-sand-rule mt-2.5" />

          {vehiculo?.ruta && (
            <p className="text-sm font-light text-[#C3C5C6] mt-3">{vehiculo.ruta}</p>
          )}
        </div>

        {/* Estado de carga */}
        {loading && (
          <div className="subase-card p-8 flex flex-col items-center justify-center text-center my-auto">
            <Loader2 className="w-8 h-8 text-[#D2B99A] animate-spin mb-3" strokeWidth={1.5} />
            <p className="text-base font-normal uppercase tracking-wider text-white">
              Consultando tarifa del vehículo
            </p>
            <p className="text-xs font-light text-[#C3C5C6] mt-1">
              Verificando grant preautorizado en Súbase…
            </p>
          </div>
        )}

        {/* Alerta de error con contraste alto sobre negro */}
        {!loading && errorInfo && (
          <div role="alert" className="subase-card-sand p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#D2B99A] shrink-0 mt-0.5" strokeWidth={1.5} />
              <div className="flex-1">
                <p className="text-xs font-mono uppercase tracking-wider text-[#D2B99A]">
                  {errorInfo.code}
                </p>
                <p className="text-sm font-light text-white mt-1 leading-relaxed">
                  {errorInfo.message}
                </p>

                <div className="mt-4 flex flex-wrap gap-2.5">
                  {(errorInfo.code === 'PASE_INVALIDO' ||
                    errorInfo.code === 'PASE_VENCIDO' ||
                    errorInfo.code === 'TOPE_ALCANZADO') && (
                    <Link
                      to={`/pase/activar?volver=${encodeURIComponent(`/v/${vehiculoId}`)}`}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[12px] bg-[#113462] border border-white/40 text-white text-xs font-normal uppercase tracking-wider min-h-10"
                    >
                      Activar o ampliar pase
                    </Link>
                  )}

                  {errorInfo.code === 'BACKEND_OFFLINE' && (
                    <button
                      type="button"
                      onClick={() => {
                        setUiPreviewMode(true);
                        cargarVehiculo();
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[12px] bg-[#113462] hover:bg-[#0C4672] border border-[#D2B99A] text-white text-xs font-normal uppercase tracking-wider transition-colors cursor-pointer min-h-10"
                    >
                      Activar Vista Previa UI (Mock)
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={cargarVehiculo}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-[12px] border border-white/30 hover:border-white text-[#C3C5C6] hover:text-white text-xs font-normal uppercase tracking-wider transition-colors cursor-pointer min-h-10"
                  >
                    <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Reintentar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bloque central: Cifra destacada + Pase */}
        {!loading && vehiculo && (
          <div className="space-y-4 my-auto">
            {/* Tarjeta de tarifa con borde de 1 px y radio 12 px (Sección 04) */}
            <div className="subase-card p-6">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-light uppercase tracking-[0.15em] text-[#D2B99A]">
                  01 · TARIFA DEL PASAJE
                </span>
                <span className="text-xs font-light uppercase tracking-wider text-[#D2B99A] border border-[#D2B99A]/50 rounded-[12px] px-2.5 py-0.5">
                  CASHBACK +{formatCOP(Math.round(vehiculo.tarifa * 0.02))}
                </span>
              </div>

              <div className="mt-4 flex items-baseline gap-2.5">
                <span
                  className="font-light tracking-tight text-white leading-none"
                  style={{ fontSize: 'clamp(2.75rem, 2rem + 4vw, 3.75rem)' }}
                >
                  {formatCOP(vehiculo.tarifa)}
                </span>
                <span className="text-sm font-light uppercase tracking-widest text-[#C3C5C6]">
                  {vehiculo.moneda || 'COP'}
                </span>
              </div>

              <hr className="subase-divider my-4" />

              <p className="text-xs font-light text-[#C3C5C6] leading-relaxed">
                Incoming Payment en la wallet del vehículo · Outgoing Payment bajo tu grant diario.
              </p>
            </div>

            {/* Estado del Pase preautorizado (GNAP) */}
            {paseActivo ? (
              <div className="subase-card p-5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-xs font-light uppercase tracking-[0.14em] text-[#D2B99A]">
                    <CheckCircle2 className="w-4 h-4 text-[#D2B99A]" strokeWidth={1.5} />
                    02 · PASE PREAUTORIZADO ACTIVO
                  </span>
                  <button
                    type="button"
                    onClick={handleCambiarPase}
                    className="text-xs font-normal text-[#C3C5C6] hover:text-white underline min-h-0 py-1 px-1 cursor-pointer"
                  >
                    Cambiar pase
                  </button>
                </div>

                <div className="flex items-baseline justify-between mt-3">
                  <div>
                    <p className="text-xs font-light text-[#C3C5C6]">Disponible hoy</p>
                    <p className="text-2xl font-light text-white mt-0.5">
                      {formatCOP(disponibleHoy)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-light text-[#C3C5C6]">Límite diario</p>
                    <p className="text-sm font-normal text-[#C3C5C6] mt-0.5">
                      {formatCOP(topeDiario)}
                    </p>
                  </div>
                </div>

                {/* Barra de cupo minimalista con píldora arena */}
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-3">
                  <div
                    className="h-full bg-[#D2B99A] rounded-full transition-all duration-300"
                    style={{ width: `${porcentajeDisponible}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="subase-card p-5">
                <div className="flex items-start gap-3.5">
                  <CreditCard className="w-6 h-6 text-[#D2B99A] shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <span className="text-xs font-light uppercase tracking-[0.14em] text-[#D2B99A]">
                      02 · AUTORIZACIÓN · UNA VEZ
                    </span>
                    <h2 className="text-base font-normal uppercase tracking-wide text-white mt-1">
                      {tieneTokenLocal ? 'Reactiva tu pase' : 'Activa tu pase'}
                    </h2>
                    <p className="text-xs font-light text-[#C3C5C6] mt-1 leading-relaxed">
                      Una sola vez: autorizas un límite diario (p. ej. $20.000 por 30 días) en tu
                      wallet y pagas cada abordaje con un toque.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Botón de acción principal en Azul Marino #113462 con texto Blanco #FFFFFF (Contraste 12.4:1) */}
        {!loading && vehiculo && (
          <div className="pt-2 space-y-3">
            {paseActivo ? (
              <button
                type="button"
                disabled={paying}
                onClick={handlePagar}
                className="w-full py-4 px-6 rounded-[12px] bg-[#113462] hover:bg-[#0C4672] active:scale-[0.99] disabled:opacity-50 border border-white/40 text-white font-normal uppercase tracking-[0.1em] text-base flex items-center justify-center gap-3 transition-all cursor-pointer"
              >
                {paying ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-[#D2B99A]" strokeWidth={1.5} />
                    <span>EJECUTANDO PAGO…</span>
                  </>
                ) : (
                  <>
                    <Bus className="w-5 h-5 text-[#D2B99A]" strokeWidth={1.5} />
                    <span>PAGAR {formatCOP(vehiculo.tarifa)}</span>
                    <ArrowRight className="w-5 h-5 text-[#D2B99A]" strokeWidth={1.5} />
                  </>
                )}
              </button>
            ) : (
              <Link
                to={`/pase/activar?volver=${encodeURIComponent(`/v/${vehiculoId}`)}`}
                className="w-full py-4 px-6 rounded-[12px] bg-[#113462] hover:bg-[#0C4672] active:scale-[0.99] border border-white/40 text-white font-normal uppercase tracking-[0.1em] text-sm sm:text-base flex items-center justify-center gap-3 transition-all min-h-14"
              >
                <ShieldCheck className="w-5 h-5 text-[#D2B99A] shrink-0" strokeWidth={1.5} />
                <span>ACTIVAR PASE · PAGAR {formatCOP(vehiculo.tarifa)}</span>
                <ArrowRight className="w-5 h-5 text-[#D2B99A] shrink-0" strokeWidth={1.5} />
              </Link>
            )}

            {/* Selector de vehículos de prueba con estética sobria */}
            <div className="pt-1 flex items-center justify-between text-xs text-[#C3C5C6] border-t border-[#C3C5C6]/15">
              <span className="font-light">Rutas piloto:</span>
              <div className="flex items-center gap-1.5 pt-2">
                {['bus-101', 'bus-204', 'taxi-88'].map((id) => (
                  <Link
                    key={id}
                    to={`/v/${id}`}
                    className={`px-2.5 py-1 rounded-[8px] font-mono text-xs transition-colors min-h-0 ${
                      id === vehiculoId
                        ? 'bg-[#113462] text-white border border-[#D2B99A]'
                        : 'border border-white/20 text-[#C3C5C6] hover:text-white'
                    }`}
                  >
                    {id}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};
