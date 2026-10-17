import React, { useEffect, useRef } from 'react';
import ayacucho from '../assets/escenas/ayacucho.webp';

/*
 * Escena del inicio del pasajero: un solo SVG en capas, en el sistema de coordenadas de la ilustración (768 × 1376):
 *   1. Los dos campos (crema y noche) y las líneas: la ruta del bus en L alrededor de la esquina izquierda (pasa por
 *      detrás del edificio) y el tranvía recto por el costado derecho, como en la avenida Ayacucho real.
 *   2. Los vehículos que van por detrás del edificio.
 *   3. La ilustración de Flow (Tranvía de Ayacucho, solo la manzana) con el fondo vuelto transparente.
 *   4. Los vehículos que van por delante. Se calculan cuadro a cuadro sobre su línea para que doblen la esquina.
 */

const ANCHO = 768;
const ALTO = 1376;
const CREMA = '#F0E7D6'; // crema exacto de la ilustración (muestreado)
const NOCHE = '#1E2230';
const TRANVIA = '#159B4C'; // Línea T del Metro de Medellín (ficha de Wikipedia)

// Encuadre: la escena se aleja (ESCALA) anclada a la derecha, para que quepa el tranvía por el costado derecho del
// edificio. El panel conserva la proporción de la imagen; el título sigue sobre el crema de arriba.
const ESCALA = 1.16;
const VB_W = ANCHO * ESCALA;
const VB_H = ALTO * ESCALA;
const VB_X = ANCHO - VB_W;
const VB_Y = -125; // baja la escena: a 320 px el techo queda por debajo de la bajada; el cruce sigue a la vista

// Ejes del suelo medidos en la ilustración. Origen: la esquina izquierda del andén.
// u corre por el andén del frente (y = 0,5512 x + 1052,8; 28,86°); v corre por el andén derecho (30,0°) hacia el
// espectador. La manzana ocupa 0 < u < 462 y v < 0; el andén derecho está en u = 462.
const U: [number, number] = [0.8758, 0.4828];
const V: [number, number] = [-0.866, 0.5];
const O: [number, number] = [155, 1138.2];
const SUELO = `matrix(${U[0]},${U[1]},${V[0]},${V[1]},${O[0]},${O[1]})`;
const ANDEN_DERECHO = 462;

const proj = (u: number, v: number, z = 0): [number, number] => [O[0] + U[0] * u + V[0] * v, O[1] + U[1] * u + V[1] * v - z];
const puntos = (pts: [number, number][]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

// Frontera de los campos sobre el eje v: crema arriba a la izquierda (el título), noche hacia abajo a la derecha.
// Pasa por debajo del texto en todos los anchos (a 320 px, ~40 px bajo la bajada) y por fuera de las dos líneas.
const FRONTERA_U = -220;

interface Pose {
  u: number;
  v: number;
  hu: number;
  hv: number;
}

interface Linea {
  trazo: string;
  total: number;
  pose: (s: number) => Pose;
  /** Distancia hasta la que la pieza va por detrás del edificio. */
  detras: number;
}

/** Línea en L: baja por la izquierda de la manzana (detrás del edificio), dobla en la esquina y sigue el andén. */
function lineaEnL(g: number, r: number, vIni: number, uFin: number): Linea {
  const l1 = g - r - vIni;
  const la = (r * Math.PI) / 2;
  const l2 = uFin + g - r;
  return {
    trazo: `M ${-g} ${vIni} L ${-g} ${g - r} A ${r} ${r} 0 0 0 ${-g + r} ${g} L ${uFin} ${g}`,
    total: l1 + la + l2,
    detras: l1 + la / 2,
    pose: (s) => {
      if (s < l1) return { u: -g, v: vIni + s, hu: 0, hv: 1 };
      if (s < l1 + la) {
        const phi = Math.PI - (s - l1) / r;
        return { u: -g + r + r * Math.cos(phi), v: g - r + r * Math.sin(phi), hu: Math.sin(phi), hv: -Math.cos(phi) };
      }
      return { u: -g + r + (s - l1 - la), v: g, hu: 1, hv: 0 };
    },
  };
}

/** Línea recta a lo largo de v (paralela al andén derecho), siempre por delante del edificio. */
function lineaRecta(u: number, vIni: number, vFin: number): Linea {
  return {
    trazo: `M ${u} ${vIni} L ${u} ${vFin}`,
    total: vFin - vIni,
    detras: -1,
    pose: (s) => ({ u, v: vIni + s, hu: 0, hv: 1 }),
  };
}

// Bus: L concéntrica a la esquina izquierda, a 96 del andén. Tranvía: recto a 36 del andén derecho.
// Los extremos quedan justo fuera de la vista (detrás del edificio o fuera de cuadro) para no dejar ratos vacíos.
const LINEA_BUS = lineaEnL(96, 110, -320, 920);
const LINEA_TRANVIA = lineaRecta(ANDEN_DERECHO + 36, -420, 560);
const ANCHO_BUS = 44;
const ANCHO_TRANVIA = 30;

function mezclar(a: string, b: string, k: number): string {
  const ca = parseInt(a.slice(1), 16);
  const cb = parseInt(b.slice(1), 16);
  const c = (s: number) => Math.round(((ca >> s) & 255) * (1 - k) + ((cb >> s) & 255) * k).toString(16).padStart(2, '0');
  return `#${c(16)}${c(8)}${c(0)}`;
}
const oscurecer = (hex: string, f: number) => mezclar(hex, '#000000', 1 - f);

// Una cara vertical: t la recorre de un borde al otro; z es la altura.
interface Cara {
  rect: (t0: number, t1: number, z0: number, z1: number) => string;
  rueda: (t: number, radio: number, largo: number) => string;
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

/** Bloque orientado según el rumbo: dibuja el techo y las caras verticales que miran al espectador. */
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
  const caras: { a: [number, number]; b: [number, number]; n: [number, number]; tipo: 'frente' | 'cola' | 'costado' }[] = [
    { a: FR, b: FL, n: [p.hu, p.hv], tipo: 'frente' },
    { a: BL, b: BR, n: [-p.hu, -p.hv], tipo: 'cola' },
    { a: FL, b: BL, n: [nu, nv], tipo: 'costado' },
    { a: BR, b: FR, n: [-nu, -nv], tipo: 'costado' },
  ];
  let s = '';
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

const buseta = (ruta: ColoresRuta): Bloque => ({
  largo: 120,
  ancho: 34,
  alto: 40,
  techo: ruta.color,
  cuerpo: ruta.oscuro,
  sombraCaras: 0.85,
  costado: (c) => {
    let s = `<polygon points="${c.rect(0.08, 0.92, 31, 37)}" fill="#F4EFE6"/>`; // letrero de ruta
    for (let i = 0; i < 5; i++) s += `<polygon points="${c.rect(0.1 + i * 0.16, 0.21 + i * 0.16, 17, 29)}" fill="#DDEFF7"/>`;
    s += `<polygon points="${c.rueda(0.17, 7, 120)}" fill="#1E2230"/><polygon points="${c.rueda(0.83, 7, 120)}" fill="#1E2230"/>`;
    return s;
  },
  extremo: (c) =>
    c.frente
      ? `<polygon points="${c.rect(0.06, 0.94, 17, 37)}" fill="#2B3240"/>` +
        `<polygon points="${c.rect(0.09, 0.24, 5, 9)}" fill="#FFE08A"/><polygon points="${c.rect(0.76, 0.91, 5, 9)}" fill="#FFE08A"/>`
      : '',
});

// Tranvía Translohr articulado (blanco con franja verde, como en la foto): tres módulos que siguen la línea.
const MODULO = 42;
const JUNTA = 5;
const moduloTranvia = (cabina: 'frente' | 'cola' | null): Bloque => ({
  largo: MODULO,
  ancho: 26,
  alto: 38,
  techo: '#F4F5F7',
  cuerpo: '#E6EBEF',
  sombraCaras: 0.9,
  costado: (c) =>
    `<polygon points="${c.rect(0.1, 0.9, 17, 31)}" fill="#3A4454"/><polygon points="${c.rect(0, 1, 6, 11)}" fill="${TRANVIA}"/>`,
  extremo: (c) =>
    `<polygon points="${c.rect(0, 1, 6, 11)}" fill="${TRANVIA}"/>` +
    // Cabina con parabrisas solo en las dos puntas del tranvía, no en las juntas entre módulos
    ((cabina === 'frente') === c.frente && cabina ? `<polygon points="${c.rect(0.08, 0.92, 16, 33)}" fill="#2B3240"/>` : ''),
});

// Velocidades en unidades de suelo por segundo. Los dos comparten un ciclo de 18 s y el tranvía va desfasado: la
// buseta ocupa el cruce hacia los 10,4–12,2 s y el tranvía hacia 0,8–3,8 s, así nunca se encuentran en el cruce.
const VEL_BUS = 85;
const VEL_TRANVIA = 62;
const CICLO = 18;
const DESFASE_TRANVIA = 7.17;

/** Dibuja los vehículos en el instante t (s): cada pieza va a la capa de fondo mientras está detrás del edificio. */
function cuadro(t: number, ruta: ColoresRuta): { fondo: string; frente: string } {
  const piezas: { capa: 'fondo' | 'frente'; prof: number; svg: string }[] = [];
  const poner = (l: Linea, s: number, b: Bloque) => {
    if (s < 0 || s > l.total) return;
    const p = l.pose(s);
    piezas.push({ capa: s < l.detras ? 'fondo' : 'frente', prof: p.u + p.v, svg: bloque(p, b) });
  };

  // Buseta: baja por detrás del edificio, dobla la esquina y sale por abajo a la derecha.
  poner(LINEA_BUS, VEL_BUS * (t % CICLO), buseta(ruta));

  // Tranvía: baja por el costado derecho del edificio hacia el espectador y cruza la línea del bus.
  const cabeza = VEL_TRANVIA * ((t + DESFASE_TRANVIA) % CICLO);
  const cabinas = ['frente', null, 'cola'] as const;
  for (let i = 0; i < 3; i++) poner(LINEA_TRANVIA, cabeza - i * (MODULO + JUNTA) - MODULO / 2, moduloTranvia(cabinas[i]));

  piezas.sort((a, b) => a.prof - b.prof);
  return {
    fondo: piezas.filter((p) => p.capa === 'fondo').map((p) => p.svg).join(''),
    frente: piezas.filter((p) => p.capa === 'frente').map((p) => p.svg).join(''),
  };
}

const Escena: React.FC<{ ruta: ColoresRuta }> = ({ ruta }) => {
  const capaFondo = useRef<SVGGElement>(null);
  const capaFrente = useRef<SVGGElement>(null);

  useEffect(() => {
    const pintar = (t: number) => {
      const { fondo, frente } = cuadro(t, ruta);
      if (capaFondo.current) capaFondo.current.innerHTML = fondo;
      if (capaFrente.current) capaFrente.current.innerHTML = frente;
    };
    const quieto = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (quieto) {
      pintar(3.5); // los dos a la vista: la buseta doblando la esquina y el tranvía recién pasado el cruce
      return;
    }
    let id = 0;
    const inicio = performance.now();
    const paso = (ahora: number) => {
      pintar((ahora - inicio) / 1000);
      id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [ruta]);

  const noche = puntos([proj(FRONTERA_U, -3000), proj(3000, -3000), proj(3000, 3000), proj(FRONTERA_U, 3000)]);

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox={`${VB_X} ${VB_Y} ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMaxYMax slice"
      aria-hidden="true"
    >
      <polygon points={noche} fill={NOCHE} />
      <g transform={SUELO} fill="none">
        <path d={LINEA_TRANVIA.trazo} stroke={TRANVIA} strokeWidth={ANCHO_TRANVIA} />
        <path d={LINEA_BUS.trazo} stroke={ruta.color} strokeWidth={ANCHO_BUS} />
      </g>
      <g ref={capaFondo} />
      <image href={ayacucho} x={0} y={0} width={ANCHO} height={ALTO} />
      <g ref={capaFrente} />
    </svg>
  );
};

/**
 * Panel a todo el ancho con la escena; el texto (children) va en tinta oscura sobre el campo crema de arriba,
 * que la ilustración deja vacío para el título.
 */
export const PanelEscena: React.FC<{ vehiculoId?: string; children: React.ReactNode }> = ({ vehiculoId, children }) => {
  const ruta = coloresDeRuta(vehiculoId);
  return (
    <section
      className="relative -mx-5 -mt-6 overflow-hidden aspect-[768/1376] text-[#1E2230]"
      style={{ backgroundColor: CREMA }}
    >
      <Escena ruta={ruta} />
      <div className="relative z-10 px-5 pt-6">{children}</div>
    </section>
  );
};

/** Raya corta bajo el título, en el color de la línea de la escena. */
export const RayaRuta: React.FC<{ vehiculoId?: string }> = ({ vehiculoId }) => (
  <div className="w-[45px] h-[3px] mt-2.5" style={{ backgroundColor: coloresDeRuta(vehiculoId).color }} />
);
