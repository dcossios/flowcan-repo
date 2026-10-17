import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppShell, mensajeErrorPasajero } from '../components/AppShell';
import { ComoUsamosOpenPayments, PasoLinea } from '../components/PasoLinea';
import { Bajada, ETIQUETA, PanelCrema, Titulo } from '../components/Sistema';
import {
  crearPase,
  ErrorCode,
  getFriendlyErrorMessage,
  savePendingPaseContext,
  setUiPreviewMode,
} from '../lib/api';
import { normalizeWalletAddress } from '../lib/format';

const TOPES_DISPONIBLES = [
  { valor: 10000, etiqueta: '$10.000', sugerido: false },
  { valor: 20000, etiqueta: '$20.000', sugerido: true },
  { valor: 30000, etiqueta: '$30.000', sugerido: false },
];

const WALLETS_DEMO = [
  {
    label: 'Pasajero local',
    url: 'https://ilp.interledger-test.dev/pasajero',
  },
  {
    label: 'Turista (USD)',
    url: 'https://ilp.interledger-test.dev/turista',
  },
];

export const ActivarPasePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const volver = searchParams.get('volver') || '/v/bus-01';
  const isDev = import.meta.env.DEV;

  const [walletInput, setWalletInput] = useState<string>(
    () => localStorage.getItem('subase_last_wallet') || 'https://ilp.interledger-test.dev/'
  );
  const [topeDiario, setTopeDiario] = useState<number>(20000);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorInfo, setErrorInfo] = useState<{ code: ErrorCode; message: string } | null>(
    null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const normalized = normalizeWalletAddress(walletInput);
    if (!normalized || normalized === 'https://') {
      setErrorInfo({
        code: 'OP_ERROR',
        message: 'Ingrese una dirección de billetera válida. Empieza por $ o https://.',
      });
      return;
    }

    setSubmitting(true);
    setErrorInfo(null);

    try {
      localStorage.setItem('subase_last_wallet', normalized);
      const res = await crearPase({
        walletAddress: normalized,
        topeDiario,
        volver,
      });

      savePendingPaseContext({
        paseId: res.paseId,
        volver,
        topeDiario,
      });

      if (res.redirectUrl.startsWith('/')) {
        navigate(res.redirectUrl);
      } else {
        window.location.href = res.redirectUrl;
      }
    } catch (err) {
      const friendly = getFriendlyErrorMessage(err);
      setErrorInfo({
        code: friendly.code,
        message: mensajeErrorPasajero(friendly.code, friendly.message),
      });
      setSubmitting(false);
    }
  };

  return (
    <AppShell barraFija="alta">
      <form id="activar-pase-form" onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <PanelCrema>
          <p className={`${ETIQUETA} text-[#3A3F4E]`}>Se hace una sola vez</p>
          <Titulo className="mt-2.5">Active su pase</Titulo>
          <Bajada className="mt-2">
            Autorice un tope diario en su billetera. Después paga cada viaje con un toque.
          </Bajada>
        </PanelCrema>

        <div className="mt-6">
          <PasoLinea paso={1} variante="vertical" />
        </div>

        {errorInfo && (
          <div role="alert" className="mt-6">
            <p className="text-[15px] font-normal text-white leading-relaxed">
              {errorInfo.message}
            </p>
            {isDev && errorInfo.code === 'BACKEND_OFFLINE' && (
              <button
                type="button"
                onClick={() => {
                  setUiPreviewMode(true);
                  setErrorInfo(null);
                }}
                className="mt-3 min-h-11 px-4 rounded-[12px] border border-[rgba(195,197,198,0.2)] text-[15px] font-normal text-white cursor-pointer"
              >
                Activar Vista Previa UI
              </button>
            )}
            <p className="text-[13px] font-normal text-[#C3C5C6] mt-2">{errorInfo.code}</p>
          </div>
        )}

        <hr className="subase-filete mt-6 mb-6" />

        <label
          htmlFor="wallet-address-input"
          className="block text-[15px] font-normal text-white"
        >
          Dirección de su billetera
        </label>
        <p id="wallet-address-help" className="text-[15px] font-normal text-[#C3C5C6] mt-1">
          Empieza por $ o https://.
        </p>
        <input
          id="wallet-address-input"
          name="walletAddress"
          type="text"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          enterKeyHint="next"
          autoComplete="url"
          aria-describedby="wallet-address-help"
          value={walletInput}
          onChange={(e) => setWalletInput(e.target.value)}
          placeholder="https://ilp.interledger-test.dev/su-billetera"
          className="mt-3 w-full min-h-11 px-3.5 py-3 rounded-[12px] border border-[rgba(195,197,198,0.2)] focus:border-[#D2B99A] focus:outline-none font-mono text-[15px] text-white bg-black placeholder:text-[#C3C5C6]/50"
        />
        <div className="mt-2 flex items-center flex-wrap gap-1">
          {WALLETS_DEMO.map((w) => (
            <button
              key={w.url}
              type="button"
              onClick={() => setWalletInput(w.url)}
              className="inline-flex items-center min-h-11 px-3 text-[13px] font-normal text-[#C3C5C6] hover:text-white cursor-pointer"
            >
              {w.label}
            </button>
          ))}
        </div>

        <hr className="subase-filete mt-6 mb-6" />

        <p className="text-[15px] font-normal text-white">Tope diario</p>
        <div className="grid grid-cols-3 gap-2 mt-3" role="radiogroup" aria-label="Tope diario">
          {TOPES_DISPONIBLES.map((item) => {
            const activo = topeDiario === item.valor;
            return (
              <button
                key={item.valor}
                type="button"
                role="radio"
                aria-checked={activo}
                onClick={() => setTopeDiario(item.valor)}
                className={`min-h-11 px-2 py-3 rounded-[12px] text-center cursor-pointer border ${
                  activo
                    ? 'border-white bg-white text-[#1E2230]'
                    : 'border-[rgba(195,197,198,0.2)] bg-transparent text-white'
                }`}
              >
                <span className={`block text-[13px] font-normal mb-1 h-4 ${activo ? 'text-[#3A3F4E]' : 'text-[#C3C5C6]'}`}>
                  {item.sugerido ? 'Sugerido' : '\u00a0'}
                </span>
                <span className="block text-[18px] font-semibold tabular-nums">{item.etiqueta}</span>
              </button>
            );
          })}
        </div>

        <p className="mt-10 text-[24px] font-light text-white leading-snug">
          Que nadie se quede abajo del bus por no tener efectivo.
        </p>

        <div className="mt-8">
          <ComoUsamosOpenPayments />
        </div>

        <Link
          to={volver}
          className="inline-flex items-center min-h-11 mt-4 text-[15px] font-normal text-[#C3C5C6] hover:text-white"
        >
          Volver al bus
        </Link>
      </form>

      <div className="subase-fixed-bar">
        <div className="subase-fixed-bar-inner">
          <p className="text-[15px] font-normal text-[#C3C5C6] leading-snug mb-3">
            Lo llevamos a su billetera para que apruebe el tope, como cuando paga por PSE.
            Solo se hace una vez.
          </p>
          <button
            type="submit"
            form="activar-pase-form"
            disabled={submitting}
            className={`subase-btn-primary ${submitting ? '' : 'subase-btn-flecha'}`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
                Conectando…
              </>
            ) : (
              'Aprobar en mi billetera'
            )}
          </button>
        </div>
      </div>
    </AppShell>
  );
};
