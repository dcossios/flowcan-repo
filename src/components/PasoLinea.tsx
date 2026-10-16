import React from 'react';
import { CircleCheck, QrCode, ShieldCheck } from 'lucide-react';

type PasoN = 1 | 2 | 3;
type Variante = 'vertical' | 'compacta';

const PASOS = [
  {
    n: 1 as const,
    Icon: ShieldCheck,
    titulo: 'Active su pase',
    descripcion: 'Una sola vez autoriza un tope diario.',
  },
  {
    n: 2 as const,
    Icon: QrCode,
    titulo: 'Escanee y pague',
    descripcion: 'El QR del bus abre el cobro. Un toque basta.',
  },
  {
    n: 3 as const,
    Icon: CircleCheck,
    titulo: 'Pagado',
    descripcion: 'El conductor lo ve al instante.',
  },
];

function estadoPaso(n: PasoN, actual: PasoN): 'hecho' | 'actual' | 'pendiente' {
  if (n < actual) return 'hecho';
  if (n === actual) return 'actual';
  return 'pendiente';
}

interface PasoLineaProps {
  paso: PasoN;
  variante: Variante;
}

export const PasoLinea: React.FC<PasoLineaProps> = ({ paso, variante }) => {
  if (variante === 'compacta') {
    return (
      <ol className="flex items-start w-full" aria-label="Pasos del pago">
        {PASOS.map((p, i) => {
          const estado = estadoPaso(p.n, paso);
          const texto =
            estado === 'pendiente' ? 'text-[#C3C5C6]/60' : 'text-white';
          const icono =
            estado === 'actual'
              ? 'text-[#D2B99A]'
              : estado === 'pendiente'
                ? 'text-[#C3C5C6]/60'
                : 'text-white';
          return (
            <React.Fragment key={p.n}>
              {i > 0 && (
                <li
                  aria-hidden="true"
                  className="flex-1 min-w-3 h-px bg-[rgba(195,197,198,0.2)] mt-2.5 mx-1 list-none"
                />
              )}
              <li
                className={`flex flex-col items-center text-center gap-1.5 min-w-0 ${texto}`}
                aria-current={estado === 'actual' ? 'step' : undefined}
              >
                <p.Icon className={`w-5 h-5 shrink-0 ${icono}`} strokeWidth={1.5} />
                <span className="text-[15px] font-normal leading-tight">{p.titulo}</span>
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    );
  }

  return (
    <ol className="flex flex-col" aria-label="Cómo funciona Súbase">
      {PASOS.map((p, i) => {
        const estado = estadoPaso(p.n, paso);
        const texto =
          estado === 'pendiente' ? 'text-[#C3C5C6]/60' : 'text-white';
        const icono =
          estado === 'actual'
            ? 'text-[#D2B99A]'
            : estado === 'pendiente'
              ? 'text-[#C3C5C6]/60'
              : 'text-white';
        const desc =
          estado === 'pendiente' ? 'text-[#C3C5C6]/60' : 'text-[#C3C5C6]';
        const esUltimo = i === PASOS.length - 1;
        return (
          <li key={p.n} className="flex gap-3.5">
            <div className="flex flex-col items-center">
              <p.Icon className={`w-6 h-6 shrink-0 ${icono}`} strokeWidth={1.5} />
              {!esUltimo && (
                <span
                  aria-hidden="true"
                  className="w-px flex-1 min-h-7 bg-[rgba(195,197,198,0.2)] my-1.5"
                />
              )}
            </div>
            <div className={esUltimo ? 'pb-0' : 'pb-5'}>
              <p
                className={`text-[18px] font-normal leading-snug ${texto}`}
                aria-current={estado === 'actual' ? 'step' : undefined}
              >
                {p.titulo}
              </p>
              <p className={`text-[15px] font-normal mt-0.5 leading-snug ${desc}`}>
                {p.descripcion}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
};

const TEXTO_OPEN_PAYMENTS =
  'Su pase es un grant de Open Payments para pagos salientes (outgoing-payment) con tope diario (debitAmount + interval). En cada viaje creamos un incoming payment en la billetera del bus, una quote y un outgoing payment bajo su pase, sin pedirle nada más. Súbase nunca guarda su plata.';

export const ComoUsamosOpenPayments: React.FC = () => {
  return (
    <details className="border-t border-[rgba(195,197,198,0.2)] py-1">
      <summary className="min-h-11 flex items-center text-[15px] font-normal text-white cursor-pointer justify-between">
        Cómo usamos Open Payments
      </summary>
      <p className="mt-2 mb-3 text-[15px] font-normal text-[#C3C5C6] leading-relaxed">
        {TEXTO_OPEN_PAYMENTS}
      </p>
    </details>
  );
};
