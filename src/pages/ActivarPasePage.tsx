import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppShell, mensajeErrorPasajero } from '../components/AppShell';
import { ComoUsamosOpenPayments } from '../components/PasoLinea';
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

// La billetera se pide sin el prefijo de la Test Wallet: el pasajero escribe solo su nombre. Si pega una dirección
// completa ($… o https://…, de otro proveedor), se usa tal cual.
const PREFIJO = 'https://ilp.interledger-test.dev/';
const PREFIJO_VISIBLE = '$ilp.interledger-test.dev/';
const esDireccionCompleta = (v: string) => /^\$|^https?:\/\/|\//i.test(v.trim());

const BILLETERAS_DEMO = [
  { label: 'pasajero', nombre: 'pasajero' },
  { label: 'turista (USD)', nombre: 'turista' },
];

function nombreGuardado(): string {
  const guardada = localStorage.getItem('subase_last_wallet') || '';
  return guardada.startsWith(PREFIJO) ? guardada.slice(PREFIJO.length) : guardada;
}

export const ActivarPasePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const volver = searchParams.get('volver') || '/v/bus-01';
  const isDev = import.meta.env.DEV;

  const [billetera, setBilletera] = useState<string>(nombreGuardado);
  const [topeDiario, setTopeDiario] = useState<number>(20000);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorInfo, setErrorInfo] = useState<{ code: ErrorCode; message: string } | null>(null);

  const completa = esDireccionCompleta(billetera);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const nombre = billetera.trim();
    if (!nombre) {
      setErrorInfo({ code: 'DATOS_INVALIDOS', message: 'Escriba el nombre de su billetera.' });
      return;
    }
    const normalized = normalizeWalletAddress(completa ? nombre : PREFIJO + nombre);

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
    <AppShell barraFija>
      <form id="activar-pase-form" onSubmit={handleSubmit} className="flex-1 flex flex-col">
        {/* Lo que va a pasar, en una línea: primero el formulario, la explicación larga queda al final y plegada */}
        <PanelCrema>
          <p className={`${ETIQUETA} text-[#3A3F4E]`}>Paso 1 de 2 · una sola vez</p>
          <Titulo className="mt-2.5">Active su pase</Titulo>
          <Bajada className="mt-2">
            Lo llevamos a su billetera para que apruebe un tope diario, como cuando paga por PSE.
          </Bajada>
        </PanelCrema>

        {errorInfo && (
          <div role="alert" className="mt-6">
            <p className="text-[16px] font-medium text-white leading-relaxed">{errorInfo.message}</p>
            {isDev && errorInfo.code === 'BACKEND_OFFLINE' && (
              <button
                type="button"
                onClick={() => {
                  setUiPreviewMode(true);
                  setErrorInfo(null);
                }}
                className="mt-3 min-h-11 px-4 rounded-[12px] border border-[rgba(195,197,198,0.2)] text-[16px] font-medium text-white cursor-pointer"
              >
                Activar Vista Previa UI
              </button>
            )}
            <p className="text-[13px] font-normal text-[#C3C5C6] mt-2">{errorInfo.code}</p>
          </div>
        )}

        <label htmlFor="wallet-address-input" className="block mt-7 text-[17px] font-semibold text-white">
          Su billetera
        </label>
        {/* El prefijo de la Test Wallet va en su propia línea: así el nombre tiene todo el ancho, también a 320 px */}
        <div className="mt-2.5 rounded-[12px] border border-[rgba(195,197,198,0.35)] bg-black px-3.5 py-2.5 focus-within:border-white">
          {!completa && (
            <span className="block font-mono text-[13px] text-[#C3C5C6] select-none">{PREFIJO_VISIBLE}</span>
          )}
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
            autoComplete="username"
            aria-describedby="wallet-address-help"
            value={billetera}
            onChange={(e) => setBilletera(e.target.value)}
            placeholder={completa ? '' : 'su-nombre'}
            className="block w-full min-h-8 bg-transparent font-mono text-[17px] text-white placeholder:text-[#C3C5C6]/50 focus:outline-none"
          />
        </div>
        <p id="wallet-address-help" className="text-[14px] font-normal text-[#C3C5C6] mt-2 leading-snug">
          Si su billetera es de otro proveedor, pegue la dirección completa.
        </p>
        <div className="mt-1 flex items-center flex-wrap gap-x-1 text-[14px] text-[#C3C5C6]">
          <span>Probar con:</span>
          {BILLETERAS_DEMO.map((w) => (
            <button
              key={w.nombre}
              type="button"
              onClick={() => setBilletera(w.nombre)}
              className="inline-flex items-center min-h-11 px-2 text-[14px] font-normal text-[#C3C5C6] underline underline-offset-2 hover:text-white cursor-pointer"
            >
              {w.label}
            </button>
          ))}
        </div>

        <p className="mt-6 text-[17px] font-semibold text-white">Tope diario</p>
        <p className="text-[14px] text-[#C3C5C6] mt-1">Lo máximo que se puede cobrar en un día. Se renueva a medianoche.</p>
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
                  {item.sugerido ? 'Sugerido' : ' '}
                </span>
                <span className="block text-[18px] font-semibold tabular-nums">{item.etiqueta}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-10">
          <ComoUsamosOpenPayments />
        </div>

        <Link
          to={volver}
          className="inline-flex items-center min-h-11 mt-2 text-[14px] font-normal text-[#C3C5C6] hover:text-white"
        >
          Volver al bus
        </Link>
      </form>

      <div className="subase-fixed-bar">
        <div className="subase-fixed-bar-inner">
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
