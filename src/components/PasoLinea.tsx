import React from 'react';

/*
 * Pasos del pago con números en cuadros (como el «01» de la ruta), no con íconos de librería. Solo se muestran donde
 * el pasajero está a mitad de camino: en el cobro, antes de activar el pase.
 */
const PASOS = [
  { n: 1 as const, titulo: 'Active su pase', descripcion: 'Una sola vez, en su billetera.' },
  { n: 2 as const, titulo: 'Pague con un toque', descripcion: 'En este bus y en los demás.' },
];

export const PasoLinea: React.FC<{ paso: 1 | 2 }> = ({ paso }) => (
  <ol className="flex flex-col gap-3" aria-label={`Paso ${paso} de ${PASOS.length}`}>
    {PASOS.map((p) => {
      const actual = p.n === paso;
      return (
        <li key={p.n} className="flex items-start gap-3" aria-current={actual ? 'step' : undefined}>
          <span
            className={`inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-[3px] text-[16px] font-semibold ${
              actual ? 'bg-white text-[#1E2230]' : 'border border-[rgba(195,197,198,0.35)] text-[#C3C5C6]'
            }`}
          >
            {p.n}
          </span>
          <span className="pt-0.5">
            <span className={`block text-[16px] font-medium leading-snug ${actual ? 'text-white' : 'text-[#C3C5C6]'}`}>
              {p.titulo}
            </span>
            <span className="block text-[14px] text-[#C3C5C6] leading-snug">{p.descripcion}</span>
          </span>
        </li>
      );
    })}
  </ol>
);

const TEXTO_OPEN_PAYMENTS =
  'Su pase es un grant de Open Payments para pagos salientes (outgoing-payment) con tope diario (debitAmount + interval). En cada viaje creamos un incoming payment en la billetera del bus, una quote y un outgoing payment bajo su pase, sin pedirle nada más. Súbase nunca guarda su plata.';

export const ComoUsamosOpenPayments: React.FC = () => {
  return (
    <details className="border-t border-[rgba(195,197,198,0.2)] py-1">
      <summary className="min-h-11 flex items-center text-[16px] font-medium text-white cursor-pointer justify-between">
        Cómo usamos Open Payments
      </summary>
      <p className="mt-2 mb-3 text-[14px] font-normal text-[#C3C5C6] leading-relaxed">
        {TEXTO_OPEN_PAYMENTS}
      </p>
    </details>
  );
};
