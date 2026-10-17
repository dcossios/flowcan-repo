// Color de la línea de cada vehículo: el mismo en la escena (buseta y su línea) y en el cuadro con el número de ruta.
// Bus 01 rojo, Bus 02 verde (validado para daltonismo frente al azul del Metro), taxi amarillo.

export interface ColoresRuta {
  /** Relleno de la línea y del cuadro con el número. */
  color: string;
  /** Costado de la buseta (cara en sombra). */
  oscuro: string;
  /** Texto sobre `color` con contraste suficiente. */
  texto: string;
}

const RUTAS: Record<string, ColoresRuta> = {
  'bus-02': { color: '#3FB27F', oscuro: '#2F865F', texto: '#FFFFFF' },
  'taxi-01': { color: '#F6C431', oscuro: '#C99A12', texto: '#1E2230' },
};
const RUTA_BASE: ColoresRuta = { color: '#EE5A52', oscuro: '#B8403A', texto: '#FFFFFF' };

export function coloresDeRuta(vehiculoId?: string): ColoresRuta {
  return (vehiculoId && RUTAS[vehiculoId]) || RUTA_BASE;
}

// «Bus 01 — Circular Coonatra» → tipo «Bus», número «01» y empresa «Circular Coonatra».
export function partirNombre(nombre: string): { tipo: string; numero: string; empresa: string } {
  const [vehiculo = '', ...resto] = nombre.split(/\s+[—–-]\s+/);
  const m = vehiculo.match(/^(.*?)\s*(\d+)\s*$/);
  return {
    tipo: m ? m[1] || 'Bus' : vehiculo,
    numero: m ? m[2] : '',
    empresa: resto.join(' · '),
  };
}

// «Poblado – Centro – Laureles» o «Poblado · Centro · Laureles» → «Poblado → Centro → Laureles».
export const rutaConFlechas = (ruta: string) =>
  ruta
    .split(/\s+[–—·-]\s+/)
    .filter(Boolean)
    .join(' → ');

// «bus-01» → «Bus 01», para cuando solo se conoce el id del vehículo.
export const nombreDesdeId = (id: string) =>
  id
    .split('-')
    .map((t, i) => (i === 0 ? t.charAt(0).toUpperCase() + t.slice(1) : t))
    .join(' ');
