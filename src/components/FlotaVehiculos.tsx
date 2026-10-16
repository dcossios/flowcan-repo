import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bus, CarTaxiFront, Loader2, Plus, QrCode, RefreshCw } from 'lucide-react';
import {
  CambiosVehiculo,
  crearVehiculo,
  editarVehiculo,
  fetchVehiculosEmpresa,
  getFriendlyErrorMessage,
  NuevoVehiculo,
  SubaseApiError,
  VehiculoGestion,
} from '../lib/api';
import { formatCOP } from '../lib/format';

// 16 px en los campos evita que iOS haga zoom al escribir.
const campo =
  'w-full min-h-11 rounded-[12px] bg-black border border-[rgba(195,197,198,0.35)] px-3 text-[16px] font-normal text-white placeholder:text-[#C3C5C6]/60 focus:outline-none focus:border-[#D2B99A]';
const btnSecundario =
  'inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-[12px] border border-[rgba(195,197,198,0.25)] text-[15px] font-normal text-white hover:border-[#D2B99A] cursor-pointer disabled:opacity-50';
const btnPrincipal =
  'inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-[12px] bg-[#113462] text-[15px] font-medium text-white cursor-pointer disabled:opacity-50';

const Campo: React.FC<{ label: string; ayuda?: string; grupo?: boolean; children: React.ReactNode }> = ({
  label,
  ayuda,
  grupo = false,
  children,
}) => {
  // Un grupo de botones (Bus / Taxi) no puede ir dentro de <label>: el primero heredaría la etiqueta.
  const Contenedor = grupo ? 'div' : 'label';
  return (
    <Contenedor className="block">
      <span className="block text-[14px] font-normal text-[#C3C5C6] mb-1.5">{label}</span>
      {children}
      {ayuda && <span className="block text-[13px] font-normal text-[#C3C5C6]/80 mt-1">{ayuda}</span>}
    </Contenedor>
  );
};

const VACIO: NuevoVehiculo = { id: '', nombre: '', ruta: '', tipo: 'bus', conductor: '', tarifa: 3200 };

interface Props {
  /** El PIN dejó de ser válido: el panel vuelve a pedirlo. */
  onNoAutorizado: () => void;
}

export const FlotaVehiculos: React.FC<Props> = ({ onNoAutorizado }) => {
  const [lista, setLista] = useState<VehiculoGestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState<NuevoVehiculo | null>(null);
  const [editando, setEditando] = useState<{ id: string; datos: CambiosVehiculo } | null>(null);
  const [confirmarDesactivar, setConfirmarDesactivar] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const manejarError = useCallback(
    (err: unknown, enFormulario = false) => {
      if (err instanceof SubaseApiError && err.code === 'NO_AUTORIZADO') {
        onNoAutorizado();
        return;
      }
      const msg = getFriendlyErrorMessage(err).message;
      if (enFormulario) setErrorForm(msg);
      else setError(msg);
    },
    [onNoAutorizado]
  );

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setLista(await fetchVehiculosEmpresa());
    } catch (err) {
      manejarError(err);
    }
  }, [manejarError]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const reemplazar = (v: VehiculoGestion) =>
    setLista((l) => (l ? (l.some((x) => x.id === v.id) ? l.map((x) => (x.id === v.id ? v : x)) : [...l, v]) : [v]));

  const guardarNuevo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevo) return;
    setErrorForm(null);
    setOcupado('nuevo');
    try {
      const creado = await crearVehiculo({ ...nuevo, id: nuevo.id.trim().toLowerCase(), tarifa: Number(nuevo.tarifa) });
      reemplazar(creado);
      setNuevo(null);
    } catch (err) {
      manejarError(err, true);
    } finally {
      setOcupado(null);
    }
  };

  const guardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editando) return;
    const actual = lista?.find((v) => v.id === editando.id);
    if (!actual) return;
    // Solo se envía lo que cambió.
    const cambios: CambiosVehiculo = {};
    for (const k of ['nombre', 'ruta', 'conductor', 'tarifa'] as const) {
      const val = editando.datos[k];
      if (val !== undefined && val !== actual[k]) (cambios as Record<string, unknown>)[k] = k === 'tarifa' ? Number(val) : val;
    }
    if (Object.keys(cambios).length === 0) {
      setEditando(null);
      return;
    }
    setErrorForm(null);
    setOcupado(editando.id);
    try {
      reemplazar(await editarVehiculo(editando.id, cambios));
      setEditando(null);
    } catch (err) {
      manejarError(err, true);
    } finally {
      setOcupado(null);
    }
  };

  const cambiarActivo = async (v: VehiculoGestion, activo: boolean) => {
    setConfirmarDesactivar(null);
    setOcupado(v.id);
    try {
      reemplazar(await editarVehiculo(v.id, { activo }));
    } catch (err) {
      manejarError(err);
    } finally {
      setOcupado(null);
    }
  };

  const activos = lista?.filter((v) => v.activo).length ?? 0;

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-light text-white leading-tight">Vehículos</h1>
          <div className="subase-sand-rule mt-2.5" />
          {lista && (
            <p className="text-[15px] font-normal text-[#C3C5C6] mt-3">
              {activos} {activos === 1 ? 'activo' : 'activos'} de {lista.length} · todos cobran en la billetera de la
              flota
            </p>
          )}
        </div>
        {!nuevo && (
          <button
            type="button"
            onClick={() => {
              setErrorForm(null);
              setEditando(null);
              setNuevo({ ...VACIO });
            }}
            className={`${btnPrincipal} w-full sm:w-auto`}
          >
            <Plus className="w-5 h-5" strokeWidth={1.5} />
            Agregar vehículo
          </button>
        )}
      </div>

      {nuevo && (
        <form onSubmit={guardarNuevo} className="subase-card-sand p-4 sm:p-5 mt-6">
          <h2 className="text-[18px] font-normal text-white">Nuevo vehículo</h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Código del QR" ayuda="Letras, números y guiones. Ej.: bus-03">
              <input
                className={campo}
                value={nuevo.id}
                onChange={(e) => setNuevo({ ...nuevo, id: e.target.value })}
                placeholder="bus-03"
                autoCapitalize="none"
                autoCorrect="off"
                required
                pattern="[a-zA-Z0-9][a-zA-Z0-9-]{1,29}"
              />
            </Campo>
            <Campo label="Tipo" grupo>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de vehículo">
                {(['bus', 'taxi'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={nuevo.tipo === t}
                    onClick={() => setNuevo({ ...nuevo, tipo: t })}
                    className={`min-h-11 rounded-[12px] border text-[15px] cursor-pointer ${
                      nuevo.tipo === t ? 'border-[#D2B99A] text-white' : 'border-[rgba(195,197,198,0.25)] text-[#C3C5C6]'
                    }`}
                  >
                    {t === 'bus' ? 'Bus' : 'Taxi'}
                  </button>
                ))}
              </div>
            </Campo>
            <Campo label="Nombre">
              <input className={campo} value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} placeholder="Bus 03 — Circular" required maxLength={80} />
            </Campo>
            <Campo label="Ruta">
              <input className={campo} value={nuevo.ruta} onChange={(e) => setNuevo({ ...nuevo, ruta: e.target.value })} placeholder="Belén – Centro" required maxLength={80} />
            </Campo>
            <Campo label="Conductor">
              <input className={campo} value={nuevo.conductor} onChange={(e) => setNuevo({ ...nuevo, conductor: e.target.value })} required maxLength={80} />
            </Campo>
            <Campo label="Tarifa (COP)">
              <input
                className={campo}
                type="number"
                inputMode="numeric"
                min={100}
                max={50000}
                step={100}
                value={nuevo.tarifa}
                onChange={(e) => setNuevo({ ...nuevo, tarifa: Number(e.target.value) })}
                required
              />
            </Campo>
          </div>
          {errorForm && <p role="alert" className="text-[15px] text-[#D2B99A] mt-4">{errorForm}</p>}
          <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button type="button" onClick={() => setNuevo(null)} className={btnSecundario}>
              Cancelar
            </button>
            <button type="submit" disabled={ocupado === 'nuevo'} className={btnPrincipal}>
              {ocupado === 'nuevo' && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear vehículo
            </button>
          </div>
        </form>
      )}

      {!lista && !error && (
        <div className="flex-1 flex flex-col items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-[#D2B99A] animate-spin" strokeWidth={1.5} />
        </div>
      )}

      {error && (
        <div role="alert" className="mt-6 max-w-lg">
          <p className="text-[15px] font-normal text-[#C3C5C6]">{error}</p>
          <button type="button" onClick={cargar} className={`${btnSecundario} mt-4`}>
            <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
            Reintentar
          </button>
        </div>
      )}

      {lista && (
        <ul className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {lista.map((v) => {
            const Icono = v.tipo === 'taxi' ? CarTaxiFront : Bus;
            const enEdicion = editando?.id === v.id;
            return (
              <li key={v.id} className={`subase-card p-4 sm:p-5 min-w-0 ${v.activo ? '' : 'opacity-70'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icono className="w-5 h-5 text-[#D2B99A] shrink-0" strokeWidth={1.5} />
                    <span className="text-[17px] font-normal text-white truncate">{v.nombre}</span>
                  </div>
                  <span
                    className={`shrink-0 text-[13px] px-2 py-0.5 rounded-full border ${
                      v.activo ? 'border-[#D2B99A] text-[#D2B99A]' : 'border-[rgba(195,197,198,0.35)] text-[#C3C5C6]'
                    }`}
                  >
                    {v.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {enEdicion && editando ? (
                  <form onSubmit={guardarEdicion} className="mt-4 grid grid-cols-1 gap-3">
                    <Campo label="Nombre">
                      <input className={campo} value={editando.datos.nombre ?? ''} onChange={(e) => setEditando({ id: v.id, datos: { ...editando.datos, nombre: e.target.value } })} required maxLength={80} />
                    </Campo>
                    <Campo label="Ruta">
                      <input className={campo} value={editando.datos.ruta ?? ''} onChange={(e) => setEditando({ id: v.id, datos: { ...editando.datos, ruta: e.target.value } })} required maxLength={80} />
                    </Campo>
                    <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
                      <Campo label="Conductor" ayuda="Cambiarlo abre un turno nuevo">
                        <input className={campo} value={editando.datos.conductor ?? ''} onChange={(e) => setEditando({ id: v.id, datos: { ...editando.datos, conductor: e.target.value } })} required maxLength={80} />
                      </Campo>
                      <Campo label="Tarifa (COP)">
                        <input className={campo} type="number" inputMode="numeric" min={100} max={50000} step={100} value={editando.datos.tarifa ?? 0} onChange={(e) => setEditando({ id: v.id, datos: { ...editando.datos, tarifa: Number(e.target.value) } })} required />
                      </Campo>
                    </div>
                    {errorForm && <p role="alert" className="text-[15px] text-[#D2B99A]">{errorForm}</p>}
                    <div className="flex flex-col-reverse min-[420px]:flex-row min-[420px]:justify-end gap-3 mt-1">
                      <button type="button" onClick={() => setEditando(null)} className={btnSecundario}>
                        Cancelar
                      </button>
                      <button type="submit" disabled={ocupado === v.id} className={btnPrincipal}>
                        {ocupado === v.id && <Loader2 className="w-4 h-4 animate-spin" />}
                        Guardar
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px] font-normal">
                      <dt className="text-[#C3C5C6]">Código</dt>
                      <dd className="text-white break-all">{v.id}</dd>
                      <dt className="text-[#C3C5C6]">Ruta</dt>
                      <dd className="text-white min-w-0">{v.ruta}</dd>
                      <dt className="text-[#C3C5C6]">Conductor</dt>
                      <dd className="text-white min-w-0">{v.conductor}</dd>
                      <dt className="text-[#C3C5C6]">Tarifa</dt>
                      <dd className="text-white tabular-nums">{formatCOP(v.tarifa)}</dd>
                    </dl>

                    {confirmarDesactivar === v.id ? (
                      <div className="mt-4 border-t border-[rgba(195,197,198,0.2)] pt-4">
                        <p className="text-[15px] text-white leading-relaxed">
                          ¿Desactivar {v.nombre}? Su QR deja de cobrar. El historial se conserva.
                        </p>
                        <div className="mt-3 flex flex-col min-[420px]:flex-row gap-3">
                          <button type="button" onClick={() => cambiarActivo(v, false)} className={`${btnSecundario} border-[#D2B99A]`}>
                            Sí, desactivar
                          </button>
                          <button type="button" onClick={() => setConfirmarDesactivar(null)} className={btnSecundario}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 grid grid-cols-2 min-[420px]:flex min-[420px]:flex-wrap gap-2">
                        <Link to={`/qr/${encodeURIComponent(v.id)}`} className={btnSecundario}>
                          <QrCode className="w-4 h-4" strokeWidth={1.5} />
                          Ver QR
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setErrorForm(null);
                            setNuevo(null);
                            setEditando({ id: v.id, datos: { nombre: v.nombre, ruta: v.ruta, conductor: v.conductor, tarifa: v.tarifa } });
                          }}
                          className={btnSecundario}
                        >
                          Editar
                        </button>
                        {v.activo ? (
                          <button type="button" disabled={ocupado === v.id} onClick={() => setConfirmarDesactivar(v.id)} className={btnSecundario}>
                            Desactivar
                          </button>
                        ) : (
                          <button type="button" disabled={ocupado === v.id} onClick={() => cambiarActivo(v, true)} className={btnSecundario}>
                            {ocupado === v.id && <Loader2 className="w-4 h-4 animate-spin" />}
                            Activar
                          </button>
                        )}
                        {v.activo && (
                          <Link to={`/conductor/${encodeURIComponent(v.id)}`} className={btnSecundario}>
                            Terminal
                          </Link>
                        )}
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
