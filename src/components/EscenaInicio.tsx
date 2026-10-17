import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ayacuchoBase from '../assets/escenas/ayacucho-base.webp';
import ayacuchoIsla from '../assets/escenas/ayacucho-isla.webp';
import ayacuchoDerecha from '../assets/escenas/ayacucho-derecha.webp';

/*
 * Escena del inicio del pasajero: la esquina del Tranvía de Ayacucho (ilustración de Flow con las calles vueltas
 * transparentes) y, en SVG, las calles en azul noche, la línea del tranvía, la de la buseta, la cuadrícula amarilla
 * del cruce y los dos vehículos. Todo va en las coordenadas de la imagen (768 × 1376).
 *
 * Capas, de atrás hacia adelante: noche, líneas y cuadrícula → imagen base → buseta antes del cruce → isla izquierda →
 * tranvía → acera derecha → buseta después del cruce → acera de abajo → cable. Así cada vehículo pasa por detrás de lo
 * que en la esquina real le queda adelante.
 */

const ANCHO = 768;
const ALTO = 1376;
const CREMA = '#F0E9D6'; // crema exacto de la ilustración (muestreado)
const NOCHE = '#1E2230';
const ACERA = '#E6DCD3'; // acera de la ilustración (muestreada)
const TRANVIA = '#159B4C'; // Línea T del Metro de Medellín (ficha de Wikipedia)
const AMARILLO = '#F3C85E'; // cuadrícula de la imagen original de Flow (muestreado)
const TECHO = 341; // el techo más alto de la ilustración: el encuadre lo deja siempre bajo el texto

// Ejes del suelo medidos en la ilustración. O es el centro del cruce. U sigue la calle de la buseta (abajo a la
// derecha, 29,07°) y V la del tranvía (abajo a la izquierda, 28,78°). El cruce va de u = ±122,5 y v = ±96,2.
const O: [number, number] = [444, 1236.5];
const U: [number, number] = [0.874, 0.4858];
const V: [number, number] = [-0.8765, 0.4815];
const CRUCE_U = 122.5;
const CRUCE_V = 96.2;

const proj = (u: number, v: number, z = 0): [number, number] => [O[0] + U[0] * u + V[0] * v, O[1] + U[1] * u + V[1] * v - z];
const puntos = (pts: [number, number][]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
const rectSuelo = (u0: number, u1: number, v0: number, v1: number) => puntos([proj(u0, v0), proj(u1, v0), proj(u1, v1), proj(u0, v1)]);

// Líneas centradas en sus calles: el tranvía a lo largo de V, la buseta a lo largo de U.
const ANCHO_LINEA_TRANVIA = 120;
const ANCHO_LINEA_BUS = 96;

/* Cuadrícula amarilla medida en la imagen original de Flow: rombo del cruce con contorno de 5,5 px, verticales de
   6,5 px cada 56,9 px desde x = 309,9 y horizontales de 4 px cada 34,4 px desde y = 1159. */
const ROMBO: [number, number][] = [
  [252, 1223],
  [422, 1131],
  [636, 1250],
  [466, 1342],
];
const Cuadricula: React.FC = () => {
  const interior = ROMBO.map(([x, y]) => [O[0] + (x - O[0]) * 0.97, O[1] + (y - O[1]) * 0.97] as [number, number]);
  const verticales = Array.from({ length: 6 }, (_, k) => 309.9 + 56.9 * k);
  const horizontales = Array.from({ length: 6 }, (_, k) => 1159 + 34.4 * k);
  return (
    <g stroke={AMARILLO} fill="none">
      <clipPath id="subase-rombo">
        <polygon points={puntos(ROMBO)} />
      </clipPath>
      <g clipPath="url(#subase-rombo)">
        {verticales.map((x) => (
          <line key={`v${x}`} x1={x} y1={1100} x2={x} y2={1380} strokeWidth={6.5} />
        ))}
        {horizontales.map((y) => (
          <line key={`h${y}`} x1={230} y1={y} x2={660} y2={y} strokeWidth={4} />
        ))}
      </g>
      <polygon points={puntos(interior)} strokeWidth={5.5} strokeLinejoin="miter" />
    </g>
  );
};

// Acera de abajo, alineada con la acera derecha y con el borde del cruce (la de Flow se metía 30 px en la calle).
const RADIO_ACERA = 26;
function aceraAbajo(): string {
  const cu = CRUCE_U + RADIO_ACERA;
  const cv = CRUCE_V + RADIO_ACERA;
  const pts: [number, number][] = [proj(CRUCE_U, 900)];
  for (let i = 0; i <= 8; i++) {
    const t = Math.PI + (Math.PI / 2) * (i / 8);
    pts.push(proj(cu + RADIO_ACERA * Math.cos(t), cv + RADIO_ACERA * Math.sin(t)));
  }
  pts.push(proj(900, CRUCE_V), proj(900, 900));
  return puntos(pts);
}

function mezclar(a: string, b: string, k: number): string {
  const ca = parseInt(a.slice(1), 16);
  const cb = parseInt(b.slice(1), 16);
  const c = (s: number) => Math.round(((ca >> s) & 255) * (1 - k) + ((cb >> s) & 255) * k).toString(16).padStart(2, '0');
  return `#${c(16)}${c(8)}${c(0)}`;
}
const oscurecer = (hex: string, f: number) => mezclar(hex, '#000000', 1 - f);
const escaparXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

interface Pose {
  u: number;
  v: number;
  hu: number;
  hv: number;
}

// Una cara vertical: t la recorre de un borde al otro; z es la altura.
interface Cara {
  rect: (t0: number, t1: number, z0: number, z1: number) => string;
  rueda: (t: number, radio: number, largo: number) => string;
  texto: (z: number, contenido: string, tam: number) => string;
  frente: boolean;
}

interface Bloque {
  largo: number;
  ancho: number;
  alto: number;
  techo: string;
  cuerpo: string;
  sombraCaras: number;
  costado?: (c: Cara) => string;
  extremo?: (c: Cara) => string;
}

/** Bloque orientado según el rumbo: sombra plana, caras verticales que miran al espectador y techo. */
function bloque(p: Pose, b: Bloque): string {
  const nu = -p.hv;
  const nv = p.hu;
  const esq = (sl: number, sw: number): [number, number] => [
    p.u + (p.hu * b.largo * sl) / 2 + (nu * b.ancho * sw) / 2,
    p.v + (p.hv * b.largo * sl) / 2 + (nv * b.ancho * sw) / 2,
  ];
  const FL = esq(1, 1);
  const FR = esq(1, -1);
  const BL = esq(-1, 1);
  const BR = esq(-1, -1);

  // Sombra plana hacia abajo a la derecha (luz desde arriba a la izquierda): la huella estirada a lo largo de +U.
  const us = [FL, FR, BL, BR].map((q) => q[0]);
  const vs = [FL, FR, BL, BR].map((q) => q[1]);
  let s = `<polygon points="${rectSuelo(Math.min(...us), Math.max(...us) + b.alto * 0.45, Math.min(...vs), Math.max(...vs))}" fill="rgba(0,0,0,.28)"/>`;

  const caras: { a: [number, number]; b: [number, number]; n: [number, number]; tipo: 'frente' | 'cola' | 'costado' }[] = [
    { a: FR, b: FL, n: [p.hu, p.hv], tipo: 'frente' },
    { a: BL, b: BR, n: [-p.hu, -p.hv], tipo: 'cola' },
    { a: FL, b: BL, n: [nu, nv], tipo: 'costado' },
    { a: BR, b: FR, n: [-nu, -nv], tipo: 'costado' },
  ];
  for (const cara of caras) {
    if (cara.n[0] + cara.n[1] <= 0.001) continue; // mira hacia atrás: no se ve
    const pt = (t: number, z: number) =>
      proj(cara.a[0] + (cara.b[0] - cara.a[0]) * t, cara.a[1] + (cara.b[1] - cara.a[1]) * t, z);
    // Luz desde arriba a la izquierda: las caras que miran a la derecha son más oscuras.
    const k = (cara.n[0] - cara.n[1] + Math.SQRT2) / (2 * Math.SQRT2);
    s += `<polygon points="${puntos([pt(0, 0), pt(1, 0), pt(1, b.alto), pt(0, b.alto)])}" fill="${mezclar(b.cuerpo, oscurecer(b.cuerpo, b.sombraCaras), k)}"/>`;
    const c: Cara = {
      rect: (t0, t1, z0, z1) => puntos([pt(t0, z0), pt(t1, z0), pt(t1, z1), pt(t0, z1)]),
      rueda: (t, radio, largo) => {
        const pts: [number, number][] = [];
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 10) pts.push(pt(t + (radio / largo) * Math.cos(a), radio + radio * Math.sin(a)));
        return puntos(pts);
      },
      // Texto pegado a la cara, leído de izquierda a derecha en pantalla.
      texto: (z, contenido, tam) => {
        let [x0, y0] = pt(0, z);
        let [x1, y1] = pt(1, z);
        if (x1 < x0) [x0, y0, x1, y1] = [x1, y1, x0, y0];
        const largo = Math.hypot(x1 - x0, y1 - y0);
        const ux = (x1 - x0) / largo;
        const uy = (y1 - y0) / largo;
        return `<text transform="matrix(${ux.toFixed(4)},${uy.toFixed(4)},0,1,${((x0 + x1) / 2).toFixed(1)},${((y0 + y1) / 2).toFixed(1)})" text-anchor="middle" font-size="${tam.toFixed(1)}" font-weight="600" letter-spacing="0.4" fill="#1E2230">${escaparXml(contenido)}</text>`;
      },
      frente: cara.tipo === 'frente',
    };
    if (cara.tipo === 'costado' && b.costado) s += b.costado(c);
    if (cara.tipo !== 'costado' && b.extremo) s += b.extremo(c);
  }
  s += `<polygon points="${puntos([proj(FL[0], FL[1], b.alto), proj(FR[0], FR[1], b.alto), proj(BR[0], BR[1], b.alto), proj(BL[0], BL[1], b.alto)])}" fill="${b.techo}"/>`;
  return s;
}

interface ColoresRuta {
  color: string;
  oscuro: string;
}

// Colores del universo: Bus 01 rojo, Bus 02 verde (validado para daltonismo frente al azul del Metro).
const RUTAS: Record<string, ColoresRuta> = {
  'bus-02': { color: '#3FB27F', oscuro: '#2F865F' },
};
const RUTA_BASE: ColoresRuta = { color: '#EE5A52', oscuro: '#B8403A' };

function coloresDeRuta(vehiculoId?: string): ColoresRuta {
  return (vehiculoId && RUTAS[vehiculoId]) || RUTA_BASE;
}

// Buseta en bloque a la escala de la fachada (la puerta de la esquina mide unos 65 px): letrero de la ruta en el costado.
const BL = 220;
const BW = 62;
const BH = 72;

const buseta = (ruta: ColoresRuta, letrero: string): Bloque => ({
  largo: BL,
  ancho: BW,
  alto: BH,
  techo: ruta.color,
  cuerpo: ruta.oscuro,
  sombraCaras: 0.85,
  costado: (c) => {
    let s = `<polygon points="${c.rect(0.06, 0.94, 52, 66)}" fill="#F4EFE6"/>`; // letrero de ruta
    if (letrero) s += c.texto(62.5, letrero.toUpperCase(), Math.min(12, (0.8 * BL) / Math.max(1, letrero.length * 0.62)));
    for (let i = 0; i < 6; i++) s += `<polygon points="${c.rect(0.08 + i * 0.135, 0.18 + i * 0.135, 27, 47)}" fill="#DDEFF7"/>`;
    s += `<polygon points="${c.rueda(0.16, 11, BL)}" fill="#1E2230"/><polygon points="${c.rueda(0.84, 11, BL)}" fill="#1E2230"/>`;
    return s;
  },
  extremo: (c) =>
    c.frente
      ? `<polygon points="${c.rect(0.06, 0.94, 27, 63)}" fill="#2B3240"/>` +
        `<polygon points="${c.rect(0.09, 0.24, 8, 15)}" fill="#FFE08A"/><polygon points="${c.rect(0.76, 0.91, 8, 15)}" fill="#FFE08A"/>`
      : '',
});

// Tranvía Translohr articulado (blanco con franja verde, como en la foto): tres módulos.
const MODULO = 86;
const JUNTA = 7;
const LARGO_TRANVIA = 3 * MODULO + 2 * JUNTA;
const moduloTranvia = (cabina: 'frente' | 'cola' | null): Bloque => ({
  largo: MODULO,
  ancho: 66,
  alto: 74,
  techo: '#F4F5F7',
  cuerpo: '#E6EBEF',
  sombraCaras: 0.9,
  costado: (c) =>
    `<polygon points="${c.rect(0.08, 0.92, 30, 58)}" fill="#3A4454"/><polygon points="${c.rect(0, 1, 10, 20)}" fill="${TRANVIA}"/>`,
  extremo: (c) =>
    `<polygon points="${c.rect(0, 1, 10, 20)}" fill="${TRANVIA}"/>` +
    // Cabina con parabrisas solo en las dos puntas del tranvía, no en las juntas entre módulos
    ((cabina === 'frente') === c.frente && cabina ? `<polygon points="${c.rect(0.08, 0.92, 28, 64)}" fill="#2B3240"/>` : ''),
});

// Recorridos de fuera de cuadro a fuera de cuadro y ciclo común de 16 s. La buseta ocupa el cruce hacia los 3,3–7,7 s
// y el tranvía, con 8 s de desfase, hacia los 10,9–16,2 s: nunca se encuentran en la cuadrícula.
const BUS_U0 = -660;
const BUS_U1 = 560;
const TRANVIA_V0 = -420;
const TRANVIA_V1 = 730;
const VEL_BUS = 120;
const VEL_TRANVIA = 100;
const CICLO = 16;
const DESFASE_TRANVIA = 8;
const ciclo = (t: number) => ((t % CICLO) + CICLO) % CICLO;

interface Cuadro {
  busAtras: string;
  tranvia: string;
  busAdelante: string;
}

function vehiculos(tBus: number, tTranvia: number, ruta: ColoresRuta, letrero: string): Cuadro {
  const cuadro: Cuadro = { busAtras: '', tranvia: '', busAdelante: '' };

  const u = BUS_U0 + VEL_BUS * ciclo(tBus);
  if (u <= BUS_U1) {
    const svg = bloque({ u, v: 0, hu: 1, hv: 0 }, buseta(ruta, letrero));
    // Antes del centro del cruce la tapa la isla izquierda; después, solo la acera de abajo.
    if (u < 0) cuadro.busAtras = svg;
    else cuadro.busAdelante = svg;
  }

  const cabeza = TRANVIA_V0 + VEL_TRANVIA * ciclo(tTranvia - DESFASE_TRANVIA);
  if (cabeza - LARGO_TRANVIA <= TRANVIA_V1) {
    const cabinas = ['cola', null, 'frente'] as const; // de atrás hacia adelante, para dibujar primero lo más lejano
    for (let i = 0; i < 3; i++) {
      const v = cabeza - LARGO_TRANVIA + MODULO / 2 + i * (MODULO + JUNTA);
      cuadro.tranvia += bloque({ u: 0, v, hu: 0, hv: 1 }, moduloTranvia(cabinas[i]));
    }
  }
  return cuadro;
}

const Escena: React.FC<{ ruta: ColoresRuta; letrero: string; viewBoxY: number }> = ({ ruta, letrero, viewBoxY }) => {
  const busAtras = useRef<SVGGElement>(null);
  const tranvia = useRef<SVGGElement>(null);
  const busAdelante = useRef<SVGGElement>(null);

  useEffect(() => {
    const pintar = (tBus: number, tTranvia: number) => {
      const c = vehiculos(tBus, tTranvia, ruta, letrero);
      if (busAtras.current) busAtras.current.innerHTML = c.busAtras;
      if (tranvia.current) tranvia.current.innerHTML = c.tranvia;
      if (busAdelante.current) busAdelante.current.innerHTML = c.busAdelante;
    };
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      pintar(3, 9.8); // quietos y a la vista: la buseta llegando al cruce y el tranvía entrando por la derecha
      return;
    }
    let id = 0;
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const t = (ahora - inicio) / 1000;
      pintar(t, t);
      id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [ruta, letrero]);

  const alto = ALTO - viewBoxY;

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox={`0 ${viewBoxY.toFixed(1)} ${ANCHO} ${alto.toFixed(1)}`}
      preserveAspectRatio="xMidYMin slice"
      aria-hidden="true"
    >
      <rect x={0} y={0} width={ANCHO} height={ALTO} fill={NOCHE} />
      <polygon points={rectSuelo(-ANCHO_LINEA_TRANVIA / 2, ANCHO_LINEA_TRANVIA / 2, -1200, 1200)} fill={TRANVIA} />
      <polygon points={rectSuelo(-1200, 1200, -ANCHO_LINEA_BUS / 2, ANCHO_LINEA_BUS / 2)} fill={ruta.color} />
      <Cuadricula />
      <image href={ayacuchoBase} x={0} y={0} width={ANCHO} height={ALTO} />
      <g ref={busAtras} />
      <image href={ayacuchoIsla} x={0} y={955} width={260} height={421} />
      <g ref={tranvia} />
      <image href={ayacuchoDerecha} x={628} y={1140} width={140} height={236} />
      <g ref={busAdelante} />
      <polygon points={aceraAbajo()} fill={ACERA} />
      {/* Cable que cruza la calle hasta el semáforo de la esquina (la calle de la imagen se volvió transparente) */}
      <line x1={0} y1={1250.4} x2={420} y2={1038.8} stroke="#2A2F29" strokeWidth={1.6} />
    </svg>
  );
};

/**
 * Panel a todo el ancho con la escena; el texto (children) va en tinta oscura sobre el campo crema de arriba.
 * El encuadre se ajusta al alto real del texto para que el techo nunca lo toque, y el panel crece lo necesario para
 * mostrar la escena completa, cuadrícula incluida.
 */
export const PanelEscena: React.FC<{ vehiculoId?: string; letrero?: string; children: React.ReactNode }> = ({
  vehiculoId,
  letrero = '',
  children,
}) => {
  const ruta = coloresDeRuta(vehiculoId);
  const panel = useRef<HTMLElement>(null);
  const texto = useRef<HTMLDivElement>(null);
  const [viewBoxY, setViewBoxY] = useState(-80);

  useLayoutEffect(() => {
    const medir = () => {
      if (!panel.current || !texto.current) return;
      const k = panel.current.clientWidth / ANCHO; // px de pantalla por unidad de la imagen
      const bajoTexto = texto.current.offsetTop + texto.current.offsetHeight + 14;
      setViewBoxY(Math.min(0, TECHO - bajoTexto / k));
    };
    medir();
    const ro = new ResizeObserver(medir);
    if (panel.current) ro.observe(panel.current);
    if (texto.current) ro.observe(texto.current);
    return () => ro.disconnect();
  }, []);

  return (
    <section
      ref={panel}
      className="relative -mx-5 -mt-6 overflow-hidden text-[#1E2230]"
      style={{ backgroundColor: CREMA, aspectRatio: `${ANCHO} / ${(ALTO - viewBoxY).toFixed(1)}` }}
    >
      <Escena ruta={ruta} letrero={letrero} viewBoxY={viewBoxY} />
      <div ref={texto} className="relative z-10 px-5 pt-6">
        {children}
      </div>
    </section>
  );
};

/** Raya corta bajo el título, en el color de la línea de la escena. */
export const RayaRuta: React.FC<{ vehiculoId?: string }> = ({ vehiculoId }) => (
  <div className="w-[45px] h-[3px] mt-2.5" style={{ backgroundColor: coloresDeRuta(vehiculoId).color }} />
);
