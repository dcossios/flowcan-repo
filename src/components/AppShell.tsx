import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ErrorCode, isUiPreviewMode, setUiPreviewMode } from '../lib/api';
import { CREMA } from './Sistema';

interface AppShellProps {
  children: React.ReactNode;
  subtitle?: string;
  vehiculoIdActual?: string;
  /** Reserva espacio en el pie para la barra fija de pagar / aprobar. */
  barraFija?: boolean | 'alta';
  ancho?: 'normal' | 'amplio';
  /** Quién usa la vista: el pasajero ve «Mi pase» en el encabezado. */
  rol?: 'pasajero' | 'conductor' | 'empresa';
  /** Sustituye el texto «Vista Previa UI» en la barra de desarrollo. El botón «Usar API real» se queda. */
  previa?: React.ReactNode;
}

const MENSAJES_USTED: Record<ErrorCode, string> = {
  SALDO_INSUFICIENTE: 'Saldo insuficiente en su billetera para cubrir este pasaje.',
  TOPE_ALCANZADO: 'Alcanzó el tope diario de su pase. Active o amplíe el pase para continuar.',
  PAGO_DUPLICADO: 'Ya pagó este bus hace menos de 2 minutos. No le cobramos dos veces.',
  PASE_INVALIDO: 'Su pase no es válido o venció la autorización. Actívelo de nuevo.',
  PASE_VENCIDO: 'Su pase de 30 días venció. Active uno nuevo.',
  OP_ERROR: 'No pudimos completar el pago. Verifique su billetera e intente de nuevo.',
  NO_ENCONTRADO: 'No encontramos ese vehículo o ese recibo.',
  DATOS_INVALIDOS: 'Revise los datos e intente de nuevo.',
  NO_AUTORIZADO: 'El PIN de la empresa no es correcto.',
  BACKEND_OFFLINE: 'El servidor no responde. Intente de nuevo en un momento.',
};

export function mensajeErrorPasajero(code: ErrorCode, fallback?: string): string {
  return MENSAJES_USTED[code] || fallback || MENSAJES_USTED.OP_ERROR;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  subtitle: _subtitle,
  vehiculoIdActual = 'bus-01',
  barraFija = false,
  ancho = 'normal',
  rol = 'pasajero',
  previa,
}) => {
  const location = useLocation();
  const [previewMode, setPreviewMode] = useState<boolean>(() => isUiPreviewMode());
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    const sync = () => setPreviewMode(isUiPreviewMode());
    window.addEventListener('subase-preview-change', sync);
    return () => window.removeEventListener('subase-preview-change', sync);
  }, []);

  const togglePreview = () => {
    const next = !previewMode;
    setUiPreviewMode(next);
    setPreviewMode(next);
    window.location.reload();
  };

  void _subtitle;

  const contenedorAncho = ancho === 'amplio' ? 'max-w-[1100px]' : 'max-w-lg';

  return (
    <div
      // overflow-x-clip (no hidden): hidden convierte el div en un contenedor con scroll propio, rompe el header
      // sticky y en Safari de iPhone hace que la página se «pegue» al hacer scroll. svh no cambia cuando la barra
      // de Safari se esconde, así que no hay recálculo de diseño a mitad del gesto.
      // Diseño final (prompt199): todas las pantallas sobre el crema de la ilustración, con tinta. Sin negro.
      className={`min-h-svh flex flex-col relative overflow-x-clip text-[#1E2230] ${
        barraFija === 'alta' ? 'subase-shell-bar-alta' : barraFija ? 'subase-shell-bar' : ''
      }`}
      style={{ backgroundColor: CREMA }}
    >
      <header className="sticky top-0 z-30 border-b border-[rgba(30,34,48,0.15)]" style={{ backgroundColor: CREMA }}>
        <div className={`${contenedorAncho} mx-auto px-5 h-14 flex items-center justify-between gap-3`}>
          <Link
            to="/"
            className="inline-flex items-center min-h-11 font-normal text-[22px] leading-none text-[#1E2230] uppercase tracking-[0.06em]"
          >
            SÚBASE
          </Link>
          {rol === 'pasajero' ? (
            <Link
              to="/mi-pase"
              className={`inline-flex items-center min-h-11 px-1 text-[15px] font-normal underline-offset-4 hover:underline ${
                location.pathname === '/mi-pase' ? 'font-medium text-[#1E2230]' : 'text-[#3A3F4E] hover:text-[#1E2230]'
              }`}
            >
              Mi pase
            </Link>
          ) : (
            <span className="text-[15px] font-normal text-[#3A3F4E]">
              {rol === 'conductor' ? 'Conductor' : 'Empresa'}
            </span>
          )}
        </div>

        {isDev && previewMode && (
          <div className={`bg-[#1E2230] px-5 text-[15px] text-white flex items-center justify-between gap-3 ${contenedorAncho} mx-auto min-h-11`}>
            {previa ?? <span className="font-normal text-white">Vista Previa UI</span>}
            <button
              type="button"
              onClick={togglePreview}
              className="underline font-normal text-white min-h-11 px-2 cursor-pointer"
            >
              Usar API real
            </button>
          </div>
        )}
      </header>

      {/* z-20, por encima del pie (z-10): la barra fija de pagar vive dentro de <main> y el pie no se le debe pintar encima */}
      <main className={`relative z-20 flex-1 w-full ${contenedorAncho} mx-auto px-5 pt-6 pb-8 flex flex-col`}>
        {children}
      </main>

      {/* Pie de la demo (cambiar de vista, Interledger): solo en el inicio y en las vistas de conductor y empresa. En el
          cobro, el pase y el recibo distraía del único paso que el pasajero tiene que dar. */}
      {(rol !== 'pasajero' || location.pathname === '/') && (
      // Pie en tinta secundaria sobre el crema (8,9 : 1)
      <footer className={`relative z-10 w-full ${contenedorAncho} mx-auto px-5 pt-2 pb-4 subase-pie-crema`}>
        {rol === 'pasajero' && (
          <p className="text-[15px] font-normal text-[#3A3F4E] leading-snug">
            Su plata va directo de su billetera a la del bus.
          </p>
        )}
        <p className={`text-[15px] font-normal text-[#3A3F4E] ${rol === 'pasajero' ? 'mt-1' : ''}`}>
          Construido sobre Interledger Open Payments
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1">
          <Link
            to={`/conductor/${encodeURIComponent(vehiculoIdActual)}`}
            className="inline-flex items-center min-h-11 text-[15px] font-normal text-[#3A3F4E] underline-offset-2 hover:text-[#1E2230] hover:underline"
          >
            Vista del conductor
          </Link>
          <Link
            to="/flota"
            className="inline-flex items-center min-h-11 text-[15px] font-normal text-[#3A3F4E] underline-offset-2 hover:text-[#1E2230] hover:underline"
          >
            Vista de la empresa
          </Link>
        </div>
      </footer>
      )}
    </div>
  );
};
