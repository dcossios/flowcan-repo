import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ErrorCode, isUiPreviewMode, setUiPreviewMode } from '../lib/api';

interface AppShellProps {
  children: React.ReactNode;
  subtitle?: string;
  vehiculoIdActual?: string;
  /** Reserva espacio en el pie para la barra fija de pagar / aprobar. */
  barraFija?: boolean | 'alta';
  ancho?: 'normal' | 'amplio';
}

const MENSAJES_USTED: Record<ErrorCode, string> = {
  SALDO_INSUFICIENTE: 'Saldo insuficiente en su billetera para cubrir este pasaje.',
  TOPE_ALCANZADO: 'Alcanzó el tope diario de su pase. Active o amplíe el pase para continuar.',
  PAGO_DUPLICADO: 'Ya pagó este bus hace menos de 2 minutos. No le cobramos dos veces.',
  PASE_INVALIDO: 'Su pase no es válido o venció la autorización. Actívelo de nuevo.',
  PASE_VENCIDO: 'Su pase de 30 días venció. Active uno nuevo.',
  OP_ERROR: 'No pudimos completar el pago. Verifique su billetera e intente de nuevo.',
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
      className={`min-h-dvh flex flex-col bg-black text-white relative overflow-x-hidden ${
        barraFija === 'alta' ? 'subase-shell-bar-alta' : barraFija ? 'subase-shell-bar' : ''
      }`}
    >
      <div className="subase-estela-bg" aria-hidden="true" />

      <header className="sticky top-0 z-30 bg-black border-b border-[rgba(195,197,198,0.2)]">
        <div className={`${contenedorAncho} mx-auto px-5 h-14 flex items-center justify-between gap-3`}>
          <Link
            to="/"
            className="inline-flex items-center min-h-11 font-light text-[22px] leading-none text-white uppercase tracking-[0.06em]"
          >
            SÚBASE
          </Link>
          <span className="text-[15px] font-normal text-[#C3C5C6]">Medellín</span>
        </div>

        {isDev && previewMode && (
          <div className={`bg-[#113462] border-t border-white/20 px-5 text-[15px] text-white flex items-center justify-between gap-3 ${contenedorAncho} mx-auto min-h-11`}>
            <span className="font-normal text-white">Vista Previa UI</span>
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

      <main className={`relative z-10 flex-1 w-full ${contenedorAncho} mx-auto px-5 pt-6 pb-8 flex flex-col`}>
        {children}
      </main>

      <footer className={`relative z-10 w-full ${contenedorAncho} mx-auto px-5 pt-2 pb-4`}>
        <p className="text-[15px] font-normal text-[#C3C5C6] leading-snug">
          Su plata va directo de su billetera a la del bus.
        </p>
        <p className="text-[15px] font-normal text-[#C3C5C6]/80 mt-1">
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
    </div>
  );
};
