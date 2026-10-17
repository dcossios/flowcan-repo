import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Loader2, Printer } from 'lucide-react';
import { CREMA, ETIQUETA, Pasaje, TINTA } from '../components/Sistema';
import { fetchVehiculo, getFriendlyErrorMessage, VehiculoInfo } from '../lib/api';
import { coloresDeRuta, nombreDesdeId, partirNombre } from '../lib/rutas';

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

/** QR imprimible de un vehículo (para pegar en el bus). Lleva a /v/:vehiculoId. */
export const QrVehiculoPage: React.FC = () => {
  const { vehiculoId = '' } = useParams<{ vehiculoId: string }>();
  const [vehiculo, setVehiculo] = useState<VehiculoInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const url = `${window.location.origin}/v/${encodeURIComponent(vehiculoId)}`;

  useEffect(() => {
    fetchVehiculo(vehiculoId)
      .then(setVehiculo)
      .catch((err) => setError(getFriendlyErrorMessage(err).message));
  }, [vehiculoId]);

  const nombreCompleto = vehiculo ? vehiculo.nombre : nombreDesdeId(vehiculoId);
  const { tipo, numero, empresa } = partirNombre(nombreCompleto);
  const rutaColor = coloresDeRuta(vehiculo?.id || vehiculoId);
  const tituloEmpresa = empresa || nombreCompleto;

  return (
    <div
      className="min-h-svh text-[#1E2230] flex flex-col items-center px-4 py-6 sm:py-10 print:bg-white print:p-0"
      style={{ backgroundColor: CREMA }}
    >
      <div className="w-full max-w-md flex items-center justify-between gap-3 no-print">
        <Link
          to="/flota?tab=vehiculos"
          className="inline-flex items-center min-h-11 text-[15px] font-medium text-[#1E2230] underline-offset-2 hover:underline"
        >
          ← Volver a la empresa
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="subase-btn-primary subase-btn-tinta !w-auto !min-h-11 !px-5 !text-[15px]"
        >
          <Printer className="w-5 h-5" strokeWidth={1.5} />
          Imprimir
        </button>
      </div>

      <div
        className="w-full max-w-md mt-6 bg-white text-[#1E2230] rounded-[3px] p-6 sm:p-8 print:mt-0 print:rounded-none"
        style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
      >
        <p className="font-light text-[22px] leading-none tracking-[0.06em] uppercase text-[#1E2230]">
          SÚBASE
        </p>

        {!vehiculo && !error && (
          <Loader2 className="w-8 h-8 mx-auto my-24 animate-spin text-[#1E2230]" strokeWidth={1.5} />
        )}
        {error && <p className="my-16 text-[16px] text-[#3A3F4E]">{error}</p>}

        {vehiculo && (
          <>
            <div className="mt-5 flex items-center gap-4">
              {numero && (
                <span
                  className="inline-flex items-center justify-center shrink-0 w-16 h-16 px-2 rounded-[3px] text-[32px] font-semibold tabular-nums leading-none"
                  style={{ backgroundColor: rutaColor.color, color: rutaColor.texto }}
                >
                  {numero}
                </span>
              )}
              <div className="min-w-0">
                <p className={`${ETIQUETA} text-[#3A3F4E]`}>
                  {tipo} {numero}
                </p>
                <p className="mt-1 text-[26px] font-semibold leading-tight text-[#1E2230] break-words">
                  {tituloEmpresa}
                </p>
              </div>
            </div>

            <LineaParadas ruta={vehiculo.ruta} vehiculoId={vehiculo.id || vehiculoId} className="mt-6" />

            <div className="mt-6 mx-auto w-full max-w-[300px] aspect-square bg-white p-2">
              <QRCodeSVG
                value={url}
                size={512}
                level="M"
                includeMargin={false}
                bgColor="#FFFFFF"
                fgColor="#000000"
                style={{ width: '100%', height: '100%' }}
              />
            </div>

            <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
              <p className="text-[22px] font-semibold leading-tight text-[#1E2230]">
                Escanee para pagar
              </p>
              <Pasaje monto={vehiculo.tarifa} moneda={vehiculo.moneda} />
            </div>

            <p className="text-[15px] font-normal text-[#3A3F4E] mt-6">
              Con la cámara de su celular. Sin efectivo.
            </p>
            <p className="font-mono text-[13px] text-[#3A3F4E] mt-1.5 break-all">{url}</p>
          </>
        )}
      </div>
    </div>
  );
};

