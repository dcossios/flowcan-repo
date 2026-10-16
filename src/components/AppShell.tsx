import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, QrCode, ShieldCheck } from 'lucide-react';
import { isUiPreviewMode, setUiPreviewMode } from '../lib/api';

interface AppShellProps {
  children: React.ReactNode;
  subtitle?: string;
  vehiculoIdActual?: string;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  subtitle = 'Pague el bus sin efectivo, desde cualquier wallet.',
  vehiculoIdActual = 'bus-101',
}) => {
  const location = useLocation();
  const [previewMode, setPreviewMode] = useState<boolean>(() => isUiPreviewMode());

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

  const isConductor = location.pathname.startsWith('/conductor');

  return (
    <div className="min-h-dvh flex flex-col subase-estela-bg text-white relative">
      {/* Encabezado minimalista nocturno acorde a Guia_de_Marca_SUBASE.pdf */}
      <header className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-[#C3C5C6]/20">
        <div className="max-w-lg mx-auto px-5 py-3.5 flex items-center justify-between gap-3">
          <Link to={`/v/${vehiculoIdActual}`} className="group flex flex-col">
            <span className="text-[10px] font-normal uppercase tracking-[0.18em] text-[#C3C5C6]">
              OPEN PAYMENTS · MEDELLÍN
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-light tracking-[0.06em] text-2xl leading-none text-white uppercase">
                SÚBASE
              </span>
              <ArrowUpRight className="w-4 h-4 text-[#D2B99A]" strokeWidth={1.5} />
            </div>
          </Link>

          <Link
            to={isConductor ? `/v/${vehiculoIdActual}` : `/conductor/${vehiculoIdActual}`}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[12px] text-xs font-normal uppercase tracking-wider border border-white/30 bg-black/60 hover:border-[#D2B99A] text-white transition-colors min-h-10"
            title="Cambiar entre vista de Pasajero y Terminal del Conductor"
          >
            <QrCode className="w-4 h-4 text-[#D2B99A]" strokeWidth={1.5} />
            <span>{isConductor ? 'Pasajero' : 'Conductor'}</span>
          </Link>
        </div>

        {/* Cinta discreta si está activo el modo Vista Previa UI (sin backend) */}
        {previewMode && (
          <div className="bg-[#113462] border-t border-white/20 px-5 py-1.5 text-xs text-white flex items-center justify-between max-w-lg mx-auto">
            <span className="font-light text-[#C3C5C6]">
              Vista Previa UI activa · <strong className="font-normal text-white">Mock local</strong>
            </span>
            <button
              type="button"
              onClick={togglePreview}
              className="underline font-normal text-[#D2B99A] hover:text-white min-h-0 py-0.5 px-1 cursor-pointer"
            >
              Usar API real
            </button>
          </div>
        )}
      </header>

      {/* Contenedor central con amplio espacio negativo según Sección 04 */}
      <main className="relative z-10 flex-1 w-full max-w-lg mx-auto px-5 py-6 flex flex-col">
        {children}
      </main>

      {/* Pie de página sobrio con gris plata #C3C5C6 y acento arena #D2B99A */}
      <footer className="relative z-10 w-full max-w-lg mx-auto px-5 py-4 border-t border-[#C3C5C6]/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-left">
          <p className="text-xs font-light text-[#C3C5C6] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#D2B99A] shrink-0" strokeWidth={1.5} />
            <span>No custodiamos fondos: el dinero vive en wallets reguladas.</span>
          </p>
          <p className="text-[11px] font-light text-[#D2B99A]">{subtitle}</p>
        </div>
      </footer>
    </div>
  );
};
