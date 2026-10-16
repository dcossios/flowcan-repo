import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { CircleCheck } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import {
  FeedItem,
  fetchVehiculo,
  fetchVehiculoFeed,
  setUiPreviewMode,
  SubaseApiError,
  VehiculoInfo,
} from '../lib/api';
import { formatCOP, formatHora } from '../lib/format';
import { anunciarPago, desbloquearVoz, playPaymentChime, unlockAudio } from '../lib/sound';

export const ConductorPage: React.FC = () => {
  const { vehiculoId = 'bus-01' } = useParams<{ vehiculoId: string }>();

  const [vehiculo, setVehiculo] = useState<VehiculoInfo | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [turnoIniciado, setTurnoIniciado] = useState<boolean>(false);
  const [ultimoPagoAlerta, setUltimoPagoAlerta] = useState<FeedItem | null>(null);
  const [backendOffline, setBackendOffline] = useState<boolean>(false);

  const seenStatesRef = useRef<Map<string, string>>(new Map());
  const initialLoadDoneRef = useRef<boolean>(false);

  const qrTargetUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/v/${vehiculoId}`
      : `/v/${vehiculoId}`;

  useEffect(() => {
    seenStatesRef.current.clear();
    initialLoadDoneRef.current = false;
    setFeed([]);
    setUltimoPagoAlerta(null);

    fetchVehiculo(vehiculoId)
      .then((data) => {
        setVehiculo(data);
        setBackendOffline(false);
      })
      .catch((err) => {
        if (err instanceof SubaseApiError && err.code === 'BACKEND_OFFLINE') {
          setBackendOffline(true);
        }
      });
  }, [vehiculoId]);

  const consultarFeed = useCallback(async () => {
    try {
      const items = await fetchVehiculoFeed(vehiculoId);
      setBackendOffline(false);

      if (!Array.isArray(items)) return;

      if (!initialLoadDoneRef.current) {
        for (const item of items) {
          seenStatesRef.current.set(item.viajeId, item.estado);
        }
        initialLoadDoneRef.current = true;
        setFeed(items);
        return;
      }

      const nuevosPagados: FeedItem[] = [];
      let huboCambios = false;

      for (const item of items) {
        const estadoPrevio = seenStatesRef.current.get(item.viajeId);
        if (estadoPrevio !== item.estado) {
          huboCambios = true;
          seenStatesRef.current.set(item.viajeId, item.estado);
          if (item.estado === 'pagado') {
            nuevosPagados.push(item);
          }
        }
      }

      if (huboCambios) {
        setFeed((prev) => {
          const map = new Map<string, FeedItem>();
          for (const it of items) {
            map.set(it.viajeId, it);
          }
          for (const it of prev) {
            if (!map.has(it.viajeId)) {
              map.set(it.viajeId, it);
            }
          }
          return Array.from(map.values());
        });
      }

      if (nuevosPagados.length > 0) {
        const masReciente = nuevosPagados[0];
        setUltimoPagoAlerta(masReciente);
        playPaymentChime();
        anunciarPago(masReciente.monto);
      }
    } catch (err) {
      if (err instanceof SubaseApiError && err.code === 'BACKEND_OFFLINE') {
        setBackendOffline(true);
      }
    }
  }, [vehiculoId]);

  useEffect(() => {
    consultarFeed();
    const intervalId = window.setInterval(consultarFeed, 2000);
    return () => window.clearInterval(intervalId);
  }, [consultarFeed]);

  useEffect(() => {
    if (!ultimoPagoAlerta) return;
    const t = window.setTimeout(() => setUltimoPagoAlerta(null), 3000);
    return () => window.clearTimeout(t);
  }, [ultimoPagoAlerta]);

  const handleEmpezarTurno = () => {
    unlockAudio();
    desbloquearVoz();
    setTurnoIniciado(true);
  };

  const nombreVehiculo = vehiculo ? vehiculo.nombre : `Vehículo ${vehiculoId.toUpperCase()}`;
  const pagosConfirmados = feed.filter((item) => item.estado === 'pagado');
  const totalRecaudado = pagosConfirmados.reduce((acc, item) => acc + (Number(item.monto) || 0), 0);
  const totalPasajeros = pagosConfirmados.length;

  return (
    <AppShell
      vehiculoIdActual={vehiculoId}
      subtitle="El celular del conductor es el terminal."
      rol="conductor"
    >
      {/* Capa inicial para empezar turno y habilitar audio + voz */}
      {!turnoIniciado && (
        <div className="fixed inset-0 z-50 bg-[#000000] flex flex-col items-center justify-center px-6 text-center font-normal">
          <div className="max-w-md w-full space-y-6">
            <div>
              <h1 className="text-[28px] font-light text-white leading-snug">
                Terminal de {nombreVehiculo}
              </h1>
              <div className="subase-sand-rule mx-auto mt-3" />
            </div>

            <p className="text-[16px] font-normal text-[#C3C5C6] leading-relaxed">
              Toque para empezar. Cada pago va a sonar y se va a anunciar en voz alta.
            </p>

            <button
              type="button"
              onClick={handleEmpezarTurno}
              className="w-full h-[64px] min-h-[64px] rounded-[12px] bg-[#113462] text-white text-[20px] font-normal px-6 cursor-pointer"
            >
              Empezar turno
            </button>
          </div>
        </div>
      )}

      {/* Capa fija a pantalla completa durante 3 segundos cuando se confirma un pago */}
      {ultimoPagoAlerta && (
        <div
          role="status"
          aria-live="assertive"
          onClick={() => setUltimoPagoAlerta(null)}
          className="fixed inset-0 z-40 bg-[#000000] border-2 border-[#D2B99A] flex flex-col items-center justify-center px-6 text-center cursor-pointer font-normal"
        >
          <CircleCheck className="w-24 h-24 text-[#D2B99A] mb-6 shrink-0" size={96} strokeWidth={1.5} />
          <p className="text-[64px] leading-none font-light text-white">Pagado</p>
          <p className="text-[44px] min-[400px]:text-[56px] leading-none font-light text-white mt-4 tabular-nums">
            {formatCOP(ultimoPagoAlerta.monto)}
          </p>
          <p className="text-[18px] font-normal text-[#C3C5C6] mt-4">
            {formatHora(ultimoPagoAlerta.fecha)}
          </p>
        </div>
      )}

      <div className="space-y-6 font-normal">
        {/* Encabezado del vehículo */}
        <div>
          <h1 className="text-[24px] font-light text-white">
            {nombreVehiculo}
          </h1>
          <div className="subase-sand-rule mt-2" />
          {vehiculo?.ruta && (
            <p className="text-[15px] font-normal text-[#C3C5C6] mt-2">
              {vehiculo.ruta} · Tarifa {formatCOP(vehiculo.tarifa)}
            </p>
          )}
        </div>

        {/* Aviso si el servidor no responde */}
        {backendOffline && (
          <div className="subase-card-sand p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-[15px] font-normal text-[#C3C5C6]">
              El servidor de Súbase no responde. Intente de nuevo en unos segundos.
            </span>
            {import.meta.env.DEV && (
              <button
                type="button"
                onClick={() => {
                  setUiPreviewMode(true);
                  window.location.reload();
                }}
                className="min-h-[48px] px-4 py-2.5 rounded-[12px] bg-[#113462] border border-[#D2B99A] text-white text-[15px] font-normal shrink-0 cursor-pointer"
              >
                Vista Previa
              </button>
            )}
          </div>
        )}

        {/* Pasajes del turno y Recaudo arriba, antes del QR, en dos columnas sin tarjeta anidada */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[15px] font-normal text-[#C3C5C6]">Pasajes del turno</p>
            <p className="text-[36px] min-[400px]:text-[48px] leading-tight font-light text-white mt-1 tabular-nums">
              {totalPasajeros}
            </p>
          </div>

          <div>
            <p className="text-[15px] font-normal text-[#C3C5C6]">Recaudo</p>
            <p className="text-[36px] min-[400px]:text-[48px] leading-tight font-light text-white mt-1 tabular-nums break-words">
              {formatCOP(totalRecaudado)}
            </p>
          </div>
        </div>

        {/* QR con al menos 16px de margen blanco alrededor */}
        <div className="subase-card p-4 min-[400px]:p-6 text-center">
          <div className="bg-white p-4 min-[400px]:p-5 rounded-[12px] mx-auto w-full max-w-[280px] aspect-square">
            <QRCodeSVG
              value={qrTargetUrl}
              size={512}
              style={{ width: '100%', height: '100%' }}
              level="M"
              includeMargin={false}
              bgColor="#FFFFFF"
              fgColor="#000000"
            />
          </div>

          <p className="mt-4 text-[17px] font-normal text-white">
            Escanee para pagar · {vehiculo ? formatCOP(vehiculo.tarifa) : '$3.200'}
          </p>
        </div>

        {/* Listado de pagos de este turno */}
        <div className="subase-card p-5">
          <h2 className="text-[18px] font-normal text-white mb-3">
            Pagos de este turno
          </h2>

          {feed.length === 0 ? (
            <div className="py-6 text-center border-t subase-divider">
              <p className="text-[16px] font-normal text-[#C3C5C6]">
                Aún no hay pagos en este turno.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[#C3C5C6]/20 border-t subase-divider">
              {feed.map((item) => {
                const esPendiente = item.estado === 'pendiente';
                const esFallido = item.estado === 'fallido';

                return (
                  <li
                    key={item.viajeId}
                    className={`py-3 px-2 flex items-center justify-between gap-3 text-[16px] font-normal ${
                      esPendiente || esFallido ? 'text-[#C3C5C6]' : 'text-white'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>{formatHora(item.fecha)}</span>
                      <span className="text-[#C3C5C6]">· N.º {item.viajeId.slice(0, 8)}</span>
                      {esPendiente && (
                        <span className="text-[#C3C5C6]">· Confirmando…</span>
                      )}
                      {esFallido && (
                        <span className="text-[#C3C5C6]">· Pago fallido</span>
                      )}
                    </div>
                    <span className="shrink-0">{formatCOP(item.monto)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
};

