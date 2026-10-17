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
