import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, QrCode, RefreshCw } from 'lucide-react';
import { Bajada, ETIQUETA, FichaEstado, PanelCrema, TINTA, Titulo } from './Sistema';
import { coloresDeRuta, partirNombre } from '../lib/rutas';
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

/*
REFERENCIA: mapa de Mini Metro + tablero de llegadas de la Terminal del Norte de Medellín
TIPOGRAFÍA: Poppins 600; ETIQUETA 12 px versalitas; códigos en mono 14 px
PALETA:     campo crema #F0E9D6 · tinta #1E2230 · color de cada línea · gris #A79C86 en inactivo
RIESGO:     cada vehículo es una placa de ruta: la línea de metro con paradas nombradas es el dato
*/

// 16 px en los campos evita que iOS haga zoom al escribir. Bordes de 3 px como en el resto del sistema.
const campo =
  'w-full min-h-11 rounded-[3px] bg-white border-[1.5px] border-[rgba(30,34,48,0.3)] px-3.5 text-[16px] font-normal text-[#1E2230] placeholder:text-[#3A3F4E]/55 focus:outline-none focus:border-[#1E2230]';
const btnBorde =
  'inline-flex items-center justify-center gap-2 min-h-11 px-3.5 rounded-[3px] border-[1.5px] border-[#1E2230] text-[15px] font-semibold text-[#1E2230] cursor-pointer disabled:opacity-50';
const estiloTintaCompacto: React.CSSProperties = {
  width: 'auto',
  minHeight: 44,
  borderRadius: 3,
  padding: '0 16px',
  fontWeight: 600,
  fontSize: 15,
};

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
      <span className="block text-[15px] font-semibold text-[#1E2230] mb-1.5">{label}</span>
      {children}
      {ayuda && <span className="block text-[14px] font-normal text-[#3A3F4E] mt-1">{ayuda}</span>}
    </Contenedor>
  );
};

function insigniaVehiculo(v: Pick<VehiculoGestion, 'id' | 'nombre' | 'tipo'>) {
  const { tipo, numero, empresa } = partirNombre(v.nombre);
  const num =
    numero ||
    v.id.match(/\d+/)?.[0] ||
    (v.tipo === 'taxi' ? 'TX' : v.id.slice(0, 2).toUpperCase());
  const colores = coloresDeRuta(v.tipo === 'taxi' && !v.id.startsWith('taxi-01') ? 'taxi-01' : v.id);
  const etiquetaTipo = (tipo || (v.tipo === 'taxi' ? 'Taxi' : 'Bus')).toUpperCase();
  return { num, colores, etiquetaTipo, empresa };
}

function partirParadas(ruta: string): string[] {
  return ruta.split(/\s+[–—·-]\s+/).filter(Boolean);
}

const LineaParadas: React.FC<{ ruta: string; color: string; inactiva?: boolean }> = ({
  ruta,
  color,
  inactiva = false,
}) => {
  const paradas = partirParadas(ruta);
  if (paradas.length === 0) return null;
  const linea = inactiva ? '#A79C86' : color;
  const last = paradas.length - 1;

  return (
    <div className="mt-4">
      <div className="relative flex">
        <div
          aria-hidden="true"
          className="absolute left-[7px] right-[7px] top-[3px] h-2 pointer-events-none"
          style={
            inactiva
              ? { backgroundImage: 'repeating-linear-gradient(to right, #A79C86 0 8px, transparent 8px 14px)' }
              : { backgroundColor: linea }
          }
        />
        {paradas.map((nombre, i) => {
          const extremo = i === 0 || i === last;
          const align = i === 0 ? 'items-start' : i === last ? 'items-end' : 'items-center';
          const texto = i === 0 ? 'text-left' : i === last ? 'text-right' : 'text-center';
          return (
            <div key={`${nombre}-${i}`} className={`relative z-[1] flex-1 min-w-0 flex flex-col ${align}`}>
              <span
                className="block w-[14px] h-[14px] rounded-full bg-white shrink-0"
                style={{ border: `3px solid ${TINTA}` }}
              />
              <span
                className={`${ETIQUETA} mt-1.5 text-[#1E2230] leading-tight ${texto} ${
                  extremo ? 'font-semibold' : ''
                }`}
              >
                {nombre}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const VACIO: NuevoVehiculo = { id: '', nombre: '', ruta: '', tipo: 'bus', tarifa: 3200 };

interface Props {
  /** El PIN dejó de ser válido: el panel vuelve a pedirlo. */
  onNoAutorizado: () => void;
  /** Barra superior de navegación de la empresa dentro del PanelCrema. */
  barraSuperior?: React.ReactNode;
}

export const FlotaVehiculos: React.FC<Props> = ({ onNoAutorizado, barraSuperior }) => {
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
    for (const k of ['nombre', 'ruta', 'tarifa'] as const) {
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

  const errorConFicha = (msg: string) => (
    <p role="alert" className="mt-4 flex items-start gap-2.5 text-[16px] text-[#1E2230]">
      <FichaEstado estado="fallido" tamano={22} />
      <span>{msg}</span>
    </p>
  );

  return (
    <div className="flex-1 flex flex-col">
      <PanelCrema>
        {barraSuperior}
        <div className="mt-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <Titulo>Vehículos de la flota</Titulo>
            <Bajada className="mt-2">
              {lista ? (
                <>
                  <span className="font-semibold text-[#1E2230] tabular-nums">
                    {activos} {activos === 1 ? 'activo' : 'activos'} de {lista.length}
                  </span>{' '}
                  · todos cobran en{' '}
                  <span className="font-mono text-[14px] text-[#1E2230]">$ilp.interledger-test.dev/flota1</span>
                </>
              ) : (
                'Gestión de rutas, tarifas y códigos QR de la flota.'
              )}
            </Bajada>
          </div>
          {!nuevo && (
            <button
              type="button"
              onClick={() => {
                setErrorForm(null);
                setEditando(null);
                setNuevo({ ...VACIO });
              }}
              className="subase-btn-primary subase-btn-tinta shrink-0 w-full sm:w-auto"
              style={estiloTintaCompacto}
            >
              + Agregar vehículo
            </button>
          )}
        </div>
      </PanelCrema>

      {nuevo && (
        <form onSubmit={guardarNuevo} className="mt-6 pt-6 border-t border-[rgba(30,34,48,0.16)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[20px] font-semibold text-[#1E2230]">Nuevo vehículo</h2>
            <span className={`${ETIQUETA} text-[#3A3F4E]`}>Flota 1</span>
          </div>
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
                {(['bus', 'taxi'] as const).map((t) => {
                  const elegido = nuevo.tipo === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={elegido}
                      onClick={() => setNuevo({ ...nuevo, tipo: t })}
                      className={`min-h-11 rounded-[3px] border-[1.5px] text-[15px] font-semibold cursor-pointer ${
                        elegido
                          ? 'border-[#1E2230] bg-[#1E2230] text-white'
                          : 'border-[#1E2230] text-[#1E2230] hover:bg-[#1E2230]/10'
                      }`}
                    >
                      {t === 'bus' ? 'Bus' : 'Taxi'}
                    </button>
                  );
                })}
              </div>
            </Campo>
            <Campo label="Nombre">
              <input
                className={campo}
                value={nuevo.nombre}
                onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                placeholder="Bus 03 — Circular"
                required
                maxLength={80}
              />
            </Campo>
            <Campo label="Ruta">
              <input
                className={campo}
                value={nuevo.ruta}
                onChange={(e) => setNuevo({ ...nuevo, ruta: e.target.value })}
                placeholder="Belén – Centro"
                required
                maxLength={80}
              />
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
          {errorForm && errorConFicha(errorForm)}
          <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button type="button" onClick={() => setNuevo(null)} className={btnBorde}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={ocupado === 'nuevo'}
              className="subase-btn-primary subase-btn-tinta"
              style={estiloTintaCompacto}
            >
              {ocupado === 'nuevo' && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear vehículo
            </button>
          </div>
        </form>
      )}

      {!lista && !error && (
        <div className="flex-1 flex flex-col items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-[#1E2230] animate-spin" strokeWidth={1.5} />
          <p className="text-[16px] font-normal text-[#3A3F4E] mt-3">Consultando los vehículos…</p>
        </div>
      )}

      {error && (
        <div role="alert" className="mt-6 max-w-lg">
          {errorConFicha(error)}
          <button type="button" onClick={cargar} className={`${btnBorde} mt-4`}>
            <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
            Reintentar
          </button>
        </div>
      )}

      {lista && (
        <ul className="mt-2 grid grid-cols-1 lg:grid-cols-2 lg:gap-x-10 border-t border-[rgba(30,34,48,0.16)]">
          {lista.map((v) => {
            const enEdicion = editando?.id === v.id;
            const { num, colores, etiquetaTipo, empresa } = insigniaVehiculo(v);
            return (
              <li
                key={v.id}
                className={`py-5 border-b border-[rgba(30,34,48,0.16)] min-w-0 ${v.activo ? '' : 'opacity-60'}`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="inline-flex items-center justify-center min-w-11 h-11 px-2 rounded-[3px] text-[22px] font-semibold tabular-nums leading-none shrink-0"
                    style={{ backgroundColor: colores.color, color: colores.texto }}
                  >
                    {num}
                  </span>
                  <div className="min-w-0 leading-tight flex-1">
                    <span className={`block ${ETIQUETA} text-[#1E2230]`}>
                      {etiquetaTipo} {num}
                    </span>
                    <span className="block text-[20px] font-semibold text-[#1E2230] mt-0.5 leading-tight">
                      {empresa || v.nombre}
                    </span>
                  </div>
                </div>

                {enEdicion && editando ? (
                  <form onSubmit={guardarEdicion} className="mt-4 grid grid-cols-1 gap-3">
                    <Campo label="Nombre">
                      <input
                        className={campo}
                        value={editando.datos.nombre ?? ''}
                        onChange={(e) =>
                          setEditando({ id: v.id, datos: { ...editando.datos, nombre: e.target.value } })
                        }
                        required
                        maxLength={80}
                      />
                    </Campo>
                    <Campo label="Ruta">
                      <input
                        className={campo}
                        value={editando.datos.ruta ?? ''}
                        onChange={(e) =>
                          setEditando({ id: v.id, datos: { ...editando.datos, ruta: e.target.value } })
                        }
                        required
                        maxLength={80}
                      />
                    </Campo>
                      <Campo label="Tarifa (COP)">
                        <input
                          className={campo}
                          type="number"
                          inputMode="numeric"
                          min={100}
                          max={50000}
                          step={100}
                          value={editando.datos.tarifa ?? 0}
                          onChange={(e) =>
                            setEditando({
                              id: v.id,
                              datos: { ...editando.datos, tarifa: Number(e.target.value) },
                            })
                          }
                          required
                        />
                      </Campo>
                    {errorForm && errorConFicha(errorForm)}
                    <div className="flex flex-col-reverse min-[420px]:flex-row min-[420px]:justify-end gap-3 mt-1">
                      <button type="button" onClick={() => setEditando(null)} className={btnBorde}>
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={ocupado === v.id}
                        className="subase-btn-primary subase-btn-tinta"
                        style={estiloTintaCompacto}
                      >
                        {ocupado === v.id && <Loader2 className="w-4 h-4 animate-spin" />}
                        Guardar
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <LineaParadas ruta={v.ruta} color={colores.color} inactiva={!v.activo} />

                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
                      <div>
                        <p className={`${ETIQUETA} text-[#3A3F4E]`}>Pasaje</p>
                        <p
                          className="inline-flex mt-1 px-2 py-1 rounded-[3px] text-[16px] font-semibold tabular-nums text-white"
                          style={{ backgroundColor: TINTA }}
                        >
                          {formatCOP(v.tarifa)}
                        </p>
                      </div>
                      <div>
                        <p className={`${ETIQUETA} text-[#3A3F4E]`}>Código QR</p>
                        <p className="font-mono text-[14px] text-[#1E2230] mt-0.5">{v.id}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2.5 text-[16px] text-[#1E2230]">
                      {v.activo ? (
                        <>
                          <FichaEstado estado="pagado" tamano={22} />
                          <span>En ruta</span>
                        </>
                      ) : (
                        <>
                          <span
                            aria-hidden="true"
                            className="inline-flex shrink-0 rounded-[3px]"
                            style={{ width: 22, height: 22, backgroundColor: '#A79C86' }}
                          />
                          <span>Inactivo</span>
                        </>
                      )}
                    </div>

                    {confirmarDesactivar === v.id ? (
                      <div className="mt-4 pt-4 border-t border-[rgba(30,34,48,0.16)]">
                        <p className="text-[16px] text-[#1E2230] leading-relaxed">
                          ¿Desactivar {v.nombre}? Su QR deja de cobrar. El historial se conserva.
                        </p>
                        <div className="mt-3 flex flex-col min-[420px]:flex-row gap-3">
                          <button type="button" onClick={() => cambiarActivo(v, false)} className={btnBorde}>
                            Sí, desactivar
                          </button>
                          <button type="button" onClick={() => setConfirmarDesactivar(null)} className={btnBorde}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 pt-3 border-t border-[rgba(30,34,48,0.16)] flex flex-wrap gap-2">
                        <Link
                          to={`/qr/${encodeURIComponent(v.id)}`}
                          className="subase-btn-primary subase-btn-tinta"
                          style={estiloTintaCompacto}
                        >
                          <QrCode className="w-4 h-4" strokeWidth={2} />
                          Ver QR
                        </Link>
                        {v.activo && (
                          <Link to={`/conductor/${encodeURIComponent(v.id)}`} className={btnBorde}>
                            Terminal
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setErrorForm(null);
                            setNuevo(null);
                            setEditando({
                              id: v.id,
                              datos: {
                                nombre: v.nombre,
                                ruta: v.ruta,
                                tarifa: v.tarifa,
                              },
                            });
                          }}
                          className={btnBorde}
                        >
                          Editar
                        </button>
                        {v.activo ? (
                          <button
                            type="button"
                            disabled={ocupado === v.id}
                            onClick={() => setConfirmarDesactivar(v.id)}
                            className={btnBorde}
                          >
                            Desactivar
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={ocupado === v.id}
                            onClick={() => cambiarActivo(v, true)}
                            className={btnBorde}
                          >
                            {ocupado === v.id && <Loader2 className="w-4 h-4 animate-spin" />}
                            Activar
                          </button>
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
