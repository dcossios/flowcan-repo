import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loader2, RefreshCw } from 'lucide-react';
import { AppShell, mensajeErrorPasajero } from '../components/AppShell';
import { PasoLinea } from '../components/PasoLinea';
import { Alcance, Bajada, IdentidadVehiculo, PanelCrema, Pasaje, Titulo } from '../components/Sistema';
import { rutaConFlechas } from '../lib/rutas';
import {
  clearPaseToken,
  ErrorCode,
  fetchVehiculo,
  getFriendlyErrorMessage,
  isUiPreviewMode,
  pagarViaje,
  ReciboViaje,
  setUiPreviewMode,
  SubaseApiError,
  VehiculoInfo,
} from '../lib/api';
import { formatCOP } from '../lib/format';
import { playPaymentChime, unlockAudio } from '../lib/sound';
import { guardarUltimoVehiculo } from '../lib/ultimoVehiculo';

function extraerReciboDuplicado(details: unknown): ReciboViaje | null {
  if (!details || typeof details !== 'object') return null;
  const root = details as Record<string, unknown>;
  const errorObj =
    root.error && typeof root.error === 'object'
      ? (root.error as Record<string, unknown>)
      : null;
  const candidatos: unknown[] = [
    root.recibo,
    errorObj?.recibo,
    errorObj?.details,
    root.details,
    details,
    errorObj,
  ];
  for (const candidato of candidatos) {
    if (candidato && typeof candidato === 'object' && 'viajeId' in candidato) {
      const id = (candidato as { viajeId: unknown }).viajeId;
      if (typeof id === 'string' && id.length > 0) {
        return candidato as ReciboViaje;
      }
    }
  }
  return null;
}

// La billetera del pase, corta: «pasajero» en la Test Wallet y «proveedor/nombre» en otra.
function billeteraCorta(): string {
  try {
    const m = (localStorage.getItem('subase_last_wallet') || '').match(/^https?:\/\/([^/]+)\/(.+)$/);
    if (!m) return '';
    return m[1] === 'ilp.interledger-test.dev' ? m[2] : `${m[1]}/${m[2]}`;
  } catch {
    return '';
  }
}

export const VehiculoCobroPage: React.FC = () => {
  const { vehiculoId = 'bus-01' } = useParams<{ vehiculoId: string }>();
  const navigate = useNavigate();
  const isDev = import.meta.env.DEV;

  const [vehiculo, setVehiculo] = useState<VehiculoInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [paying, setPaying] = useState<boolean>(false);
  const [errorInfo, setErrorInfo] = useState<{ code: ErrorCode; message: string } | null>(
    null
  );

  const cargarVehiculo = useCallback(async () => {
    setLoading(true);
    setErrorInfo(null);
    try {
      const data = await fetchVehiculo(vehiculoId);
      setVehiculo(data);
      guardarUltimoVehiculo({
        id: data.id,
        nombre: data.nombre,
        ruta: data.ruta,
        tarifa: data.tarifa,
      });
    } catch (err) {
      const friendly = getFriendlyErrorMessage(err);
      setErrorInfo({
        code: friendly.code,
        message: mensajeErrorPasajero(friendly.code, friendly.message),
      });
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
      if (err instanceof SubaseApiError && err.code === 'PAGO_DUPLICADO') {
        const recibo = extraerReciboDuplicado(err.details);
        if (recibo?.viajeId) {
          navigate(`/recibo/${encodeURIComponent(recibo.viajeId)}`, {
            state: { recibo },
          });
          return;
        }
        setErrorInfo({
          code: 'PAGO_DUPLICADO',
          message: 'Ya pagó este bus hace menos de 2 minutos. No le cobramos dos veces.',
        });
        return;
      }
      const friendly = getFriendlyErrorMessage(err);
      setErrorInfo({
        code: friendly.code,
        message: mensajeErrorPasajero(friendly.code, friendly.message),
      });
    } finally {
      setPaying(false);
    }
  };

  const handleCambiarPase = () => {
    clearPaseToken();
    navigate(`/pase/activar?volver=${encodeURIComponent(`/v/${vehiculoId}`)}`);
  };

  const cargaFallida = !loading && !vehiculo;
  const paseActivo = Boolean(vehiculo?.paseActivo);
  const disponibleHoy = vehiculo?.disponibleHoy ?? 0;
  const topeDiario = vehiculo?.topeDiario ?? 20000;
  const billetera = billeteraCorta();
  return (
    <AppShell
      vehiculoIdActual={vehiculoId}
      barraFija={!loading && vehiculo ? (paseActivo ? 'alta' : true) : false}
      fondo="crema"
    >
      <div className="flex-1 flex flex-col">
        <PanelCrema>
          {vehiculo ? (
            <>
              <IdentidadVehiculo vehiculoId={vehiculo.id} nombre={vehiculo.nombre} />
              {/* La ruta es el titular: confirma «es mi bus». «Pague su pasaje» repetía el botón «Pagar $3.200» */}
              <Titulo className="mt-4">{rutaConFlechas(vehiculo.ruta)}</Titulo>
              <Pasaje monto={vehiculo.tarifa} className="mt-5" />
              {/* ¿Me alcanza? Se responde aquí, antes del botón, y no abajo en el negro */}
              {paseActivo && (
                <Alcance disponible={disponibleHoy} tope={topeDiario} tarifa={vehiculo.tarifa} className="mt-5" />
              )}
            </>
          ) : cargaFallida ? (
            <>
              <Titulo>No pudimos cargar el vehículo</Titulo>
              {errorInfo && <Bajada className="mt-2.5">{errorInfo.message}</Bajada>}
            </>
          ) : (
            <div className="flex items-center gap-3 py-4">
              <Loader2 className="w-6 h-6 animate-spin" strokeWidth={1.5} />
              <Bajada>Consultando el pasaje…</Bajada>
            </div>
          )}
        </PanelCrema>

        {cargaFallida && errorInfo && (
          <div className="mt-6 flex-1 flex flex-col">
            <div className="flex flex-col gap-3">
              <button type="button" onClick={cargarVehiculo} className="subase-btn-primary subase-btn-tinta">
                <RefreshCw className="w-5 h-5" strokeWidth={1.5} />
                Reintentar
              </button>
              {isDev && errorInfo.code === 'BACKEND_OFFLINE' && (
                <button
                  type="button"
                  onClick={() => {
                    setUiPreviewMode(true);
                    cargarVehiculo();
                  }}
                  className="min-h-11 px-4 rounded-[12px] border border-[rgba(30,34,48,0.3)] text-[16px] font-medium cursor-pointer"
                >
                  Activar Vista Previa UI
                </button>
              )}
            </div>
            <p className="text-[13px] font-normal text-[#3A3F4E] mt-8">{errorInfo.code}</p>
          </div>
        )}

        {!loading && vehiculo && (
          <>
            {!paseActivo && (
              <div className="mt-6">
                <PasoLinea paso={1} tono="crema" />
              </div>
            )}

            {errorInfo && (
              <div role="alert" className="mt-6">
                <p className="text-[16px] font-medium leading-relaxed">{errorInfo.message}</p>
                {(errorInfo.code === 'PASE_INVALIDO' ||
                  errorInfo.code === 'PASE_VENCIDO' ||
                  errorInfo.code === 'TOPE_ALCANZADO') && (
                  <Link
                    to={`/pase/activar?volver=${encodeURIComponent(`/v/${vehiculoId}`)}`}
                    className="inline-flex items-center min-h-11 mt-2 text-[16px] font-medium underline"
                  >
                    Activar o ampliar pase
                  </Link>
                )}
                {isDev && errorInfo.code === 'BACKEND_OFFLINE' && (
                  <button
                    type="button"
                    onClick={() => {
                      setUiPreviewMode(true);
                      cargarVehiculo();
                    }}
                    className="mt-3 min-h-11 px-4 rounded-[12px] border border-[rgba(30,34,48,0.3)] text-[16px] font-medium cursor-pointer"
                  >
                    Activar Vista Previa UI
                  </button>
                )}
                <p className="text-[13px] font-normal text-[#3A3F4E] mt-3">{errorInfo.code}</p>
              </div>
            )}

            {/* Atajos de la demo: no los ve el pasajero real */}
            {(isDev || isUiPreviewMode()) && (
              <div className="mt-8 flex items-center justify-between gap-3">
                <span className="text-[13px] font-normal text-[#3A3F4E] whitespace-nowrap">Rutas piloto</span>
                <div className="flex items-center gap-1">
                  {['bus-01', 'bus-02', 'taxi-01'].map((id) => (
                    <Link
                      key={id}
                      to={`/v/${id}`}
                      className={`inline-flex items-center justify-center min-h-11 px-2 text-[13px] font-normal whitespace-nowrap ${
                        id === vehiculoId ? 'font-semibold text-[#1E2230]' : 'text-[#3A3F4E]'
                      }`}
                    >
                      {id}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {!loading && vehiculo && (
        <div className="subase-fixed-bar">
          <div className="subase-fixed-bar-inner">
            {/* Con qué paga, pegado al botón, como el medio de pago encima de «Pide aquí» en DiDi */}
            {paseActivo && (
              <div className="flex items-center justify-between gap-3 -mt-1 mb-1.5">
                <p className="min-w-0 truncate text-[14px] text-[#C3C5C6]">
                  {billetera ? (
                    <>
                      Su pase: <span className="font-medium text-white">{billetera}</span>
                    </>
                  ) : (
                    'Paga con su pase'
                  )}
                </p>
                <button
                  type="button"
                  onClick={handleCambiarPase}
                  className="shrink-0 inline-flex items-center min-h-11 px-1 text-[14px] text-[#C3C5C6] underline underline-offset-2 hover:text-white cursor-pointer"
                >
                  Cambiar
                </button>
              </div>
            )}
            {paseActivo ? (
              <button
                type="button"
                disabled={paying}
                onClick={handlePagar}
                className={`subase-btn-primary ${paying ? '' : 'subase-btn-flecha'}`}
              >
                {paying ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
                    Pagando…
                  </>
                ) : (
                  `Pagar ${formatCOP(vehiculo.tarifa)}`
                )}
              </button>
            ) : (
              <Link
                to={`/pase/activar?volver=${encodeURIComponent(`/v/${vehiculoId}`)}`}
                className="subase-btn-primary subase-btn-flecha"
              >
                Activar pase y pagar
              </Link>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
};
