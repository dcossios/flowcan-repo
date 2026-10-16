import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import {
  crearPase,
  ErrorCode,
  getFriendlyErrorMessage,
  savePendingPaseContext,
  setUiPreviewMode,
} from '../lib/api';
import { formatCOP, normalizeWalletAddress } from '../lib/format';

const TOPES_DISPONIBLES = [
  {
    numero: '01',
    valor: 10000,
    etiqueta: '$10.000',
    detalle: '~3 pasajes diarios',
    recomendado: false,
  },
  {
    numero: '02',
    valor: 20000,
    etiqueta: '$20.000',
    detalle: '~6 pasajes diarios',
    recomendado: true,
  },
  {
    numero: '03',
    valor: 30000,
    etiqueta: '$30.000',
    detalle: 'Buses + taxi al día',
    recomendado: false,
  },
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
  const volver = searchParams.get('volver') || '/v/bus-101';

  const [walletInput, setWalletInput] = useState<string>(
    () => localStorage.getItem('subase_last_wallet') || 'https://ilp.interledger-test.dev/'
  );
  const [topeDiario, setTopeDiario] = useState<number>(20000);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorInfo, setErrorInfo] = useState<{ code: ErrorCode; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const normalized = normalizeWalletAddress(walletInput);
    if (!normalized || normalized === 'https://') {
      setErrorInfo({
        code: 'OP_ERROR',
        message: 'Ingresa una dirección de wallet válida de Interledger Test Wallet.',
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
      setErrorInfo(getFriendlyErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="flex-1 flex flex-col justify-between gap-6">
        <div>
          <Link
            to={volver}
            className="inline-flex items-center gap-1.5 text-xs font-normal uppercase tracking-wider text-[#C3C5C6] hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 text-[#D2B99A]" strokeWidth={1.5} />
            Volver al vehículo
          </Link>

          <span className="block text-xs font-light uppercase tracking-[0.16em] text-[#D2B99A]">
            AUTORIZACIÓN · UNA VEZ (GNAP)
          </span>
          <h1 className="text-3xl font-light uppercase tracking-wide text-white mt-1">
            ACTIVA TU PASE
          </h1>
          <div className="subase-sand-rule mt-2.5" />
          <p className="text-sm font-light text-[#C3C5C6] mt-3 leading-relaxed">
            Una sola vez: autorizas un límite diario por 30 días. Válido en cualquier bus barrial o
            taxi afiliado.
          </p>
        </div>

        {errorInfo && (
          <div role="alert" className="subase-card-sand p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#D2B99A] shrink-0 mt-0.5" strokeWidth={1.5} />
              <div className="flex-1">
                <p className="text-xs font-mono text-[#D2B99A]">{errorInfo.code}</p>
                <p className="text-sm font-light text-white mt-0.5">{errorInfo.message}</p>
                {errorInfo.code === 'BACKEND_OFFLINE' && (
                  <button
                    type="button"
                    onClick={() => {
                      setUiPreviewMode(true);
                      setErrorInfo(null);
                    }}
                    className="mt-3 inline-flex items-center gap-2 px-3.5 py-2 rounded-[12px] bg-[#113462] border border-[#D2B99A] text-white text-xs font-normal uppercase tracking-wider cursor-pointer min-h-9"
                  >
                    Activar Vista Previa UI para probar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 my-auto">
          {/* 01 · Wallet Address */}
          <div className="subase-card p-5">
            <div className="flex items-baseline gap-2.5">
              <span className="text-lg font-light text-[#D2B99A]">01</span>
              <label
                htmlFor="wallet-address-input"
                className="block text-sm font-normal uppercase tracking-wider text-white"
              >
                Tu Wallet Address
              </label>
            </div>
            <p id="wallet-address-help" className="text-xs font-light text-[#C3C5C6] mt-1">
              Dirección en Interledger Test Wallet (<code className="font-mono">https://</code> o{' '}
              <code className="font-mono">$</code>).
            </p>

            <div className="mt-3">
              <input
                id="wallet-address-input"
                name="walletAddress"
                type="url"
                required
                enterKeyHint="next"
                autoComplete="url"
                aria-describedby="wallet-address-help"
                value={walletInput}
                onChange={(e) => setWalletInput(e.target.value)}
                placeholder="https://ilp.interledger-test.dev/tu-wallet"
                className="w-full px-3.5 py-3 rounded-[12px] border border-white/35 focus:border-[#D2B99A] focus:outline-none font-mono text-sm text-white bg-black/70 placeholder:text-[#C3C5C6]/50"
              />
            </div>

            <div className="mt-3 flex items-center flex-wrap gap-2">
              <span className="text-[11px] font-light text-[#C3C5C6]">Wallets de prueba:</span>
              {WALLETS_DEMO.map((w) => (
                <button
                  key={w.url}
                  type="button"
                  onClick={() => setWalletInput(w.url)}
                  className="text-xs font-light px-2.5 py-1 rounded-[8px] border border-white/25 hover:border-[#D2B99A] text-[#C3C5C6] hover:text-white transition-colors min-h-0 cursor-pointer"
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* 02 · Tope diario */}
          <div className="subase-card p-5">
            <div className="flex items-baseline gap-2.5">
              <span className="text-lg font-light text-[#D2B99A]">02</span>
              <span className="block text-sm font-normal uppercase tracking-wider text-white">
                Límite diario autorizado
              </span>
            </div>
            <p className="text-xs font-light text-[#C3C5C6] mt-1">
              Grant <code className="font-mono">outgoing-payment</code> con{' '}
              <code className="font-mono">debitAmount</code> +{' '}
              <code className="font-mono">interval (P1D)</code>.
            </p>

            <div className="grid grid-cols-3 gap-2.5 mt-3.5" role="radiogroup" aria-label="Tope diario">
              {TOPES_DISPONIBLES.map((item) => {
                const activo = topeDiario === item.valor;
                return (
                  <button
                    key={item.valor}
                    type="button"
                    role="radio"
                    aria-checked={activo}
                    onClick={() => setTopeDiario(item.valor)}
                    className={`relative p-3.5 rounded-[12px] text-left transition-all flex flex-col justify-between cursor-pointer ${
                      activo
                        ? 'bg-[#113462] border border-[#D2B99A] text-white'
                        : 'bg-black/50 border border-white/25 hover:border-white/50 text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[11px] font-light text-[#D2B99A]">
                        {item.recomendado ? 'RECOMENDADO' : item.numero}
                      </span>
                      {activo && <Check className="w-3.5 h-3.5 text-[#D2B99A]" strokeWidth={1.5} />}
                    </div>

                    <span className="text-lg font-light text-white mt-1.5">{item.etiqueta}</span>
                    <span className="text-[11px] font-light text-[#C3C5C6] mt-0.5">
                      {item.detalle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nota de garantías GNAP */}
          <div className="border-t border-b subase-divider py-3.5 text-xs font-light text-[#C3C5C6] space-y-1.5">
            <div className="flex items-center gap-2 font-normal uppercase tracking-wider text-[#D2B99A]">
              <ShieldCheck className="w-4 h-4 text-[#D2B99A] shrink-0" strokeWidth={1.5} />
              <span>CÓMO USAMOS OPEN PAYMENTS</span>
            </div>
            <p>
              Autorizas en tu wallet una sola vez hasta{' '}
              <strong className="font-normal text-white">{formatCOP(topeDiario)}/día</strong>. Sin
              receptor fijo (<code className="font-mono">receiver</code> libre) para que te sirva en
              cualquier ruta.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 px-6 rounded-[12px] bg-[#113462] hover:bg-[#0C4672] active:scale-[0.99] disabled:opacity-50 border border-white/40 text-white font-normal uppercase tracking-[0.1em] text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-[#D2B99A]" strokeWidth={1.5} />
                <span>CONECTANDO CON TU WALLET…</span>
              </>
            ) : (
              <>
                <Wallet className="w-5 h-5 text-[#D2B99A]" strokeWidth={1.5} />
                <span>AUTORIZAR {formatCOP(topeDiario)} DIARIOS</span>
                <ExternalLink className="w-4 h-4 text-[#D2B99A]" strokeWidth={1.5} />
              </>
            )}
          </button>
        </form>
      </div>
    </AppShell>
  );
};
