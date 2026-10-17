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
  /** Campo de la pantalla. Crema: el negro queda solo en el encabezado y la barra de acción. Lo usa el cobro, donde
      bajo el panel crema no hay contenido y el negro subía como un bloque vacío hasta media pantalla (prompt127). */
  fondo?: 'negro' | 'crema';
  /** Sustituye el texto «Vista Previa UI» en la barra azul de desarrollo. El botón «Usar API real» se queda. */
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
  fondo = 'negro',
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
      className={`min-h-svh flex flex-col relative overflow-x-clip ${
        fondo === 'crema' ? 'text-[#1E2230]' : 'bg-black text-white'
      } ${barraFija === 'alta' ? 'subase-shell-bar-alta' : barraFija ? 'subase-shell-bar' : ''}`}
      style={fondo === 'crema' ? { backgroundColor: CREMA } : undefined}
    >
      {fondo === 'negro' && <div className="subase-estela-bg" aria-hidden="true" />}

      <header className="sticky top-0 z-30 bg-black border-b border-[rgba(195,197,198,0.2)]">
        <div className={`${contenedorAncho} mx-auto px-5 h-14 flex items-center justify-between gap-3`}>
          <Link
            to="/"
            className="inline-flex items-center min-h-11 font-light text-[22px] leading-none text-white uppercase tracking-[0.06em]"
          >
            SÚBASE
          </Link>
          {rol === 'pasajero' ? (
            <Link
              to="/mi-pase"
              className={`inline-flex items-center min-h-11 px-1 text-[15px] font-normal underline-offset-4 hover:underline ${
                location.pathname === '/mi-pase' ? 'text-white' : 'text-[#C3C5C6] hover:text-white'
              }`}
            >
              Mi pase
            </Link>
          ) : (
            <span className="text-[15px] font-normal text-[#C3C5C6]">
              {rol === 'conductor' ? 'Conductor' : 'Empresa'}
            </span>
          )}
        </div>

        {isDev && previewMode && (
          <div className={`bg-[#113462] border-t border-white/20 px-5 text-[15px] text-white flex items-center justify-between gap-3 ${contenedorAncho} mx-auto min-h-11`}>
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
      <footer className={`relative z-10 w-full ${contenedorAncho} mx-auto px-5 pt-2 pb-4`}>
        {rol === 'pasajero' && (
          <p className="text-[15px] font-normal text-[#C3C5C6] leading-snug">
            Su plata va directo de su billetera a la del bus.
          </p>
        )}
        <p className={`text-[15px] font-normal text-[#C3C5C6]/80 ${rol === 'pasajero' ? 'mt-1' : ''}`}>
          Construido sobre Interledger Open Payments
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1">
          <Link
            to={`/conductor/${encodeURIComponent(vehiculoIdActual)}`}
            className="inline-flex items-center min-h-11 text-[15px] font-normal text-[#C3C5C6] underline-offset-2 hover:text-white hover:underline"
          >
            Vista del conductor
          </Link>
          <Link
            to="/flota"
            className="inline-flex items-center min-h-11 text-[15px] font-normal text-[#C3C5C6] underline-offset-2 hover:text-white hover:underline"
          >
            Vista de la empresa
          </Link>
        </div>
      </footer>
      )}
    </div>
  );
};
