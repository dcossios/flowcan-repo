import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Loader2, Printer } from 'lucide-react';
import { fetchVehiculo, getFriendlyErrorMessage, VehiculoInfo } from '../lib/api';
import { formatCOP } from '../lib/format';

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

  return (
    <div className="min-h-svh bg-black text-white flex flex-col items-center px-4 py-6 sm:py-10 print:bg-white print:p-0">
      <div className="w-full max-w-md flex items-center justify-between gap-3 no-print">
        <Link to="/flota?tab=vehiculos" className="inline-flex items-center min-h-11 text-[15px] text-[#C3C5C6] hover:text-white">
          ← Volver a la empresa
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 min-h-11 px-4 rounded-[12px] bg-[#113462] text-white text-[15px] cursor-pointer"
        >
          <Printer className="w-5 h-5" strokeWidth={1.5} />
          Imprimir
        </button>
      </div>

      <div className="w-full max-w-md mt-6 bg-white text-black rounded-[16px] p-6 sm:p-8 text-center print:mt-0 print:rounded-none">
        <p className="font-light text-[26px] tracking-[0.06em] uppercase">Súbase</p>
        {!vehiculo && !error && <Loader2 className="w-8 h-8 mx-auto my-24 animate-spin text-[#113462]" strokeWidth={1.5} />}
        {error && <p className="my-16 text-[16px]">{error}</p>}
        {vehiculo && (
          <>
            <p className="text-[20px] mt-2 leading-snug">{vehiculo.nombre}</p>
            <p className="text-[15px] text-black/60 mt-1">{vehiculo.ruta}</p>
            <div className="mt-6 mx-auto w-full max-w-[320px] aspect-square">
              <QRCodeSVG value={url} size={512} level="M" style={{ width: '100%', height: '100%' }} />
            </div>
            <p className="text-[22px] mt-6">Escanee para pagar · {formatCOP(vehiculo.tarifa)}</p>
            <p className="text-[14px] text-black/60 mt-2">Con la cámara de su celular. Sin efectivo.</p>
            <p className="text-[12px] text-black/40 mt-4 break-all">{url}</p>
          </>
        )}
      </div>
    </div>
  );
};
