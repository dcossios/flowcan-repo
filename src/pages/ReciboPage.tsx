import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppShell, mensajeErrorPasajero } from '../components/AppShell';
import { ComoUsamosOpenPayments } from '../components/PasoLinea';
import { Bajada, FichaEstado, Fila, IdentidadVehiculo, PanelCrema, Pasaje, Ruta, Titulo } from '../components/Sistema';
import { nombreDesdeId } from '../lib/rutas';
import { ErrorCode, fetchViaje, getFriendlyErrorMessage, ReciboViaje } from '../lib/api';
import { formatCOP, formatFechaHora, formatMoneda } from '../lib/format';
import { marcarReciboSonado, reciboYaSono, sonarPagoAprobado } from '../lib/sound';

// Hora en vivo junto a «Pagado»: prueba de que la pantalla no es una captura vieja, que es lo que mira el conductor.
const HoraEnVivo: React.FC = () => {
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
    <p className="mt-3 flex items-center gap-2.5" aria-label={`Hora actual ${texto}`}>
      <span aria-hidden="true" className="subase-latido w-2.5 h-2.5 rounded-full bg-[#2F865F]" />
      <span className="text-[22px] font-semibold tabular-nums leading-none">{texto}</span>
      <span className="text-[14px] text-[#3A3F4E] leading-tight">hora actual</span>
    </p>
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

  // Campanitas de pago aprobado: una sola vez por viaje, cuando el recibo dice «Pagado» y además viene del pago
  // que se acaba de hacer o se vio pasar de «Confirmando…» a «Pagado» aquí. No al abrir un recibo viejo desde
  // «Mi pase» ni con el recibo de un pago duplicado.
  const vieneDelPago = Boolean(stateRecibo && !stateRecibo.duplicado);
  const [vioPendiente, setVioPendiente] = useState(false);
  useEffect(() => {
    if (estado === 'pendiente') setVioPendiente(true);
  }, [estado]);
  useEffect(() => {
    if (!recibo || estado !== 'pagado' || recibo.duplicado) return;
    if (!vieneDelPago && !vioPendiente) return;
    if (reciboYaSono(recibo.viajeId)) return;
    marcarReciboSonado(recibo.viajeId);
    sonarPagoAprobado();
  }, [recibo, estado, vieneDelPago, vioPendiente]);

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
            <p className="text-[14px] font-normal text-[#C3C5C6] mt-3">
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
                <FichaEstado estado={estado} />
                <h1 className="text-[40px] min-[360px]:text-[44px] font-semibold leading-none tracking-[-0.01em]">
                  {estado === 'pagado' ? 'Pagado' : estado === 'pendiente' ? 'Confirmando…' : 'No se cobró'}
                </h1>
              </div>
              {estado === 'pagado' && <HoraEnVivo />}
              {estado === 'pendiente' && (
                <Bajada className="mt-2">Su billetera está procesando el pago. Esta pantalla se actualiza sola.</Bajada>
              )}
              {estado === 'fallido' && (
                <Bajada className="mt-2">
                  Su billetera no completó el pago y no se le descontó nada. Revise el saldo e intente de nuevo.
                </Bajada>
              )}
              {vehiculoRuta && <Ruta ruta={vehiculoRuta} className="mt-3" />}
              <Pasaje
                monto={recibo.montoPagado ?? recibo.monto}
                moneda={recibo.monedaPagada}
                etiqueta={estado === 'pagado' ? 'Pagó' : 'Pasaje'}
                className="mt-4"
              />
            </PanelCrema>

            {estado === 'pagado' && (
              <p className="text-[16px] font-medium text-white mt-6 leading-relaxed">
                Muéstrele esta pantalla al conductor si se la pide.
              </p>
            )}

            <div className="mt-4 border-t border-[rgba(195,197,198,0.2)]">
              <Fila etiqueta="Fecha del pago">{formatFechaHora(recibo.fecha)}</Fila>
              <Fila etiqueta="Tiquete N.º">{recibo.viajeId}</Fila>
              {/* Pagó en otra moneda: el bus recibió la tarifa exacta en pesos (la conversión la hizo su billetera) */}
              {recibo.monedaPagada && recibo.monedaPagada !== (recibo.moneda ?? 'COP') && (
                <Fila etiqueta="El bus recibió">{formatCOP(recibo.monto)}</Fila>
              )}
              <Fila etiqueta="Le queda del tope hoy">{formatMoneda(recibo.disponibleHoy, recibo.monedaPase)}</Fila>
              <Fila etiqueta="Cashback (simulado)">+{formatCOP(recibo.cashback)}</Fila>
            </div>

            <div className="mt-6">
              <ComoUsamosOpenPayments />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-1">
              <Link
                to={`/v/${encodeURIComponent(vehiculoId)}`}
                className="inline-flex items-center min-h-11 text-[14px] font-normal text-[#C3C5C6] hover:text-white"
              >
                {estado === 'fallido' ? 'Intentar de nuevo' : 'Volver al bus'}
              </Link>
              <Link
                to="/mi-pase"
                className="inline-flex items-center min-h-11 text-[14px] font-normal text-[#C3C5C6] hover:text-white"
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
