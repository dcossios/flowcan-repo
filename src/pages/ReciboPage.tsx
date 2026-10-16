import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { CircleCheck, Clock, Loader2, XCircle } from 'lucide-react';
import { AppShell, mensajeErrorPasajero } from '../components/AppShell';
import { ComoUsamosOpenPayments, PasoLinea } from '../components/PasoLinea';
import { ErrorCode, fetchViaje, getFriendlyErrorMessage, ReciboViaje } from '../lib/api';
import { formatCOP, formatFechaHora } from '../lib/format';

function lineaVehiculo(nombre: string, ruta: string): string {
  const rutaFlecha = ruta.replace(/\s·\s/g, ' → ');
  if (!nombre) return rutaFlecha;
  if (!ruta) return nombre;
  return `${nombre} · ${rutaFlecha}`;
}

const RelojVivo: React.FC = () => {
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const texto = ahora.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return (
    <div className="mt-6">
      <p className="text-[13px] font-normal text-[#C3C5C6]">Hora actual</p>
      <p className="text-[20px] font-normal text-white tabular-nums mt-1">{texto}</p>
    </div>
  );
};

export const ReciboPage: React.FC = () => {
  const { viajeId = '' } = useParams<{ viajeId: string }>();
  const location = useLocation();
  const stateRecibo = (location.state as { recibo?: ReciboViaje } | null)?.recibo || null;

  const [recibo, setRecibo] = useState<ReciboViaje | null>(stateRecibo);
  const [loading, setLoading] = useState<boolean>(!stateRecibo);
  const [errorInfo, setErrorInfo] = useState<{ code: ErrorCode; message: string } | null>(
    null
  );

  useEffect(() => {
    if (stateRecibo) return;
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const data = await fetchViaje(viajeId);
        if (active) setRecibo(data);
      } catch (err) {
        if (active) {
          const friendly = getFriendlyErrorMessage(err);
          setErrorInfo({
            code: friendly.code,
            message: mensajeErrorPasajero(friendly.code, friendly.message),
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [viajeId, stateRecibo]);

  // Si el pago sigue confirmándose en Open Payments, se vuelve a consultar cada 3 s (máximo ~30 s).
  const estado = recibo?.estado ?? 'pagado';
  useEffect(() => {
    if (!recibo || estado !== 'pendiente') return;
    let intentos = 0;
    const id = window.setInterval(async () => {
      intentos += 1;
      try {
        const data = await fetchViaje(recibo.viajeId);
        if (data.estado !== 'pendiente' || intentos >= 10) {
          setRecibo(data);
          window.clearInterval(id);
        }
      } catch {
        if (intentos >= 10) window.clearInterval(id);
      }
    }, 3000);
    return () => window.clearInterval(id);
  }, [recibo, estado]);

  const vehiculoId =
    recibo && typeof recibo.vehiculo === 'object'
      ? recibo.vehiculo.id
      : typeof recibo?.vehiculo === 'string'
        ? recibo.vehiculo
        : 'bus-01';

  const vehiculoNombre =
    recibo && typeof recibo.vehiculo === 'object'
      ? recibo.vehiculo.nombre
      : `Vehículo ${vehiculoId}`;

  const vehiculoRuta =
    recibo && typeof recibo.vehiculo === 'object' ? recibo.vehiculo.ruta : '';

  return (
    <AppShell vehiculoIdActual={vehiculoId}>
      <div className="flex-1 flex flex-col">
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#D2B99A] animate-spin" strokeWidth={1.5} />
            <p className="text-[15px] font-normal text-[#C3C5C6] mt-3">
              Consultando el tiquete…
            </p>
          </div>
        )}

        {!loading && errorInfo && (
          <div role="alert" className="flex-1 flex flex-col">
            <h1 className="text-[32px] font-light text-white leading-tight">
              No pudimos cargar el tiquete
            </h1>
            <div className="subase-sand-rule mt-2.5" />
            <p className="text-[15px] font-normal text-[#C3C5C6] mt-4 leading-relaxed">
              {errorInfo.message}
            </p>
            <Link to="/" className="subase-btn-primary mt-8">
              Volver al inicio
            </Link>
            <p className="text-[13px] font-normal text-[#C3C5C6] mt-8">{errorInfo.code}</p>
          </div>
        )}

        {!loading && recibo && (
          <>
            <PasoLinea paso={3} variante="compacta" />

            <div className="mt-8 flex items-center gap-4" role="status" aria-live="polite">
              {estado === 'pagado' ? (
                <CircleCheck className="w-14 h-14 min-[400px]:w-16 min-[400px]:h-16 text-[#D2B99A] shrink-0" strokeWidth={1.5} />
              ) : estado === 'pendiente' ? (
                <Clock className="w-14 h-14 min-[400px]:w-16 min-[400px]:h-16 text-[#C3C5C6] shrink-0" strokeWidth={1.5} />
              ) : (
                <XCircle className="w-14 h-14 min-[400px]:w-16 min-[400px]:h-16 text-[#C3C5C6] shrink-0" strokeWidth={1.5} />
              )}
              <h1
                className={`font-light text-white leading-none min-w-0 ${
                  estado === 'pagado' ? 'text-[44px] min-[400px]:text-[56px]' : 'text-[32px] min-[400px]:text-[44px]'
                }`}
              >
                {estado === 'pagado' ? 'Pagado' : estado === 'pendiente' ? 'Confirmando…' : 'No se cobró'}
              </h1>
            </div>
            <div className="subase-sand-rule mt-3" />
            {estado === 'pendiente' && (
              <p className="text-[15px] font-normal text-[#C3C5C6] mt-4 leading-relaxed">
                Su billetera está procesando el pago. Esta pantalla se actualiza sola.
              </p>
            )}
            {estado === 'fallido' && (
              <p className="text-[15px] font-normal text-[#C3C5C6] mt-4 leading-relaxed">
                Su billetera no completó el pago y no se le descontó nada. Revise el saldo e intente de nuevo.
              </p>
            )}

            <p className="text-[40px] min-[400px]:text-[48px] font-light text-white leading-none tracking-tight tabular-nums mt-8">
              {formatCOP(recibo.monto)}
            </p>

            <p className="text-[15px] font-normal text-white mt-4 leading-snug">
              {lineaVehiculo(vehiculoNombre, vehiculoRuta)}
            </p>

            {estado === 'pagado' && (
              <>
                <RelojVivo />
                <p className="text-[15px] font-normal text-[#C3C5C6] mt-6 leading-relaxed">
                  Muéstrele esta pantalla al conductor si se la pide.
                </p>
              </>
            )}

            <hr className="subase-filete mt-8 mb-0" />
            <div className="flex items-baseline justify-between gap-4 py-4">
              <span className="text-[15px] font-normal text-[#C3C5C6]">Fecha del pago</span>
              <span className="text-[15px] font-normal text-white text-right">
                {formatFechaHora(recibo.fecha)}
              </span>
            </div>
            <hr className="subase-filete" />
            <div className="flex items-baseline justify-between gap-4 py-4">
              <span className="text-[15px] font-normal text-[#C3C5C6]">Tiquete N.º</span>
              <span className="text-[15px] font-normal text-white text-right break-all">
                {recibo.viajeId}
              </span>
            </div>
            <hr className="subase-filete" />
            <div className="flex items-baseline justify-between gap-4 py-4">
              <span className="text-[15px] font-normal text-[#C3C5C6]">Disponible hoy</span>
              <span className="text-[15px] font-normal text-white">
                {formatCOP(recibo.disponibleHoy)}
              </span>
            </div>
            <hr className="subase-filete" />
            <div className="flex items-baseline justify-between gap-4 py-4">
              <span className="text-[15px] font-normal text-[#C3C5C6]">
                Cashback (simulado)
              </span>
              <span className="text-[15px] font-normal text-white">
                +{formatCOP(recibo.cashback)}
              </span>
            </div>
            <hr className="subase-filete" />

            <div className="mt-6">
              <ComoUsamosOpenPayments />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-1">
              <Link
                to={`/v/${encodeURIComponent(vehiculoId)}`}
                className="inline-flex items-center min-h-11 text-[15px] font-normal text-[#C3C5C6] hover:text-white"
              >
                {estado === 'fallido' ? 'Intentar de nuevo' : 'Volver al bus'}
              </Link>
              <Link
                to="/mi-pase"
                className="inline-flex items-center min-h-11 text-[15px] font-normal text-[#C3C5C6] hover:text-white"
              >
                Ver mis viajes
              </Link>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
};
