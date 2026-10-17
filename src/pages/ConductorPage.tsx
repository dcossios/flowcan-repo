import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { AppShell } from '../components/AppShell';
import { Bajada, CREMA, ETIQUETA, FichaEstado, IdentidadVehiculo, PanelCrema, Pasaje, TINTA, Titulo } from '../components/Sistema';
import { PanelEscena } from '../components/EscenaInicio';
import { coloresDeRuta, nombreDesdeId } from '../lib/rutas';
import {
  FeedItem,
  fetchVehiculo,
  fetchVehiculoFeed,
  setUiPreviewMode,
  SubaseApiError,
  VehiculoInfo,
} from '../lib/api';
import { formatCOP, formatHora, formatHoraCorta } from '../lib/format';
import { anunciarPago, desbloquearVoz, playPaymentChime, unlockAudio } from '../lib/sound';

// Línea de metro con sus estaciones repartidas a lo ancho
const LineaParadas: React.FC<{ ruta: string; vehiculoId?: string; className?: string }> = ({
  ruta,
  vehiculoId,
  className = '',
}) => {
  const paradas = ruta.split(/\s+[–—·-]\s+/).filter(Boolean);
  if (paradas.length === 0) return null;
  const { color } = coloresDeRuta(vehiculoId);
  const ANCHO = 280;
  const ALTO = 24;
  const PAD = 12;
  const R = 8;
  const y = ALTO / 2;

  return (
    <div className={className}>
      <svg
        aria-hidden="true"
        width={ANCHO}
        height={ALTO}
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="block w-full h-auto"
      >
        <line x1={PAD} y1={y} x2={ANCHO - PAD} y2={y} stroke={color} strokeWidth={8} strokeLinecap="round" />
        {paradas.map((_, i) => {
          const x =
            paradas.length === 1
              ? ANCHO / 2
              : PAD + (i * (ANCHO - 2 * PAD)) / (paradas.length - 1);
          return <circle key={i} cx={x} cy={y} r={R} fill="#FFFFFF" stroke={TINTA} strokeWidth={3} />;
        })}
      </svg>
      <div
        className="mt-1.5 grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${paradas.length}, minmax(0, 1fr))` }}
      >
        {paradas.map((parada, i) => {
          const esExtremo = i === 0 || i === paradas.length - 1;
          const alineacion =
            paradas.length === 1
              ? 'text-center'
              : i === 0
                ? 'text-left'
                : i === paradas.length - 1
                  ? 'text-right'
                  : 'text-center';
          return (
            <span
              key={i}
              className={`${ETIQUETA} ${esExtremo ? '!font-semibold' : ''} ${alineacion} text-[#1E2230] leading-tight break-words`}
            >
              {parada}
            </span>
          );
        })}
      </div>
    </div>
  );
};

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

  // Mientras una capa ocupa toda la pantalla («Empezar turno» o «Pagado»), la página de atrás no se mueve:
  // si no, en el celular el gesto la desplaza por detrás y al cerrar la capa queda en otra posición.
  const capaVisible = !turnoIniciado || Boolean(ultimoPagoAlerta);
  useEffect(() => {
    if (!capaVisible) return;
    const html = document.documentElement;
    const previo = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = previo;
    };
  }, [capaVisible]);

  const handleEmpezarTurno = () => {
    unlockAudio();
    desbloquearVoz();
    setTurnoIniciado(true);
  };

  const nombreVehiculo = vehiculo ? vehiculo.nombre : nombreDesdeId(vehiculoId);
  const numeroVehiculo = nombreVehiculo.split(/\s+[—–-]\s+/)[0];
  const rutaVehiculo = vehiculo?.ruta || 'Poblado – Centro – Laureles';
  const tarifaVehiculo = vehiculo ? vehiculo.tarifa : 3200;
  const pagosConfirmados = feed.filter((item) => item.estado === 'pagado');
  const totalRecaudado = pagosConfirmados.reduce((acc, item) => acc + (Number(item.monto) || 0), 0);
  const totalPasajeros = pagosConfirmados.length;
  const ultimoPago = pagosConfirmados.reduce<FeedItem | null>(
    (ultimo, item) => (!ultimo || new Date(item.fecha) > new Date(ultimo.fecha) ? item : ultimo),
    null
  );

  return (
    <AppShell
      vehiculoIdActual={vehiculoId}
      subtitle="El celular del conductor es el terminal."
      rol="conductor"
      fondo="crema"
      ancho="amplio"
    >
      {/* Capa inicial para empezar turno y habilitar audio + voz */}
      {/* Las capas a pantalla completa van al body: dentro de <main> quedarían bajo el encabezado */}
      {!turnoIniciado &&
        createPortal(
        <div className="fixed inset-0 z-50 bg-black flex flex-col font-normal">
          {/* Como la portada de referencia: el bus y la acción sobre el crema, la escena hasta el borde y el botón
              blanco flotando sobre la calle */}
          <div className="w-full max-w-lg mx-auto px-5 pt-6 flex-1 flex flex-col min-h-0">
            <PanelEscena vehiculoId={vehiculoId} letrero={vehiculo?.ruta ?? ''} llenar>
              <IdentidadVehiculo vehiculoId={vehiculoId} nombre={nombreVehiculo} />
              <Titulo className="mt-4">Terminal del {numeroVehiculo}</Titulo>
              <Bajada className="mt-2.5">Toque para empezar. Cada pago va a sonar y se va a anunciar en voz alta.</Bajada>
            </PanelEscena>
          </div>
          <div className="absolute inset-x-0 bottom-0 z-10">
            <div className="max-w-lg mx-auto px-5 pb-[calc(24px+env(safe-area-inset-bottom,0px))]">
              <button type="button" onClick={handleEmpezarTurno} className="subase-btn-primary subase-btn-flecha">
                Empezar turno
              </button>
            </div>
          </div>
        </div>,
          document.body
        )}

      {/* Capa fija a pantalla completa durante 3 segundos cuando se confirma un pago */}
      {ultimoPagoAlerta &&
        createPortal(
        <div
          role="status"
          aria-live="assertive"
          onClick={() => setUltimoPagoAlerta(null)}
          className="fixed inset-0 z-40 flex flex-col items-center justify-center px-6 text-center cursor-pointer font-normal overscroll-none touch-none text-[#1E2230]"
          style={{ backgroundColor: CREMA }}
        >
          {/* Crema y tinta: se lee de lejos, de día y de noche */}
          <FichaEstado estado="pagado" tamano={96} className="mb-6" />
          <p className="text-[64px] leading-none font-semibold tracking-[-0.01em]">Pagado</p>
          <p
            className="inline-flex mt-5 rounded-[3px] px-5 py-3 text-[44px] min-[400px]:text-[56px] leading-none font-semibold text-white tabular-nums"
            style={{ backgroundColor: TINTA }}
          >
            {formatCOP(ultimoPagoAlerta.monto)}
          </p>
          <p className="text-[18px] font-normal text-[#3A3F4E] mt-4">{formatHora(ultimoPagoAlerta.fecha)}</p>
        </div>,
          document.body
        )}

      <div className="w-full max-w-lg mx-auto lg:max-w-none space-y-6 font-normal">
        {/* Lo que el conductor mira de reojo: cuánto lleva, cuántos pasajes y cuándo entró el último. Como las
            ganancias de DiDi Conductor, el monto con los viajes al lado. El pasaje baja, junto al QR */}
        <PanelCrema>
          <IdentidadVehiculo vehiculoId={vehiculoId} nombre={nombreVehiculo} />
          <h1 className="sr-only">Recaudo del turno</h1>
          <Pasaje monto={totalRecaudado} etiqueta="Recaudo del turno" grande className="mt-5" />
          <p className="mt-3 text-[17px] leading-snug">
            <span className="font-semibold tabular-nums">
              {totalPasajeros} {totalPasajeros === 1 ? 'pasaje' : 'pasajes'}
            </span>
            <span className="text-[#3A3F4E]">
              {ultimoPago ? ` · el último a las ${formatHoraCorta(ultimoPago.fecha)}` : ' · aún sin pagos'}
            </span>
          </p>
        </PanelCrema>

        {/* Aviso si el servidor no responde */}
        {backendOffline && (
          <div className="py-3 border-y border-[rgba(30,34,48,0.16)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-[15px] font-normal text-[#3A3F4E]">
              El servidor de Súbase no responde. Intente de nuevo en unos segundos.
            </span>
            {import.meta.env.DEV && (
              <button
                type="button"
                onClick={() => {
                  setUiPreviewMode(true);
                  window.location.reload();
                }}
                className="subase-btn-primary subase-btn-tinta !w-auto !min-h-11 !px-5 !text-[15px] shrink-0"
              >
                Vista Previa
              </button>
            )}
          </div>
        )}

        {/* En escritorio: placa del QR a la izquierda y tablero de llegadas a la derecha */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-8 lg:gap-10 items-start">
          {/* Placa de ruta con el QR sobre el crema */}
          <div className="w-full max-w-[280px]">
            <p className={`${ETIQUETA} text-[#3A3F4E]`}>Escanee para pagar</p>
            <div className="mt-2 bg-white p-4 rounded-[3px] w-full max-w-[280px] aspect-square">
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
            <LineaParadas ruta={rutaVehiculo} vehiculoId={vehiculoId} className="mt-4" />
            <Pasaje monto={tarifaVehiculo} moneda={vehiculo?.moneda} className="mt-5" />
          </div>

          {/* Tablero de llegadas en tinta */}
          <div className="w-full rounded-[3px] p-5 text-white" style={{ backgroundColor: TINTA }}>
            <h2 className={`${ETIQUETA} text-[#C9CCCE]`}>Llegadas del turno</h2>

            {feed.length === 0 ? (
              <div className="mt-3 pt-5 pb-2 border-t border-white/12">
                <p className="text-[16px] font-normal text-[#C9CCCE]">
                  Aún no hay pagos en este turno.
                </p>
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-white/12 border-t border-white/12">
                {feed.map((item) => {
                  const esPendiente = item.estado === 'pendiente';
                  const esFallido = item.estado === 'fallido';
                  const estadoFicha: 'pagado' | 'pendiente' | 'fallido' = esPendiente
                    ? 'pendiente'
                    : esFallido
                      ? 'fallido'
                      : 'pagado';

                  return (
                    <li
                      key={item.viajeId}
                      className="py-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5"
                    >
                      <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                        <FichaEstado estado={estadoFicha} tamano={22} />
                        <span className="font-mono text-[14px] text-white tabular-nums">
                          {formatHoraCorta(item.fecha)}
                        </span>
                        <span className="font-mono text-[14px] text-[#C9CCCE]">
                          N.º {item.viajeId.slice(0, 8)}
                        </span>
                        {esPendiente && (
                          <span className="text-[14px] font-normal text-[#C9CCCE]">Confirmando…</span>
                        )}
                        {esFallido && (
                          <span className="text-[14px] font-normal text-[#C9CCCE]">Pago fallido</span>
                        )}
                      </div>
                      <span className="text-[16px] font-semibold tabular-nums text-white shrink-0">
                        +{formatCOP(item.monto)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
};


