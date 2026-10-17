import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppShell, mensajeErrorPasajero } from '../components/AppShell';
import { Bajada, FichaEstado, PanelCrema, Titulo } from '../components/Sistema';
import {
  clearPendingPaseContext,
  confirmarPase,
  ConfirmarPaseResponse,
  ErrorCode,
  getFriendlyErrorMessage,
  getPendingPaseContext,
  setPaseToken,
} from '../lib/api';
import { formatFechaHora, formatMoneda } from '../lib/format';
import { playPaymentChime } from '../lib/sound';

export const PaseListoPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const confirmedOnceRef = useRef<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [confirmado, setConfirmado] = useState<ConfirmarPaseResponse | null>(null);
  const [errorInfo, setErrorInfo] = useState<{ code: ErrorCode; message: string } | null>(
    null
  );

  const pendingCtx = getPendingPaseContext();
  const paseId = searchParams.get('paseId') || pendingCtx?.paseId || '';
  const interactRef =
    searchParams.get('interact_ref') || searchParams.get('interactRef') || '';
  const hash = searchParams.get('hash') || '';
  const destinoVolver = searchParams.get('volver') || pendingCtx?.volver || '/v/bus-01';

  useEffect(() => {
    if (confirmedOnceRef.current) return;
    confirmedOnceRef.current = true;

    async function ejecutarConfirmacion() {
      if (!paseId || !interactRef) {
        setErrorInfo({
          code: 'PASE_INVALIDO',
          message:
            'Faltan datos de su billetera para confirmar el pase. Intente activarlo de nuevo.',
        });
        setLoading(false);
        return;
      }

      try {
        const res = await confirmarPase(paseId, { interactRef, hash });
        if (res.paseToken) {
          setPaseToken(res.paseToken);
        }
        clearPendingPaseContext();
        setConfirmado(res);
        playPaymentChime();
      } catch (err) {
        const friendly = getFriendlyErrorMessage(err);
        setErrorInfo({
          code: friendly.code,
          message: mensajeErrorPasajero(friendly.code, friendly.message),
        });
      } finally {
        setLoading(false);
      }
    }

    ejecutarConfirmacion();
  }, [paseId, interactRef, hash]);

  useEffect(() => {
    if (!confirmado) return;
    const timer = window.setTimeout(() => {
      navigate(destinoVolver, { replace: true });
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [confirmado, destinoVolver, navigate]);

  return (
    <AppShell fondo="crema">
      <div className="flex-1 flex flex-col">
        <PanelCrema>
          {loading && (
            <>
              <Loader2 className="w-7 h-7 animate-spin mb-3" strokeWidth={1.5} />
              <Titulo>Confirmando su pase…</Titulo>
              <Bajada className="mt-2">Un momento. Estamos recibiendo la autorización de su billetera.</Bajada>
            </>
          )}
          {!loading && errorInfo && (
            <div role="alert">
              <FichaEstado estado="fallido" className="mb-4" />
              <Titulo>No se pudo confirmar el pase</Titulo>
              <Bajada className="mt-2">{errorInfo.message}</Bajada>
            </div>
          )}
          {!loading && confirmado && (
            <>
              <FichaEstado estado="pagado" className="mb-4" />
              <Titulo>Pase activo</Titulo>
              <Bajada className="mt-2">Su tope diario ya está autorizado. Lo llevamos al bus para pagar.</Bajada>
            </>
          )}
        </PanelCrema>

        {!loading && errorInfo && (
          <div className="mt-4 flex-1 flex flex-col">
            <div className="flex flex-col items-start gap-3">
              <Link
                to={`/pase/activar?volver=${encodeURIComponent(destinoVolver)}`}
                className="subase-btn-primary subase-btn-tinta subase-btn-flecha"
              >
                Intentar de nuevo
              </Link>
              <Link
                to={destinoVolver}
                className="inline-flex items-center min-h-11 text-[15px] font-medium text-[#1E2230] underline underline-offset-2"
              >
                Volver al bus
              </Link>
            </div>
            <p className="font-mono text-[13px] font-normal text-[#3A3F4E] mt-8">{errorInfo.code}</p>
          </div>
        )}

        {!loading && confirmado && (
          <div className="mt-2 flex-1 flex flex-col">
            <div className="border-t border-[rgba(30,34,48,0.16)]">
              <div className="flex items-baseline justify-between gap-4 py-3.5 border-b border-[rgba(30,34,48,0.16)]">
                <span className="text-[14px] font-normal text-[#3A3F4E] shrink-0">Le queda del tope hoy</span>
                <span className="text-[32px] font-semibold text-[#1E2230] leading-none tabular-nums">
                  {formatMoneda(confirmado.pase.disponibleHoy, confirmado.pase.moneda)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-3.5 border-b border-[rgba(30,34,48,0.16)]">
                <span className="text-[14px] font-normal text-[#3A3F4E] shrink-0">Tope diario</span>
                <span className="text-[16px] font-semibold text-[#1E2230] tabular-nums">
                  {formatMoneda(confirmado.pase.topeDiario, confirmado.pase.moneda)}
                </span>
              </div>
              {confirmado.pase.venceEn && (
                <div className="flex items-baseline justify-between gap-4 py-3.5 border-b border-[rgba(30,34,48,0.16)]">
                  <span className="text-[14px] font-normal text-[#3A3F4E] shrink-0">Vigencia</span>
                  <span className="text-[16px] font-medium text-[#1E2230] text-right">
                    {formatFechaHora(confirmado.pase.venceEn)}
                  </span>
                </div>
              )}
            </div>

            <Link
              to={destinoVolver}
              className="subase-btn-primary subase-btn-tinta subase-btn-flecha mt-8"
            >
              Continuar al bus
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
};

