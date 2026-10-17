import React, { useLayoutEffect, useRef, useState } from 'react';
import registradora from '../assets/escenas/registradora.webp';
import paradero from '../assets/escenas/paradero.webp';

/*
 * Ilustración detrás del texto del cobro (prompt141). Con pase: la registradora (prompt142).
 * Sin pase: el paradero con la línea coral (prompt149). Las dos se encajan por silueta,
 * ancladas abajo a la derecha; el paradero se desvanece a la izquierda para que la calle
 * no se corte en seco.
 */

const HOLGURA = 16;
const MARGEN_X = 8;
const COLUMNAS = 120;

type Rect = { left: number; right: number; top: number; bottom: number };
type Silueta = { arriba: (number | null)[]; proporcion: number };

type Encaje = {
  sangraDerecha: number;
  ocultoAbajo: number;
  /** Fracción de W: se busca el mayor válido en [rangoMin, rangoMax]. */
  rangoMin: number;
  rangoMax: number;
  /** Si ni rangoMin cabe, se prueba desde aquí hasta rangoMin. */
  respaldo: number;
  mascara?: string;
};

const ENCAJE_REGISTRADORA: Encaje = {
  sangraDerecha: 0.10,
  ocultoAbajo: 0.10,
  rangoMin: 0.8,
  rangoMax: 1.7,
  respaldo: 0.5,
};

const ENCAJE_PARADERO: Encaje = {
  sangraDerecha: 0.03,
  ocultoAbajo: 0.03,
  rangoMin: 0.6,
  rangoMax: 1.3,
  respaldo: 0.45,
  mascara: 'linear-gradient(to right, transparent 0%, #000 22%)',
};

const cacheSilueta = new Map<string, Silueta>();

function fondoOpaco(color: string): boolean {
  if (!color || color === 'transparent') return false;
  const m = color.match(/rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(?:,\s*([\d.]+))?\s*\)/i);
  if (!m) return true;
  return m[1] === undefined || Number(m[1]) > 0;
}

function aCaja(r: DOMRect, origen: DOMRect): Rect | null {
  if (r.width < 0.5 || r.height < 0.5) return null;
  return {
    left: r.left - origen.left,
    right: r.right - origen.left,
    top: r.top - origen.top,
    bottom: r.bottom - origen.top,
  };
}

function siluetaDe(img: HTMLImageElement): Silueta {
  const proporcion = img.naturalHeight / img.naturalWidth;
  const cw = COLUMNAS;
  const ch = Math.max(1, Math.round(cw * proporcion));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const arriba: (number | null)[] = Array(cw).fill(null);
  if (!ctx || img.naturalWidth < 1) return { arriba, proporcion };
  ctx.drawImage(img, 0, 0, cw, ch);
  const data = ctx.getImageData(0, 0, cw, ch).data;
  for (let i = 0; i < cw; i++) {
    for (let y = 0; y < ch; y++) {
      if (data[(y * cw + i) * 4 + 3] > 128) {
        arriba[i] = y / ch;
        break;
      }
    }
  }
  return { arriba, proporcion };
}

function recogerObstaculos(raiz: HTMLElement, caja: DOMRect): Rect[] {
  const out: Rect[] = [];
  const meter = (r: DOMRect | null) => {
    if (!r) return;
    const local = aCaja(r, caja);
    if (local) out.push(local);
  };

  const walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
    acceptNode(nodo) {
      if (!nodo.nodeValue || !nodo.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const el = nodo.parentElement;
      if (!el || el.closest('[data-ilustracion]')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const rango = document.createRange();
  let nodo: Node | null;
  while ((nodo = walker.nextNode())) {
    rango.selectNodeContents(nodo);
    const rects = rango.getClientRects();
    for (let i = 0; i < rects.length; i++) meter(rects[i]);
  }

  for (const el of raiz.querySelectorAll('*')) {
    if (!(el instanceof Element) || el.closest('[data-ilustracion]')) continue;
    const estilo = getComputedStyle(el);
    if (estilo.display === 'none' || estilo.visibility === 'hidden') continue;
    if (el instanceof SVGSVGElement) meter(el.getBoundingClientRect());
    if (fondoOpaco(estilo.backgroundColor)) meter(el.getBoundingClientRect());
  }
  return out;
}

function cabeEncajar(
  w: number,
  W: number,
  H: number,
  silueta: Silueta,
  obstaculos: Rect[],
  encaje: Encaje,
): boolean {
  const h = w * silueta.proporcion;
  const x0 = W + encaje.sangraDerecha * w - w;
  const y0 = H + encaje.ocultoAbajo * h - h;
  const colW = w / COLUMNAS;
  for (let i = 0; i < COLUMNAS; i++) {
    const arriba = silueta.arriba[i];
    if (arriba === null) continue;
    const colL = x0 + i * colW;
    const colR = x0 + (i + 1) * colW;
    if (colR <= 0 || colL >= W) continue;
    const siluetaY = y0 + arriba * h;
    for (const o of obstaculos) {
      const oL = o.left - MARGEN_X;
      const oR = o.right + MARGEN_X;
      if (oR <= colL || oL >= colR) continue;
      if (siluetaY < o.bottom + HOLGURA) return false;
    }
  }
  return true;
}

type Props = {
  src: string;
  encaje: Encaje;
  contenido: React.RefObject<HTMLElement | null>;
  hastaBarra: number;
};

export const IlustracionCobro: React.FC<Props> = ({ src, encaje, contenido, hastaBarra }) => {
  const caja = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);
  const [proporcion, setProporcion] = useState(1);
  const [hasta, setHasta] = useState(hastaBarra);
  const siluetaRef = useRef<Silueta | null>(null);
  const srcRef = useRef(src);

  useLayoutEffect(() => {
    let cancelado = false;
    const cajaEl = caja.current;
    const contenidoEl = contenido.current;
    if (srcRef.current !== src) {
      srcRef.current = src;
      siluetaRef.current = cacheSilueta.get(src) ?? null;
      setAncho(0);
    }

    const medir = () => {
      if (cancelado) return;
      const cajaAhora = caja.current;
      const contenidoAhora = contenido.current;
      if (!cajaAhora || !contenidoAhora) return;

      const barra = document.querySelector('.subase-fixed-bar');
      const shell = contenidoAhora.closest('.subase-shell-bar, .subase-shell-bar-alta');
      let siguienteHasta = hastaBarra;
      if (barra instanceof HTMLElement && shell instanceof HTMLElement) {
        siguienteHasta =
          shell.getBoundingClientRect().bottom - barra.offsetHeight - contenidoAhora.getBoundingClientRect().bottom;
      }
      setHasta((prev) => (Math.abs(prev - siguienteHasta) <= 1 ? prev : siguienteHasta));

      const silueta = siluetaRef.current;
      if (!silueta) return;
      const W = cajaAhora.clientWidth;
      const H = cajaAhora.clientHeight;
      if (W < 1 || H < 1) return;
      const obstaculos = recogerObstaculos(contenidoAhora, cajaAhora.getBoundingClientRect());
      const mayorValido = (minW: number, maxW: number) => {
        if (!cabeEncajar(minW, W, H, silueta, obstaculos, encaje)) return 0;
        if (cabeEncajar(maxW, W, H, silueta, obstaculos, encaje)) return maxW;
        let lo = minW;
        let hi = maxW;
        for (let k = 0; k < 20; k++) {
          const mid = (lo + hi) / 2;
          if (cabeEncajar(mid, W, H, silueta, obstaculos, encaje)) lo = mid;
          else hi = mid;
        }
        return lo;
      };
      let siguiente = mayorValido(encaje.rangoMin * W, encaje.rangoMax * W);
      if (siguiente === 0) siguiente = mayorValido(encaje.respaldo * W, encaje.rangoMin * W);
      setAncho((prev) => (Math.abs(prev - siguiente) <= 1 ? prev : siguiente));
    };

    const cargar = () => {
      const cached = cacheSilueta.get(src);
      if (cached) {
        siluetaRef.current = cached;
        setProporcion(cached.proporcion);
        medir();
        return;
      }
      const img = new Image();
      let hecha = false;
      const listo = () => {
        if (cancelado || hecha || img.naturalWidth < 1) return;
        hecha = true;
        const silueta = siluetaDe(img);
        cacheSilueta.set(src, silueta);
        siluetaRef.current = silueta;
        setProporcion(silueta.proporcion);
        medir();
      };
      img.onload = listo;
      img.onerror = () => {
        hecha = true;
      };
      img.src = src;
      if (img.complete) listo();
    };

    cargar();

    const ro = new ResizeObserver(medir);
    if (cajaEl) ro.observe(cajaEl);
    if (contenidoEl) ro.observe(contenidoEl);
    const barra = document.querySelector('.subase-fixed-bar');
    if (barra) ro.observe(barra);
    window.addEventListener('resize', medir);
    void document.fonts.ready.then(medir);

    return () => {
      cancelado = true;
      ro.disconnect();
      window.removeEventListener('resize', medir);
    };
  }, [contenido, hastaBarra, src, encaje]);

  return (
    <div
      ref={caja}
      data-ilustracion
      aria-hidden="true"
      className="pointer-events-none absolute -left-5 -right-5 top-0 z-0 overflow-hidden"
      style={{ bottom: -hasta }}
    >
      {ancho > 0 && (
        <img
          src={src}
          alt=""
          draggable={false}
          className="absolute block max-w-none"
          style={{
            width: ancho,
            right: -encaje.sangraDerecha * ancho,
            bottom: -encaje.ocultoAbajo * ancho * proporcion,
            ...(encaje.mascara
              ? { maskImage: encaje.mascara, WebkitMaskImage: encaje.mascara }
              : {}),
          }}
        />
      )}
    </div>
  );
};

export const Registradora: React.FC<Omit<Props, 'src' | 'encaje'>> = (props) => (
  <IlustracionCobro src={registradora} encaje={ENCAJE_REGISTRADORA} {...props} />
);

export const Paradero: React.FC<Omit<Props, 'src' | 'encaje'>> = (props) => (
  <IlustracionCobro src={paradero} encaje={ENCAJE_PARADERO} {...props} />
);
