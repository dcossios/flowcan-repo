import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppShell, mensajeErrorPasajero } from '../components/AppShell';
import { PasoLinea } from '../components/PasoLinea';
import { Bajada, PanelCrema, Titulo } from '../components/Sistema';
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

  const paso: 1 | 2 | 3 = confirmado ? 2 : 1;

  return (
    <AppShell>
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
              <Titulo>No se pudo confirmar el pase</Titulo>
              <Bajada className="mt-2">{errorInfo.message}</Bajada>
            </div>
          )}
          {!loading && confirmado && (
            <>
              <Titulo>Pase activo</Titulo>
              <Bajada className="mt-2">Su tope diario ya está autorizado. Lo llevamos al bus para pagar.</Bajada>
            </>
          )}
        </PanelCrema>

        <div className="mt-6">
          <PasoLinea paso={paso} variante="compacta" />
        </div>

        {!loading && errorInfo && (
          <div className="mt-8 flex-1 flex flex-col">
            <div className="flex flex-col gap-3">
              <Link
                to={`/pase/activar?volver=${encodeURIComponent(destinoVolver)}`}
                className="subase-btn-primary subase-btn-flecha"
              >
                Intentar de nuevo
              </Link>
              <Link
                to={destinoVolver}
                className="inline-flex items-center justify-center min-h-11 text-[15px] font-normal text-[#C3C5C6] hover:text-white"
              >
                Volver al bus
              </Link>
            </div>
            <p className="text-[13px] font-normal text-[#C3C5C6] mt-8">{errorInfo.code}</p>
          </div>
        )}

        {!loading && confirmado && (
          <div className="mt-6 flex-1 flex flex-col">
            <hr className="subase-filete mb-6" />
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[15px] font-normal text-[#C3C5C6]">Disponible hoy</span>
              <span className="text-[32px] font-semibold text-white leading-none tabular-nums">
                {formatCOP(confirmado.pase.disponibleHoy)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-4 mt-4">
              <span className="text-[15px] font-normal text-[#C3C5C6]">Tope diario</span>
              <span className="text-[15px] font-normal text-white">{formatCOP(confirmado.pase.topeDiario)}</span>
            </div>
            {confirmado.pase.venceEn && (
              <div className="flex items-baseline justify-between gap-4 mt-4">
                <span className="text-[15px] font-normal text-[#C3C5C6]">Vigencia</span>
                <span className="text-[15px] font-normal text-white">{formatFechaHora(confirmado.pase.venceEn)}</span>
              </div>
            )}

            <Link to={destinoVolver} className="subase-btn-primary subase-btn-flecha mt-10">
              Continuar al bus
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
};
