import React from 'react';

/*
 * Pasos del pago con números en cuadros (como el «01» de la ruta), no con íconos de librería. Solo se muestran donde
 * el pasajero está a mitad de camino: en el cobro, antes de activar el pase.
 */
const PASOS = [
  { n: 1 as const, titulo: 'Active su pase', descripcion: 'Una sola vez, en su billetera.' },
  { n: 2 as const, titulo: 'Pague con un toque', descripcion: 'En este bus y en los demás.' },
];

// Colores de los pasos sobre el crema (diseño final: ya no hay variante sobre negro)
const TONO = {
  actual: 'bg-[#1E2230] text-white',
  otro: 'border border-[rgba(30,34,48,0.3)] text-[#3A3F4E]',
  titulo: 'text-[#1E2230]',
  secundario: 'text-[#3A3F4E]',
};

export const PasoLinea: React.FC<{ paso: 1 | 2; tono?: 'crema' }> = ({ paso }) => {
  const t = TONO;
  return (
    <ol className="flex flex-col gap-3" aria-label={`Paso ${paso} de ${PASOS.length}`}>
      {PASOS.map((p) => {
        const actual = p.n === paso;
        return (
          <li key={p.n} className="flex items-start gap-3" aria-current={actual ? 'step' : undefined}>
            <span
              className={`inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-[3px] text-[16px] font-semibold ${
                actual ? t.actual : t.otro
              }`}
            >
              {p.n}
            </span>
            <span className="pt-0.5">
              <span className={`block text-[16px] font-medium leading-snug ${actual ? t.titulo : t.secundario}`}>
                {p.titulo}
              </span>
              <span className={`block text-[14px] leading-snug ${t.secundario}`}>{p.descripcion}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
};

const TEXTO_OPEN_PAYMENTS =
  'Su pase es un grant de Open Payments para pagos salientes (outgoing-payment) con tope diario (debitAmount + interval). En cada viaje creamos un incoming payment en la billetera del bus, una quote y un outgoing payment bajo su pase, sin pedirle nada más. Súbase nunca guarda su plata.';

export const ComoUsamosOpenPayments: React.FC<{ tono?: 'crema' }> = () => (
  <details className="subase-plegable-crema border-t border-[rgba(30,34,48,0.15)] py-1">
    <summary className="min-h-11 flex items-center text-[16px] font-medium cursor-pointer justify-between text-[#1E2230]">
      Cómo usamos Open Payments
    </summary>
    <p className="mt-2 mb-3 text-[14px] font-normal leading-relaxed text-[#3A3F4E]">{TEXTO_OPEN_PAYMENTS}</p>
  </details>
);
