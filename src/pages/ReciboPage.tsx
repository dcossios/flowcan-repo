import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { CircleCheck, Clock, Loader2, XCircle } from 'lucide-react';
import { AppShell, mensajeErrorPasajero } from '../components/AppShell';
import { ComoUsamosOpenPayments, PasoLinea } from '../components/PasoLinea';
import { Bajada, IdentidadVehiculo, PanelCrema, Pasaje, Ruta, Titulo } from '../components/Sistema';
import { nombreDesdeId } from '../lib/rutas';
import { ErrorCode, fetchViaje, getFriendlyErrorMessage, ReciboViaje } from '../lib/api';
import { formatCOP, formatFechaHora } from '../lib/format';

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
      : nombreDesdeId(vehiculoId);

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
            <PanelCrema>
              <Titulo>No pudimos cargar el tiquete</Titulo>
              <Bajada className="mt-2">{errorInfo.message}</Bajada>
            </PanelCrema>
            <Link to="/" className="subase-btn-primary subase-btn-flecha mt-8">
              Volver al inicio
            </Link>
            <p className="text-[13px] font-normal text-[#C3C5C6] mt-8">{errorInfo.code}</p>
          </div>
        )}

        {!loading && recibo && (
          <>
            {/* El pasajero le muestra esta pantalla al conductor: el estado va grande en el panel crema */}
            <PanelCrema>
              <IdentidadVehiculo vehiculoId={vehiculoId} nombre={vehiculoNombre} />
              <div className="mt-4 flex items-center gap-3" role="status" aria-live="polite">
                {estado === 'pagado' ? (
                  <CircleCheck className="w-11 h-11 shrink-0 text-[#2F865F]" strokeWidth={2} />
                ) : estado === 'pendiente' ? (
                  <Clock className="w-11 h-11 shrink-0 text-[#3A3F4E]" strokeWidth={2} />
                ) : (
                  <XCircle className="w-11 h-11 shrink-0 text-[#B8403A]" strokeWidth={2} />
                )}
                <h1 className="text-[40px] min-[360px]:text-[44px] font-semibold leading-none tracking-[-0.01em]">
                  {estado === 'pagado' ? 'Pagado' : estado === 'pendiente' ? 'Confirmando…' : 'No se cobró'}
                </h1>
              </div>
              {estado === 'pendiente' && (
                <Bajada className="mt-2">Su billetera está procesando el pago. Esta pantalla se actualiza sola.</Bajada>
              )}
              {estado === 'fallido' && (
                <Bajada className="mt-2">
                  Su billetera no completó el pago y no se le descontó nada. Revise el saldo e intente de nuevo.
                </Bajada>
              )}
              {vehiculoRuta && <Ruta ruta={vehiculoRuta} className="mt-3" />}
              <Pasaje monto={recibo.monto} etiqueta={estado === 'pagado' ? 'Pagó' : 'Pasaje'} className="mt-4" />
            </PanelCrema>

            <div className="mt-6">
              <PasoLinea paso={3} variante="compacta" />
            </div>

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
