import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Bus,
  CheckCircle2,
  Clock,
  Loader2,
  QrCode,
  Receipt,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { ErrorCode, fetchViaje, getFriendlyErrorMessage, ReciboViaje } from '../lib/api';
import { formatCOP, formatFechaHora } from '../lib/format';

export const ReciboPage: React.FC = () => {
  const { viajeId = '' } = useParams<{ viajeId: string }>();
  const location = useLocation();
  const stateRecibo = (location.state as { recibo?: ReciboViaje } | null)?.recibo || null;

  const [recibo, setRecibo] = useState<ReciboViaje | null>(stateRecibo);
  const [loading, setLoading] = useState<boolean>(!stateRecibo);
  const [errorInfo, setErrorInfo] = useState<{ code: ErrorCode; message: string } | null>(null);

  useEffect(() => {
    if (stateRecibo) return;
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const data = await fetchViaje(viajeId);
        if (active) setRecibo(data);
      } catch (err) {
        if (active) setErrorInfo(getFriendlyErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [viajeId, stateRecibo]);

  const vehiculoId =
    recibo && typeof recibo.vehiculo === 'object'
      ? recibo.vehiculo.id
      : typeof recibo?.vehiculo === 'string'
      ? recibo.vehiculo
      : 'bus-101';

  const vehiculoNombre =
    recibo && typeof recibo.vehiculo === 'object'
      ? recibo.vehiculo.nombre
      : `Vehículo ${vehiculoId}`;

  const vehiculoRuta =
    recibo && typeof recibo.vehiculo === 'object' ? recibo.vehiculo.ruta : 'Ruta Barrial Medellín';

  return (
    <AppShell vehiculoIdActual={vehiculoId}>
      <div className="flex-1 flex flex-col justify-between gap-6">
        {loading && (
          <div className="subase-card p-8 text-center my-auto flex flex-col items-center">
            <Loader2 className="w-9 h-9 text-[#D2B99A] animate-spin mb-3" strokeWidth={1.5} />
            <p className="text-base font-normal uppercase tracking-wider text-white">
              Consultando comprobante…
            </p>
          </div>
        )}

        {!loading && errorInfo && (
          <div role="alert" className="subase-card-sand p-5 my-auto">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-[#D2B99A] shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-xs font-mono text-[#D2B99A]">{errorInfo.code}</p>
                <p className="text-sm font-light text-white mt-1">{errorInfo.message}</p>
                <Link
                  to="/v/bus-101"
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-[12px] bg-[#113462] border border-white/40 text-white text-xs font-normal uppercase tracking-wider"
                >
                  Volver al inicio
                </Link>
              </div>
            </div>
          </div>
        )}

        {!loading && recibo && (
          <>
            {/* Encabezado de sección con subrayado de arena */}
            <div>
              <span className="text-xs font-light uppercase tracking-[0.16em] text-[#D2B99A]">
                FINALIZACIÓN · OUTGOING PAYMENT
              </span>
              <div className="flex items-center justify-between gap-3 mt-1">
                <h1 className="text-3xl font-light uppercase tracking-wide text-white">
                  ✅ PASAJE PAGADO
                </h1>
                <CheckCircle2 className="w-7 h-7 text-[#D2B99A] shrink-0" strokeWidth={1.5} />
              </div>
              <div className="subase-sand-rule mt-2.5" />
            </div>

            {/* Tarjeta principal del recibo (borde 1 px blanco/arena, radio 12 px) */}
            <div className="subase-card p-6 space-y-5 my-auto">
              {/* Cifra destacada en Poppins Light */}
              <div className="border-b subase-divider pb-5">
                <span className="text-xs font-light uppercase tracking-[0.15em] text-[#C3C5C6]">
                  MONTO TRANSFERIDO A LA FLOTA
                </span>
                <p
                  className="font-light text-white mt-2 leading-none"
                  style={{ fontSize: 'clamp(2.5rem, 1.8rem + 3.5vw, 3.5rem)' }}
                >
                  {formatCOP(recibo.monto)}
                </p>
              </div>

              {/* Bloque de Cashback (Diapositiva 9: CASHBACK · CAC financiado por el ahorro) */}
              <div className="subase-card-sand p-4 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-light uppercase tracking-[0.16em] text-[#D2B99A]">
                    CASHBACK SÚBASE (SIMULADO)
                  </span>
                  <p className="text-xs font-light text-[#C3C5C6] mt-0.5">
                    Financiado por el ahorro del recaudo sin efectivo
                  </p>
                </div>
                <span className="text-xl font-light text-white border border-[#D2B99A] rounded-[12px] px-3.5 py-1.5 shrink-0">
                  +{formatCOP(recibo.cashback)}
                </span>
              </div>

              {/* Filas numeradas 01–04 separadas por líneas finas en gris plata (#C3C5C6) */}
              <div className="divide-y divide-[#C3C5C6]/20 text-sm">
                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="font-light text-[#C3C5C6] flex items-center gap-2">
                    <span className="text-[#D2B99A]">01</span>
                    <Bus className="w-4 h-4 text-white" strokeWidth={1.5} />
                    <span>Vehículo</span>
                  </span>
                  <span className="font-normal text-white text-right">{vehiculoNombre}</span>
                </div>

                {vehiculoRuta && (
                  <div className="py-2.5 flex items-center justify-between gap-2">
                    <span className="font-light text-[#C3C5C6] flex items-center gap-2">
                      <span className="text-[#D2B99A]">02</span>
                      <span>Ruta</span>
                    </span>
                    <span className="font-light text-[#C3C5C6] text-right">{vehiculoRuta}</span>
                  </div>
                )}

                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="font-light text-[#C3C5C6] flex items-center gap-2">
                    <span className="text-[#D2B99A]">03</span>
                    <Clock className="w-4 h-4 text-white" strokeWidth={1.5} />
                    <span>Fecha y hora</span>
                  </span>
                  <span className="font-light text-white">{formatFechaHora(recibo.fecha)}</span>
                </div>

                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="font-light text-[#C3C5C6] flex items-center gap-2">
                    <span className="text-[#D2B99A]">04</span>
                    <Receipt className="w-4 h-4 text-white" strokeWidth={1.5} />
                    <span>ID Transacción</span>
                  </span>
                  <span className="font-mono text-xs text-[#D2B99A]">{recibo.viajeId}</span>
                </div>

                <div className="pt-3 flex items-center justify-between gap-2">
                  <span className="font-light text-[#C3C5C6]">Disponible restante hoy</span>
                  <span className="font-normal text-white text-base">
                    {formatCOP(recibo.disponibleHoy)}
                  </span>
                </div>
              </div>
            </div>

            {/* Botones de navegación */}
            <div className="space-y-2.5 pt-1">
              <Link
                to={`/v/${encodeURIComponent(vehiculoId)}`}
                className="w-full py-4 px-5 rounded-[12px] bg-[#113462] hover:bg-[#0C4672] border border-white/40 text-white font-normal uppercase tracking-[0.1em] text-sm flex items-center justify-center gap-2 min-h-14"
              >
                <ArrowLeft className="w-4 h-4 text-[#D2B99A]" strokeWidth={1.5} />
                <span>VOLVER AL VEHÍCULO ({vehiculoId})</span>
              </Link>

              <Link
                to={`/conductor/${encodeURIComponent(vehiculoId)}`}
                className="w-full py-3.5 px-5 rounded-[12px] border border-white/25 hover:border-[#D2B99A] text-[#C3C5C6] hover:text-white font-normal uppercase tracking-wider text-xs flex items-center justify-center gap-2 min-h-12"
              >
                <QrCode className="w-4 h-4 text-[#D2B99A]" strokeWidth={1.5} />
                <span>VER TERMINAL DEL CONDUCTOR</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
};
