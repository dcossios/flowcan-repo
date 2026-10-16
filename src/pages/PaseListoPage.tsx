import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import {
  clearPendingPaseContext,
  confirmarPase,
  ConfirmarPaseResponse,
  ErrorCode,
  getFriendlyErrorMessage,
  getPendingPaseContext,
  setPaseToken,
} from '../lib/api';
import { formatCOP, formatFechaHora } from '../lib/format';
import { playPaymentChime } from '../lib/sound';

export const PaseListoPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const confirmedOnceRef = useRef<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [confirmado, setConfirmado] = useState<ConfirmarPaseResponse | null>(null);
  const [errorInfo, setErrorInfo] = useState<{ code: ErrorCode; message: string } | null>(null);

  const pendingCtx = getPendingPaseContext();
  const paseId = searchParams.get('paseId') || pendingCtx?.paseId || '';
  const interactRef =
    searchParams.get('interact_ref') || searchParams.get('interactRef') || '';
  const hash = searchParams.get('hash') || '';
  const destinoVolver = searchParams.get('volver') || pendingCtx?.volver || '/v/bus-101';

  useEffect(() => {
    if (confirmedOnceRef.current) return;
    confirmedOnceRef.current = true;

    async function ejecutarConfirmacion() {
      if (!paseId || !interactRef) {
        setErrorInfo({
          code: 'PASE_INVALIDO',
          message:
            'Faltan parámetros del redirect de la wallet (paseId o interact_ref). Intenta activar el pase nuevamente.',
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
        setErrorInfo(getFriendlyErrorMessage(err));
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
    <AppShell>
      <div className="flex-1 flex flex-col justify-center gap-6 my-auto">
        {loading && (
          <div className="subase-card p-8 text-center flex flex-col items-center">
            <Loader2 className="w-10 h-10 text-[#D2B99A] animate-spin mb-4" strokeWidth={1.5} />
            <span className="text-xs font-light uppercase tracking-[0.16em] text-[#D2B99A]">
              AUTORIZACIÓN · UNA VEZ
            </span>
            <h1 className="text-2xl font-light uppercase tracking-wide text-white mt-1">
              CONFIRMANDO GRANT…
            </h1>
            <p className="text-xs font-light text-[#C3C5C6] mt-2">
              Ejecutando <code className="font-mono">grant.continue</code> con Interledger Open
              Payments
            </p>
          </div>
        )}

        {!loading && errorInfo && (
          <div role="alert" className="subase-card-sand p-6 space-y-5">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-7 h-7 text-[#D2B99A] shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-[#D2B99A]">
                  {errorInfo.code}
                </p>
                <h1 className="text-xl font-light uppercase tracking-wide text-white mt-0.5">
                  NO SE PUDO CONFIRMAR EL PASE
                </h1>
              </div>
            </div>
            <div className="subase-sand-rule" />
            <p className="text-sm font-light text-[#C3C5C6]">{errorInfo.message}</p>

            <div className="pt-2 flex flex-col gap-2.5">
              <Link
                to={`/pase/activar?volver=${encodeURIComponent(destinoVolver)}`}
                className="w-full py-3.5 px-5 rounded-[12px] bg-[#113462] border border-white/40 text-white font-normal uppercase tracking-wider text-xs flex items-center justify-center gap-2 min-h-12"
              >
                Intentar de nuevo
              </Link>
              <Link
                to={destinoVolver}
                className="w-full py-3 px-5 rounded-[12px] border border-white/25 text-[#C3C5C6] hover:text-white font-normal uppercase tracking-wider text-xs flex items-center justify-center min-h-11"
              >
                Volver al vehículo
              </Link>
            </div>
          </div>
        )}

        {!loading && confirmado && (
          <div className="subase-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-light uppercase tracking-[0.16em] text-[#D2B99A]">
                <ShieldCheck className="w-4 h-4 text-[#D2B99A]" strokeWidth={1.5} />
                AUTORIZACIÓN COMPLETADA
              </span>
              <CheckCircle2 className="w-6 h-6 text-[#D2B99A]" strokeWidth={1.5} />
            </div>

            <div>
              <h1 className="text-3xl font-light uppercase tracking-wide text-white">
                PASE ACTIVADO
              </h1>
              <div className="subase-sand-rule mt-2.5" />
              <p className="text-sm font-light text-[#C3C5C6] mt-3">
                Tu límite diario ya está activo. Redirigiendo al vehículo para pagar tu pasaje…
              </p>
            </div>

            <div className="border-t border-b subase-divider py-4 space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-light text-[#C3C5C6]">01 · Disponible hoy</span>
                <span className="font-light text-white text-lg">
                  {formatCOP(confirmado.pase.disponibleHoy)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-light text-[#C3C5C6]">02 · Límite diario</span>
                <span className="font-normal text-[#C3C5C6]">
                  {formatCOP(confirmado.pase.topeDiario)} / día
                </span>
              </div>
              {confirmado.pase.venceEn && (
                <div className="flex items-center justify-between">
                  <span className="font-light text-[#C3C5C6]">03 · Vigencia</span>
                  <span className="font-light text-[#D2B99A]">
                    {formatFechaHora(confirmado.pase.venceEn)}
                  </span>
                </div>
              )}
            </div>

            <Link
              to={destinoVolver}
              className="w-full py-4 px-6 rounded-[12px] bg-[#113462] hover:bg-[#0C4672] border border-white/40 text-white font-normal uppercase tracking-[0.1em] text-sm flex items-center justify-center gap-2.5 min-h-14"
            >
              <span>CONTINUAR AL VEHÍCULO</span>
              <ArrowRight className="w-5 h-5 text-[#D2B99A]" strokeWidth={1.5} />
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
};
