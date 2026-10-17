import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ayacuchoBase from '../assets/escenas/ayacucho-base.webp'; // sin el edificio vecino
import ayacuchoIsla from '../assets/escenas/ayacucho-isla.webp';
import ayacuchoDerecha from '../assets/escenas/ayacucho-derecha.webp';
import rutanBase from '../assets/escenas/rutan-base.webp'; // Ruta N, alineada con la calle de Ayacucho
import rutanIsla from '../assets/escenas/rutan-isla.webp';
import rutanDerecha from '../assets/escenas/rutan-derecha.webp';
import { coloresDeRuta, type ColoresRuta } from '../lib/rutas';

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
// Escenas del panel, todas en 768 × 1376 y con la misma calle. «techo» es el techo más alto de la ilustración: el
// encuadre lo deja siempre bajo el texto. Ayacucho (sin el edificio vecino de la izquierda): medido 391, se deja 395.
// Ruta N: la torre llega a 225 (medido igual), con el mismo margen queda 229.
const ESCENAS = {
  ayacucho: { base: ayacuchoBase, isla: ayacuchoIsla, derecha: ayacuchoDerecha, techo: 395 },
  rutan: { base: rutanBase, isla: rutanIsla, derecha: rutanDerecha, techo: 229 },
};
export type NombreEscena = keyof typeof ESCENAS;
// Escala de la escena frente al texto, elegida por Andrés (variante D, prompts/prompt118.md): los edificios se
// achican anclados abajo a la derecha y el suelo sigue hacia la izquierda.
const ESCALA = 0.78;
const ACERA_SOMBRA = '#908A86'; // acera de la fachada izquierda, en sombra (muestreada)

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
// Manzana en una esquina del cruce: andén de ANDEN de ancho a lo largo de las dos calles y, adentro, el campo crema
// (como la manzana de la ilustración). su y sv dan el cuadrante: +1 hacia el espectador en cada eje.
const ANDEN = 34;
function manzana(su: 1 | -1, sv: 1 | -1, radio: number): { acera: string; crema: string } {
  const L = 4000;
  const esquina = (d: number, r: number): [number, number][] => {
    const u0 = su * (CRUCE_U + d);
    const v0 = sv * (CRUCE_V + d);
    const pts: [number, number][] = [proj(u0, sv * L)];
    for (let i = 0; i <= 8; i++) {
      const t = (Math.PI / 2) * (i / 8);
      // Arco de la esquina redondeada, del borde de la calle de la buseta al de la del tranvía
      pts.push(proj(u0 + su * r * (1 - Math.sin(t)), v0 + sv * r * (1 - Math.cos(t))));
    }
    pts.push(proj(su * L, v0), proj(su * L, sv * L));
    return pts;
  };
  return { acera: puntos(esquina(0, radio)), crema: puntos(esquina(ANDEN, Math.max(4, radio - ANDEN / 2))) };
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


// Buseta en bloque a la escala de la fachada (la puerta de la esquina mide unos 65 px).
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
    // Sin letrero ni texto en el costado: Andrés pidió los buses sin texto (prompt137)
    let s = '';
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

// Recorridos de fuera de cuadro a fuera de cuadro (con el encuadre ancho de ESCALA y el del conductor, que llega más
// abajo). Despacio y sin bucle seguido (prompts/prompt121.md): cada vehículo pasa una vez por minuto. La buseta entra
// enseguida y cruza la cuadrícula hacia los 10,5–18,7 s; el tranvía entra a los 14 s y la cruza hacia los
// 19,7–29,3 s, así que nunca se encuentran. Después quedan unos 18 s de calle quieta.
const BUS_U0 = -950;
const BUS_U1 = 560;
const TRANVIA_V0 = -440;
const TRANVIA_V1 = 800;
const VEL_BUS = 65;
const VEL_TRANVIA = 55;
const CICLO = 60;
const DESFASE_TRANVIA = 14;
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

/*
 * Suelo a la izquierda de la imagen, visible porque la escena va achicada (ESCALA): acera de la fachada,
 * calle de la buseta en azul noche e isla, siguiendo los bordes medidos en x = 0. Arriba de la acera queda el crema.
 */
function sueloIzquierdo(x0: number) {
  const F = (x: number) => 860.8 + 0.515 * x; // base de la fachada medida en x = 0..40
  const E = (x: number) => 918.3 + 0.5693 * x; // borde de la acera con la calle
  const I = (x: number) => 1078.3 + 0.564 * x; // borde superior de la isla
  const J = (x: number) => 1353.6 - 0.555 * x; // borde de la isla con la calle del tranvía
  const tramo = (a: (x: number) => number, b: (x: number) => number) =>
    puntos([[x0, a(x0)], [2, a(2)], [2, b(2)], [x0, b(x0)]]);
  return (
    <>
      <polygon points={tramo(F, E)} fill="#908882" />
      <polygon points={tramo((x) => E(x) - 4.8, E)} fill="#655F5A" />
      <polygon points={tramo(E, () => ALTO + 20)} fill={NOCHE} />
      <polygon points={tramo(I, J)} fill="#E4DBD0" />
    </>
  );
}

/*
 * Completa a la izquierda de x = 0 los elementos de la isla que la imagen cortaba en el borde:
 * el andén sin la viñeta de x = 0, la copa de la palma, la jardinera verde y el arbusto redondo con su sombra.
 */
function islaIzquierda(x0: number, esRutan: boolean) {
  const F = (x: number) => 860.8 + 0.515 * x;
  const E = (x: number) => 918.3 + 0.5693 * x;
  const I = (x: number) => 1078.3 + 0.564 * x;
  const J = (x: number) => 1353.6 - 0.555 * x;
  const tramo = (a: (x: number) => number, b: (x: number) => number, xIzq = x0, xDer = 2.5) =>
    puntos([[xIzq, a(xIzq)], [xDer, a(xDer)], [xDer, b(xDer)], [xIzq, b(xIzq)]]);
  return (
    <g>
      {/* Cubre el borde x = 0 de la acera superior con el mismo tono de sueloIzquierdo */}
      <polygon points={tramo(F, (x) => E(x) - 4.8, -1, 1.5)} fill="#908882" />
      <polygon points={tramo((x) => E(x) - 4.8, E, -1, 1.5)} fill="#655F5A" />
      {/* Andén de la isla alineado a la recta real medida en x = 5..120 */}
      <polygon points={tramo(I, J, x0, 2.5)} fill="#E3DACD" />
      <polygon points={tramo(I, (x) => I(x) + 18, -2, 5)} fill="#E4DBD0" />
      <polygon points={tramo((x) => J(x) - 18, J, -2, 5)} fill="#E3DACD" />
      {/* Jardinera verde (cara superior + reborde de 5,5 px bajo el cable) y sombra del tronco sin redondeo en x > 0 */}
      <polygon points="2.5,1201.8 2.5,1253.3 -15,1263.1 -65,1235.0" fill={esRutan ? '#669858' : '#689C58'} />
      <polygon
        points="-65,1235.0 -15,1263.1 2.5,1253.3 2.5,1259.0 -15,1268.8 -65,1240.5"
        fill={esRutan ? '#638E57' : '#66915A'}
      />
      <path d="M 4 1214.5 H -39 A 5 5 0 0 0 -39 1224.5 H 4 Z" fill={esRutan ? '#4D7444' : '#517544'} />
      {/* Sombra y copa del arbusto redondo ajustadas al contorno medido en el WebP */}
      <ellipse cx={-3.5} cy={1313} rx={24.5} ry={13.5} fill="#86887C" />
      <ellipse cx={6.2} cy={1296.2} rx={29} ry={26.5} fill={esRutan ? '#376C3F' : '#3A6F41'} />
      {/* 4 pencas izquierdas de la palma continuando las pendientes radiales medidas en x = 0..8 */}
      {/* Penca 1 (arriba izquierda, oliva, pendiente inferior +0,69 desde (1, 1009.5)) */}
      <polygon points="1,983.5 -5,986.5 -3,988.5 -10,991.5 -7,993 1,991.5" fill="#9BA383" />
      <polygon
        points="1,991.5 -7,992.5 -13,994.5 -10,996.5 -16,999 -12,1000.5 -15,1003 -9,1003.5 1,1009.8"
        fill={esRutan ? '#70904C' : '#73934B'}
      />
      <path d="M 1 1003.5 Q -6 999.5 -14 997.5" stroke="#849E54" strokeWidth={1.3} fill="none" />
      {/* Penca 2 (centro-arriba, verde oscuro, desde (1, 1009.5) hasta (1, 1033.5)) */}
      <polygon
        points="1,1009.5 -9,1003.5 -17,1006 -14,1008 -22,1011.5 -18,1013.5 -25,1017 -20,1019 -26,1022.5 -21,1024.5 -25,1028 -19,1029.5 -21,1032.5 -14,1033.2 1,1033.5"
        fill={esRutan ? '#35663F' : '#366B45'}
      />
      <path d="M 1.5 1024.3 Q -9 1020.8 -22 1018" stroke="#629670" strokeWidth={1.6} fill="none" />
      {/* Penca 3 (centro-abajo, oliva, entre la nervadura y=1034 y la diagonal -0,64 en y=1045.5) */}
      <polygon
        points="1,1033.5 -14,1033.2 -23,1036 -19,1038 -24,1041 -18,1042.5 -21,1045.5 -15,1047 -17,1049.5 -10,1051 1,1045.5"
        fill={esRutan ? '#6B8E52' : '#6E9150'}
      />
      <path d="M 1.5 1034 Q -9 1034.5 -21 1036.5" stroke="#7B9F6E" strokeWidth={1.7} fill="none" />
      {/* Penca 4 (abajo izquierda, verde oscuro, siguiendo la diagonal -0,64 desde (1, 1045.5)) */}
      <polygon
        points="1,1045.5 -10,1051 -16,1054 -12,1055.5 -17,1059 -11,1060.5 -14,1063.5 -8,1064 -9,1066.5 -3,1066 1.2,1063.5"
        fill={esRutan ? '#3B6641' : '#376743'}
      />
      <path d="M 1.5 1045 Q -5 1049.2 -13 1053.5" stroke="#A2C392" strokeWidth={1.6} fill="none" />
      <path d="M 1.5 1063 Q -3 1065.5 -8 1066" stroke="#88A38B" strokeWidth={1.5} fill="none" />
    </g>
  );
}

interface Encuadre {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/*
 * Suelo debajo de la imagen, visible cuando el panel llena la pantalla (conductor): las calles en azul noche siguen
 * hacia abajo y las manzanas de la isla y de la derecha continúan (andén y campo crema). Las líneas ya son infinitas.
 */
function sueloAbajo() {
  const L = 4000;
  return (
    <g clipPath="url(#subase-bajo-imagen)">
      <clipPath id="subase-bajo-imagen">
        <rect x={-L} y={ALTO - 2} width={2 * L} height={L} />
      </clipPath>
      <rect x={-L} y={ALTO - 2} width={2 * L} height={L} fill={NOCHE} />
      <polygon points={manzana(-1, 1, RADIO_ACERA).acera} fill={ACERA} />
      <polygon points={manzana(-1, 1, RADIO_ACERA).crema} fill={CREMA} />
      <polygon points={manzana(1, -1, RADIO_ACERA).acera} fill={ACERA} />
      <polygon points={manzana(1, -1, RADIO_ACERA).crema} fill={CREMA} />
    </g>
  );
}

const Escena: React.FC<{ ruta: ColoresRuta; letrero: string; encuadre: Encuadre; imagenes: (typeof ESCENAS)[NombreEscena] }> = ({
  ruta,
  letrero,
  encuadre,
  imagenes,
}) => {
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
      pintar(10, DESFASE_TRANVIA + 4.4); // quietos y a la vista: la buseta llegando al cruce y el tranvía entrando por la derecha
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

  const alto = encuadre.alto;

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox={`${encuadre.x.toFixed(1)} ${encuadre.y.toFixed(1)} ${encuadre.ancho.toFixed(1)} ${alto.toFixed(1)}`}
      preserveAspectRatio="xMaxYMax slice"
      aria-hidden="true"
    >
      {encuadre.x < 0 && sueloIzquierdo(encuadre.x - 20)}
      {encuadre.y + encuadre.alto > ALTO && sueloAbajo()}
      {/* Solo bajo las calles: si llegara al borde de la imagen, su canto asomaría como una línea al achicar la escena */}
      <rect x={0} y={840} width={ANCHO} height={ALTO - 840 + 20} fill={NOCHE} />
      <polygon points={rectSuelo(-ANCHO_LINEA_TRANVIA / 2, ANCHO_LINEA_TRANVIA / 2, -1200, 1200)} fill={TRANVIA} />
      <polygon points={rectSuelo(-1200, 1200, -ANCHO_LINEA_BUS / 2, ANCHO_LINEA_BUS / 2)} fill={ruta.color} />
      <Cuadricula />
      <image href={imagenes.base} x={0} y={0} width={ANCHO} height={ALTO} />
      <g ref={busAtras} />
      <image href={imagenes.isla} x={0} y={955} width={260} height={421} />
      {encuadre.x < 0 && islaIzquierda(encuadre.x - 20, imagenes === ESCENAS.rutan)}
      <g ref={tranvia} />
      <image href={imagenes.derecha} x={628} y={1140} width={140} height={236} />
      <g ref={busAdelante} />
      {/* Manzana de abajo, alineada con la acera derecha y con el borde del cruce (la de Flow se metía 30 px en la calle) */}
      <polygon points={manzana(1, 1, RADIO_ACERA).acera} fill={ACERA} />
      <polygon points={manzana(1, 1, RADIO_ACERA).crema} fill={CREMA} />
      {/* Cable que cruza la calle desde el poste de la isla hasta el semáforo de la esquina y continúa a la izquierda */}
      <line x1={146} y1={1173} x2={420} y2={1038.8} stroke="#2A2F29" strokeWidth={1.6} />
      {encuadre.x < 0 && <line x1={-300} y1={1423} x2={2.5} y2={1253.3} stroke="#2A2F29" strokeWidth={1.6} />}
    </svg>
  );
};

/**
 * Panel a todo el ancho con la escena; el texto (children) va en tinta oscura sobre el campo crema de arriba.
 * El encuadre se ajusta al alto real del texto para que el techo nunca lo toque, y el panel crece lo necesario para
 * mostrar la escena completa, cuadrícula incluida.
 */
export const PanelEscena: React.FC<{
  vehiculoId?: string;
  letrero?: string;
  /** Llena el alto disponible (flex-1): la escena sigue hacia abajo hasta el borde, como en la portada. */
  llenar?: boolean;
  /** Ilustración de fondo: Ayacucho por defecto; Ruta N en el inicio sin bus reciente. */
  escena?: NombreEscena;
  children: React.ReactNode;
}> = ({ vehiculoId, letrero = '', llenar = false, escena = 'ayacucho', children }) => {
  const ruta = coloresDeRuta(vehiculoId);
  const imagenes = ESCENAS[escena];
  const techo = imagenes.techo;
  const panel = useRef<HTMLElement>(null);
  const texto = useRef<HTMLDivElement>(null);
  const anchoVista = ANCHO / ESCALA;
  const [vista, setVista] = useState({ y: -80, alto: ALTO + 80 });

  useLayoutEffect(() => {
    const medir = () => {
      if (!panel.current || !texto.current) return;
      const k = panel.current.clientWidth / anchoVista; // px de pantalla por unidad de la imagen
      const bajoTexto = texto.current.offsetTop + texto.current.offsetHeight + 14;
      const y = Math.min(0, techo - bajoTexto / k);
      const alto = llenar ? Math.max(ALTO - y, panel.current.clientHeight / k) : ALTO - y;
      setVista((v) => (Math.abs(v.y - y) < 0.5 && Math.abs(v.alto - alto) < 0.5 ? v : { y, alto }));
    };
    medir();
    const ro = new ResizeObserver(medir);
    if (panel.current) ro.observe(panel.current);
    if (texto.current) ro.observe(texto.current);
    return () => ro.disconnect();
  }, [anchoVista, llenar, techo]);

  return (
    <section
      ref={panel}
      className={`relative -mx-5 -mt-6 overflow-hidden text-[#1E2230] ${llenar ? 'flex-1' : ''}`}
      style={{
        backgroundColor: CREMA,
        aspectRatio: llenar ? undefined : `${anchoVista.toFixed(1)} / ${vista.alto.toFixed(1)}`,
      }}
    >
      <Escena
        ruta={ruta}
        letrero={letrero}
        imagenes={imagenes}
        encuadre={{ x: ANCHO - anchoVista, y: vista.y, ancho: anchoVista, alto: vista.alto }}
      />
      <div ref={texto} className="relative z-10 px-5 pt-6">
        {children}
      </div>
    </section>
  );
};
