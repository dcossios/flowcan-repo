const STORAGE_KEY = 'subase_ultimo_vehiculo';

export interface UltimoVehiculo {
  id: string;
  nombre: string;
  ruta: string;
  tarifa: number;
}

export function guardarUltimoVehiculo(vehiculo: {
  id: string;
  nombre: string;
  ruta: string;
  tarifa: number;
}): void {
  try {
    const payload: UltimoVehiculo = {
      id: vehiculo.id,
      nombre: vehiculo.nombre,
      ruta: vehiculo.ruta,
      tarifa: vehiculo.tarifa,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage puede fallar en modo privado
  }
}

export function leerUltimoVehiculo(): UltimoVehiculo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UltimoVehiculo>;
    if (
      typeof parsed?.id !== 'string' ||
      typeof parsed?.nombre !== 'string' ||
      typeof parsed?.ruta !== 'string' ||
      typeof parsed?.tarifa !== 'number'
    ) {
      return null;
    }
    return {
      id: parsed.id,
      nombre: parsed.nombre,
      ruta: parsed.ruta,
      tarifa: parsed.tarifa,
    };
  } catch {
    return null;
  }
}
