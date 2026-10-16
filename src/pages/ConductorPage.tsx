import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, ExternalLink, Radio, Volume2, VolumeX } from 'lucide-react';
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
import { playPaymentChime, unlockAudio } from '../lib/sound';

export const ConductorPage: React.FC = () => {
  const { vehiculoId = 'bus-101' } = useParams<{ vehiculoId: string }>();

  const [vehiculo, setVehiculo] = useState<VehiculoInfo | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [audioHabilitado, setAudioHabilitado] = useState<boolean>(false);
  const [ultimoPagoAlerta, setUltimoPagoAlerta] = useState<FeedItem | null>(null);
  const [backendOffline, setBackendOffline] = useState<boolean>(false);

  const seenIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef<boolean>(false);

  const qrTargetUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/v/${encodeURIComponent(vehiculoId)}`
      : `/v/${vehiculoId}`;

  useEffect(() => {
    seenIdsRef.current.clear();
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

      const nuevos: FeedItem[] = [];
      for (const item of items) {
        if (!seenIdsRef.current.has(item.viajeId)) {
          seenIdsRef.current.add(item.viajeId);
          nuevos.push(item);
        }
      }

      if (!initialLoadDoneRef.current) {
        initialLoadDoneRef.current = true;
        setFeed(items);
        return;
      }

      if (nuevos.length > 0) {
        const masReciente = nuevos[0];
        setUltimoPagoAlerta(masReciente);
        playPaymentChime();
        setFeed((prev) => {
          const map = new Map<string, FeedItem>();
          for (const it of [...nuevos, ...prev]) {
            map.set(it.viajeId, it);
          }
          return Array.from(map.values());
        });
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
    const t = window.setTimeout(() => setUltimoPagoAlerta(null), 6000);
    return () => window.clearTimeout(t);
  }, [ultimoPagoAlerta]);

  const handleActivarSonido = () => {
    const ok = unlockAudio();
    setAudioHabilitado(ok);
    playPaymentChime();
  };

  const totalRecaudado = feed.reduce((acc, item) => acc + (Number(item.monto) || 0), 0);
  const totalPasajeros = feed.length;

  return (
    <AppShell
      vehiculoIdActual={vehiculoId}
      subtitle="El celular del conductor es el terminal."
    >
      <div className="space-y-5">
        {/* Encabezado del conductor con subrayado corto de arena (#D2B99A) */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-light uppercase tracking-[0.16em] text-[#D2B99A]">
              <Radio className="w-3.5 h-3.5 text-[#D2B99A] animate-pulse" strokeWidth={1.5} />
              TERMINAL CONDUCTOR · {vehiculoId.toUpperCase()}
            </span>
            <h1 className="text-2xl font-light uppercase tracking-wide text-white mt-1">
              {vehiculo ? vehiculo.nombre : `VEHÍCULO ${vehiculoId}`}
            </h1>
            <div className="subase-sand-rule mt-2" />
            {vehiculo?.ruta && (
              <p className="text-xs font-light text-[#C3C5C6] mt-2">
                {vehiculo.ruta} · Tarifa {formatCOP(vehiculo.tarifa)}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleActivarSonido}
            className={`px-3.5 py-2 rounded-[12px] text-xs font-normal uppercase tracking-wider border flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer min-h-10 ${
              audioHabilitado
                ? 'bg-[#113462] border-[#D2B99A] text-white'
                : 'bg-black/60 border-white/30 text-[#C3C5C6] hover:text-white hover:border-[#D2B99A]'
            }`}
          >
            {audioHabilitado ? (
              <>
                <Volume2 className="w-4 h-4 text-[#D2B99A]" strokeWidth={1.5} />
                <span>Audio ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-[#D2B99A]" strokeWidth={1.5} />
                <span>Activar audio</span>
              </>
            )}
          </button>
        </div>

        {/* Aviso si el backend aún no responde */}
        {backendOffline && (
          <div className="subase-card-sand p-4 flex items-center justify-between gap-3 text-xs">
            <span className="font-light text-[#C3C5C6]">
              Backend <code className="font-mono text-white">/api</code> sin conexión en
              localhost:3001.
            </span>
            <button
              type="button"
              onClick={() => {
                setUiPreviewMode(true);
                window.location.reload();
              }}
              className="px-3 py-1.5 rounded-[12px] bg-[#113462] border border-[#D2B99A] text-white font-normal uppercase tracking-wider shrink-0 cursor-pointer min-h-9"
            >
              Vista Previa UI
            </button>
          </div>
        )}

        {/* Alerta en vivo cuando entra un pago nuevo */}
        {ultimoPagoAlerta && (
          <div
            role="status"
            aria-live="assertive"
            className="bg-[#113462] border border-[#D2B99A] text-white rounded-[12px] p-5 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-[#D2B99A] shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-[11px] font-light uppercase tracking-[0.16em] text-[#D2B99A]">
                  FINALIZACIÓN · EN VIVO
                </p>
                <p className="text-xl font-light uppercase tracking-wide text-white">
                  ✅ PASAJE PAGADO
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-light text-white">{formatCOP(ultimoPagoAlerta.monto)}</p>
              <p className="text-xs text-[#C3C5C6] font-mono">
                {formatHora(ultimoPagoAlerta.fecha)}
              </p>
            </div>
          </div>
        )}

        {/* Tarjeta del QR (borde fino 1px, recuadro blanco puro solo en el QR para lectura óptica) */}
        <div className="subase-card p-5 text-center">
          <div className="flex items-center justify-between text-xs font-light uppercase tracking-[0.14em] text-[#C3C5C6] mb-4">
            <span>ESCANEA CON TU CÁMARA</span>
            <span className="text-[#D2B99A]">
              {vehiculo ? formatCOP(vehiculo.tarifa) : '$3.200'}
            </span>
          </div>

          <div className="bg-white p-4 rounded-[12px] inline-flex items-center justify-center mx-auto">
            <QRCodeSVG
              value={qrTargetUrl}
              size={220}
              level="M"
              includeMargin={false}
              bgColor="#FFFFFF"
              fgColor="#000000"
            />
          </div>

          <div className="mt-4 flex items-center justify-center gap-2.5">
            <code className="text-xs font-mono text-[#C3C5C6] border border-white/20 px-3 py-1 rounded-[8px] truncate max-w-[250px]">
              {qrTargetUrl}
            </code>
            <Link
              to={`/v/${encodeURIComponent(vehiculoId)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-normal uppercase tracking-wider text-[#D2B99A] hover:text-white shrink-0"
            >
              <span>Abrir</span>
              <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
            </Link>
          </div>
        </div>

        {/* Métricas del turno en 2 columnas de igual ancho con borde de 1 px (Sección 04) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="subase-card p-4">
            <span className="text-[11px] font-light uppercase tracking-[0.14em] text-[#D2B99A]">
              01 · RECAUDO TURNO
            </span>
            <p className="text-2xl font-light text-white mt-1.5">{formatCOP(totalRecaudado)}</p>
            <span className="text-[11px] font-light text-[#C3C5C6]">
              Directo a la wallet del vehículo
            </span>
          </div>

          <div className="subase-card p-4">
            <span className="text-[11px] font-light uppercase tracking-[0.14em] text-[#D2B99A]">
              02 · PASAJEROS
            </span>
            <p className="text-2xl font-light text-white mt-1.5">{totalPasajeros}</p>
            <span className="text-[11px] font-light text-[#C3C5C6]">
              Pagos confirmados hoy
            </span>
          </div>
        </div>

        {/* Feed en vivo separado por divisores finos en gris plata (#C3C5C6) */}
        <div className="subase-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-normal uppercase tracking-[0.15em] text-white">
              HISTORIAL EN TIEMPO REAL
            </h2>
            <span className="text-[11px] font-light text-[#D2B99A]">POLLING · 2S</span>
          </div>

          {feed.length === 0 ? (
            <div className="py-7 text-center text-xs font-light text-[#C3C5C6] space-y-1 border-t subase-divider">
              <p className="text-white font-normal uppercase tracking-wider">
                Esperando el primer pasajero
              </p>
              <p>
                Cada pago ejecutado en <code className="font-mono text-[#D2B99A]">/v/{vehiculoId}</code>{' '}
                aparece aquí al instante con confirmación sonora.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[#C3C5C6]/20 max-h-64 overflow-y-auto border-t subase-divider">
              {feed.map((item, idx) => (
                <li
                  key={item.viajeId}
                  className={`py-3 px-2 flex items-center justify-between gap-3 ${
                    idx === 0 ? 'bg-[#113462]/40' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#D2B99A] shrink-0" strokeWidth={1.5} />
                    <div>
                      <p className="text-sm font-normal uppercase tracking-wide text-white">
                        ✅ PASAJE PAGADO
                      </p>
                      <p className="text-[11px] font-mono text-[#C3C5C6]">
                        {formatHora(item.fecha)} · #{item.viajeId.slice(-6)}
                      </p>
                    </div>
                  </div>
                  <span className="text-base font-light text-white">+{formatCOP(item.monto)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
};
