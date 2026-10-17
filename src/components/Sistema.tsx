import React from 'react';
import { coloresDeRuta, partirNombre, rutaConFlechas } from '../lib/rutas';
import { formatCOP, formatMoneda } from '../lib/format';

/*
SISTEMA DE DISEÑO SÚBASE — elegido por Andrés sobre el inicio del pasajero (prompts/prompt115.md)

REFERENCIA: portada «Terminal del Bus 01» (docs/prototipo-portada.html), estilo Mini Metro, y la señalética de rutas
            de Medellín: el número de la ruta en un cuadro sólido del color de su línea
TIPOGRAFÍA: Poppins (la de la Guía de Marca). Títulos 600 a 34 px (30 px bajo 360 px) con interlineado 1,05; ruta 500
            a 17 px; etiquetas 500 a 12 px en versalitas con tracking 0,12em; montos 600 en cifras tabulares
PALETA:     #F0E9D6 crema de la ilustración · #1E2230 tinta · color de la línea de cada vehículo (lib/rutas.ts) ·
            #3A3F4E texto secundario. Todo sobre el crema, sin negro (diseño final, prompt199)
RIESGO:     la parte de arriba de cada pantalla es un panel crema a sangre (con la escena en el inicio) sobre la app
            negra; las fichas son bloques sólidos, sin cajas ni bordes

Piezas: PanelCrema · IdentidadVehiculo · Titulo · Ruta · Pasaje · Alcance · FichaEstado · ETIQUETA. Botón principal: .subase-btn-primary y,
para acciones que llevan a otra pantalla, .subase-btn-flecha (índex.css).
*/

export const TINTA = '#1E2230';
export const CREMA = '#F0E9D6';
export const ETIQUETA = 'text-[12px] font-medium uppercase tracking-[0.12em]';

/** Panel crema a todo el ancho, arriba de la pantalla, con el texto en tinta. En pantallas anchas el crema sigue
 *  hasta los bordes (una franja, no una tarjeta flotando sobre el negro); el texto se queda en la columna. */
export const PanelCrema: React.FC<{ children: React.ReactNode; className?: string; sinFondo?: boolean }> = ({
  children,
  className = '',
  sinFondo = false,
}) => (
  <section
    className={`-mx-5 -mt-6 px-5 pt-6 pb-7 text-[#1E2230] ${className}`}
    style={
      sinFondo
        ? undefined
        : { backgroundColor: CREMA, boxShadow: `0 0 0 100vmax ${CREMA}`, clipPath: 'inset(0 -100vmax)' }
    }
  >
    {children}
  </section>
);

/** Número de la ruta en un cuadro del color de su línea, con «BUS 01» y la empresa al lado. */
export const IdentidadVehiculo: React.FC<{ vehiculoId: string; nombre: string; className?: string }> = ({
  vehiculoId,
  nombre,
  className = '',
}) => {
  const { tipo, numero, empresa } = partirNombre(nombre);
  const ruta = coloresDeRuta(vehiculoId);
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {numero && (
        <span
          className="inline-flex items-center justify-center min-w-11 h-11 px-2 rounded-[3px] text-[22px] font-semibold tabular-nums leading-none"
          style={{ backgroundColor: ruta.color, color: ruta.texto }}
        >
          {numero}
        </span>
      )}
      <span className="leading-tight">
        <span className={`block ${ETIQUETA} text-[#3A3F4E]`}>
          {tipo} {numero}
        </span>
        {empresa && <span className="block text-[14px] font-normal text-[#3A3F4E] mt-0.5">{empresa}</span>}
      </span>
    </div>
  );
};

export const Titulo: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <h1 className={`text-[30px] min-[360px]:text-[34px] font-semibold leading-[1.05] tracking-[-0.01em] text-balance ${className}`}>
    {children}
  </h1>
);

/** Recorrido del vehículo con flechas entre los tramos. */
export const Ruta: React.FC<{ ruta: string; className?: string }> = ({ ruta, className = '' }) => (
  <p className={`text-[17px] font-medium leading-snug ${className}`}>{rutaConFlechas(ruta)}</p>
);

/** Pasaje: la palabra arriba y el monto en un cuadro tinta, hermano del cuadro con el número de ruta (prompt117).
 *  `grande` es para el monto que protagoniza la pantalla y se lee de lejos (el recaudo del conductor). */
export const Pasaje: React.FC<{
  monto: number;
  /** COP por defecto. Otra moneda (CAD, USD…) se muestra con su código. */
  moneda?: string | null;
  etiqueta?: string;
  grande?: boolean;
  className?: string;
}> = ({ monto, moneda, etiqueta = 'Pasaje', grande = false, className = '' }) => (
  <div className={className}>
    <p className="text-[14px] font-medium text-[#3A3F4E]">{etiqueta}</p>
    <p
      className={`inline-flex mt-1.5 rounded-[3px] ${grande ? 'px-4 py-3' : 'px-3.5 py-2.5'}`}
      style={{ backgroundColor: TINTA }}
    >
      <span
        className={`${
          grande ? 'text-[44px] min-[400px]:text-[52px]' : 'text-[30px]'
        } font-semibold leading-none tabular-nums tracking-[-0.01em] text-white`}
      >
        {formatMoneda(monto, moneda)}
      </span>
    </p>
  </div>
);

/** Texto de apoyo sobre el crema. */
export const Bajada: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p className={`text-[16px] leading-normal text-[#3A3F4E] ${className}`}>{children}</p>
);

/** Ficha de estado: un ícono blanco dentro de un cuadro sólido, hermano del cuadro con el número de ruta. */
export const FichaEstado: React.FC<{
  estado: 'pagado' | 'pendiente' | 'fallido';
  tamano?: number;
  className?: string;
}> = ({ estado, tamano = 44, className = '' }) => {
  const fondo = estado === 'pagado' ? '#2F865F' : estado === 'pendiente' ? TINTA : '#B8403A';
  const icono = Math.round(tamano * 0.6);
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center shrink-0 rounded-[3px] text-white ${className}`}
      style={{ backgroundColor: fondo, width: tamano, height: tamano }}
    >
      <svg width={icono} height={icono} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="square">
        {estado === 'pagado' && <path d="M4.5 12.5l5 5 10-11" />}
        {estado === 'pendiente' && <path d="M12 6v6l4 2.5" />}
        {estado === 'fallido' && <path d="M6 6l12 12M18 6L6 18" />}
      </svg>
    </span>
  );
};

/** Lo que el pase deja pagar hoy, sobre el crema, como la línea del bus: una estación por pasaje (Mini Metro, igual que
 *  la escena). Llenas las ya pagadas, en blanco las que quedan, y la siguiente con un halo del color de la ruta.
 *  Dice «puede pagar» y no «le alcanza»: el tope es un permiso, no plata. Open Payments no deja ver el saldo de la
 *  billetera, y mucha gente en Colombia recarga solo el pasaje del día o de dos días (prompt130). La línea de cuánto
 *  recargar se quitó a pedido de Andrés (prompt140). */
export const Alcance: React.FC<{
  disponible: number;
  tope: number;
  tarifa: number;
  /** Para el color de la línea. */
  vehiculoId?: string;
  /** Fuera del cobro (Mi pase) no hay un bus a la vista: se dice de qué pasaje se habla. */
  conTarifa?: boolean;
  /** Moneda del pase (disponible y tope). La tarifa del bus siempre va en COP. */
  moneda?: string | null;
  className?: string;
}> = ({ disponible, tope, tarifa, vehiculoId, conTarifa = false, moneda, className = '' }) => {
  // Pase en otra moneda (p. ej. CAD): no se pueden contar pasajes sin una tasa de cambio, y la tasa la pone la
  // billetera del pasajero en cada pago. Se dice cuánto le queda en su moneda y que el bus cobra en pesos.
  if (moneda && moneda !== 'COP') {
    return (
      <div className={className}>
        <p className="text-[16px] leading-snug text-[#3A3F4E]">
          Hoy le quedan{' '}
          <span className="font-semibold text-[#1E2230] tabular-nums whitespace-nowrap">{formatMoneda(disponible, moneda)}</span>{' '}
          de su tope. El bus cobra{' '}
          <span className="tabular-nums whitespace-nowrap">{formatCOP(tarifa)}</span> y su billetera lo paga en {moneda} al
          cambio del día.
        </p>
        <p className="mt-1.5 text-[14px] text-[#3A3F4E] tabular-nums">
          Tope diario {formatMoneda(tope, moneda)} · se renueva a medianoche
        </p>
      </div>
    );
  }
  const quedan = tarifa > 0 ? Math.max(0, Math.floor(disponible / tarifa)) : 0;
  const total = tarifa > 0 ? Math.max(quedan, Math.floor(tope / tarifa)) : 0;
  const usados = total - quedan;
  const { color } = coloresDeRuta(vehiculoId);
  // Más de 10 estaciones ya no se cuentan de un vistazo: ahí basta el número
  const dibujar = total > 1 && total <= 10;
  const R = 8.5;
  const PAD = 14;
  const paso = total > 1 ? Math.min(46, (300 - 2 * PAD) / (total - 1)) : 0;
  const ancho = PAD * 2 + paso * (total - 1);
  const ALTO = 36;
  const y = ALTO / 2;
  const plural = (n: number) => (n === 1 ? 'pasaje' : 'pasajes');
  return (
    <div className={className}>
      <p className="text-[16px] leading-snug text-[#3A3F4E]">
        {quedan > 0 ? (
          <>
            Hoy, con su pase, puede pagar{' '}
            <span className="font-semibold text-[#1E2230] tabular-nums whitespace-nowrap">
              {quedan} {plural(quedan)}
              {usados > 0 ? ' más' : ''}
            </span>
            {conTarifa && <span className="tabular-nums"> de {formatCOP(tarifa)}</span>}
          </>
        ) : (
          <>
            <span className="font-semibold text-[#1E2230]">Hoy ya usó todo su pase</span>
            {disponible > 0 && <span className="tabular-nums"> · le quedan {formatCOP(disponible)} del tope</span>}
          </>
        )}
      </p>
      {dibujar && (
        <svg
          aria-hidden="true"
          width={ancho}
          height={ALTO}
          viewBox={`0 0 ${ancho} ${ALTO}`}
          className="block mt-2 -ml-[4px] max-w-[calc(100%+4px)] h-auto"
        >
          <line x1={PAD} y1={y} x2={ancho - PAD} y2={y} stroke={color} strokeWidth={7} strokeLinecap="round" />
          {Array.from({ length: total }, (_, i) => {
            const x = PAD + i * paso;
            const pagado = i < usados;
            const siguiente = i === usados;
            return (
              <g key={i}>
                {siguiente && <circle className="subase-latido" cx={x} cy={y} r={R + 6} fill={color} opacity={0.35} />}
                <circle
                  cx={x}
                  cy={y}
                  r={R}
                  fill={pagado ? TINTA : '#FFFFFF'}
                  stroke={TINTA}
                  strokeWidth={3}
                />
              </g>
            );
          })}
        </svg>
      )}
      <p className="mt-1.5 text-[14px] text-[#3A3F4E] tabular-nums">
        Tope diario {formatCOP(tope)} · se renueva a medianoche
      </p>
    </div>
  );
};

/** Fila de dato: etiqueta secundaria (14 px, tinta 2) y valor (16 px, tinta). */
export const Fila: React.FC<{ etiqueta: string; children: React.ReactNode }> = ({ etiqueta, children }) => (
  <div className="flex items-baseline justify-between gap-4 py-3.5 border-b border-[rgba(30,34,48,0.15)]">
    <span className="text-[14px] font-normal text-[#3A3F4E] shrink-0">{etiqueta}</span>
    <span className="text-[16px] font-medium text-[#1E2230] text-right min-w-0 break-all">{children}</span>
  </div>
);
