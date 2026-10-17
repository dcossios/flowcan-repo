import React from 'react';
import { coloresDeRuta, partirNombre, rutaConFlechas } from '../lib/rutas';
import { formatCOP } from '../lib/format';

/*
SISTEMA DE DISEÑO SÚBASE — elegido por Andrés sobre el inicio del pasajero (prompts/prompt115.md)

REFERENCIA: portada «Terminal del Bus 01» (docs/prototipo-portada.html), estilo Mini Metro, y la señalética de rutas
            de Medellín: el número de la ruta en un cuadro sólido del color de su línea
TIPOGRAFÍA: Poppins (la de la Guía de Marca). Títulos 600 a 34 px (30 px bajo 360 px) con interlineado 1,05; ruta 500
            a 17 px; etiquetas 500 a 12 px en versalitas con tracking 0,12em; montos 600 en cifras tabulares
PALETA:     #F0E9D6 crema de la ilustración · #1E2230 tinta · color de la línea de cada vehículo (lib/rutas.ts) ·
            #3A3F4E texto secundario sobre crema · negro y #C3C5C6 debajo, como en el resto de la marca
RIESGO:     la parte de arriba de cada pantalla es un panel crema a sangre (con la escena en el inicio) sobre la app
            negra; las fichas son bloques sólidos, sin cajas ni bordes

Piezas: PanelCrema · IdentidadVehiculo · Titulo · Ruta · Pasaje · ETIQUETA. Botón principal: .subase-btn-primary y,
para acciones que llevan a otra pantalla, .subase-btn-flecha (índex.css).
*/

export const TINTA = '#1E2230';
export const CREMA = '#F0E9D6';
export const ETIQUETA = 'text-[12px] font-medium uppercase tracking-[0.12em]';

/** Panel crema a todo el ancho, arriba de la pantalla, con el texto en tinta. */
export const PanelCrema: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <section className={`-mx-5 -mt-6 px-5 pt-6 pb-7 text-[#1E2230] ${className}`} style={{ backgroundColor: CREMA }}>
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
  <h1 className={`text-[30px] min-[360px]:text-[34px] font-semibold leading-[1.05] tracking-[-0.01em] ${className}`}>
    {children}
  </h1>
);

/** Recorrido del vehículo con flechas entre los tramos. */
export const Ruta: React.FC<{ ruta: string; className?: string }> = ({ ruta, className = '' }) => (
  <p className={`text-[17px] font-medium leading-snug ${className}`}>{rutaConFlechas(ruta)}</p>
);

/** Pasaje: la palabra arriba y el monto en un cuadro tinta, hermano del cuadro con el número de ruta (prompt117). */
export const Pasaje: React.FC<{ monto: number; etiqueta?: string; className?: string }> = ({
  monto,
  etiqueta = 'Pasaje',
  className = '',
}) => (
  <div className={className}>
    <p className="text-[14px] font-medium text-[#3A3F4E]">{etiqueta}</p>
    <p className="inline-flex mt-1.5 rounded-[3px] px-3.5 py-2.5" style={{ backgroundColor: TINTA }}>
      <span className="text-[30px] font-semibold leading-none tabular-nums tracking-[-0.01em] text-white">
        {formatCOP(monto)}
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

/** Lo que le queda del tope de hoy, sobre el crema: responde «¿me alcanza?» antes de tocar «Pagar». */
export const Disponible: React.FC<{ disponible: number; tope: number; className?: string }> = ({
  disponible,
  tope,
  className = '',
}) => {
  const pct = tope > 0 ? Math.min(100, Math.max(0, Math.round((disponible / tope) * 100))) : 0;
  return (
    <div className={className}>
      <p className="text-[16px] leading-snug text-[#3A3F4E]">
        Le quedan <span className="font-semibold text-[#1E2230] tabular-nums">{formatCOP(disponible)}</span> de{' '}
        {formatCOP(tope)} hoy
      </p>
      <div aria-hidden="true" className="mt-2 h-[6px] w-full max-w-[280px] bg-[#DCD2BF]">
        <div className="h-full" style={{ width: `${pct}%`, backgroundColor: TINTA }} />
      </div>
    </div>
  );
};

/** Fila de dato en el negro: etiqueta terciaria (14 px gris) y valor secundario (16 px blanco). */
export const Fila: React.FC<{ etiqueta: string; children: React.ReactNode }> = ({ etiqueta, children }) => (
  <div className="flex items-baseline justify-between gap-4 py-3.5 border-b border-[rgba(195,197,198,0.2)]">
    <span className="text-[14px] font-normal text-[#C3C5C6] shrink-0">{etiqueta}</span>
    <span className="text-[16px] font-medium text-white text-right min-w-0 break-all">{children}</span>
  </div>
);
