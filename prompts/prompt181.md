Contexto: repo de Súbase (hackathon Interledger Open Payments). Lee AGENTS.md, CLAUDE.md y ESTADO.md antes de empezar. Stack actual: frontend React + Vite en src/, backend Vercel Functions en api/, base Supabase (Postgres), esquema en "Database Infrastructure/".

Decisión de producto: el vehículo YA NO tiene conductor. Un bus tiene varios conductores, así que el conductor no es un dato del vehículo. Los turnos se abren sin nombre y cada viaje sigue atado a su turno (viajes.turno_id). No debe quedar ningún lugar del front, del back ni de la base que lea o escriba vehiculos.conductor, para que nunca haya razón de volver a crear esa columna. Hoy crear un vehículo desde /flota falla en producción porque la columna vehiculos.conductor se borró en Supabase y el backend todavía la escribe.

Tarea: haz exactamente estos cambios, nada más.

1. Base de datos
   a) Crea "Database Infrastructure/0003_sin_conductor_en_vehiculo.sql" con este contenido:
      -- Migración 0003 — Súbase · El vehículo no tiene conductor (Supabase → SQL Editor → Run)
      -- Un bus tiene varios conductores: el conductor no es un dato del vehículo. Los turnos se abren sin nombre
      -- y cada viaje queda atribuido a su turno (viajes.turno_id). Se puede correr más de una vez.
      -- Orden en producción: correr este archivo completo ANTES de desplegar el código nuevo. El código viejo sigue
      -- funcionando (cobrar, feed, /flota, editar nombre/ruta/tarifa); solo fallan crear un vehículo y cambiarle el conductor.
      alter table public.turnos alter column conductor drop not null;
      alter table public.vehiculos drop column if exists conductor;
      select table_name, column_name, is_nullable from information_schema.columns
      where table_schema = 'public' and column_name = 'conductor';
   b) En "Database Infrastructure/supabase-setup.sql": quita la columna conductor de la tabla vehiculos; deja turnos.conductor como "text null"; en el seed inserta los vehículos sin conductor y abre los turnos con "insert into public.turnos (vehiculo_id) select id from public.vehiculos;".

2. Backend (api/)
   - api/_lib/db.ts: quita conductor de la interfaz Vehiculo; en Turno, conductor pasa a "string | null".
   - api/_lib/gestion.ts: vehiculoGestion ya no devuelve conductor; abrirTurno(vehiculoId) ya no recibe conductor e inserta solo { vehiculo_id }.
   - api/empresa/vehiculos/index.ts (POST): no pedir, validar ni insertar conductor; abrirTurno(v.id). Actualiza el comentario de cabecera.
   - api/empresa/vehiculos/[id].ts (PATCH): quita conductor de los cambios aceptados y la lógica "cambiar el conductor cierra y abre turno". Se mantiene: desactivar cierra el turno; reactivar (sin turno abierto) abre uno con abrirTurno(id). Actualiza el comentario de cabecera.
   - api/flota.ts: quita conductor de porVehiculo y la consulta de turnos que solo servía para eso (y el import de Turno si queda sin uso).

3. Frontend (src/)
   - src/components/FlotaVehiculos.tsx: quita el campo «Conductor» del formulario de crear (y del estado inicial VACIO), del formulario de editar (Tarifa queda sola, sin la grilla de 2 columnas), la fila «Conductor» de la ficha, 'conductor' de las claves que envía guardarEdicion y del setEditando del botón «Editar».
   - src/lib/api.ts: quita conductor de VehiculoGestion, NuevoVehiculo, CambiosVehiculo y FlotaVehiculo, y de los datos de Vista Previa (FLOTA_META solo con tipo, leerVehiculosPreview, el armado de porVehiculo).
   - src/pages/FlotaPage.tsx: en «Por vehículo» la línea muestra solo v.ruta (quita lineaConductorRuta).
   - Al final, grep "conductor" en src/ y api/: solo pueden quedar los enlaces /conductor/:id, la vista del conductor y comentarios de turnos.

4. Docs
   - ESTADO.md: contrato POST/PATCH /api/empresa/vehiculos sin conductor; quitar "conductor" del ejemplo JSON de /api/flota y reemplazar la nota que dice que conductor sale del turno o de vehiculos.conductor; agregar una fila con este cambio y la migración 0003.
   - AGENTS.md: las 3 filas de /api/empresa/vehiculos sin conductor (y sin "cambiar conductor cierra y abre turno").
   - README.md: /flota → "crear, editar nombre, ruta y tarifa, activar o desactivar, ver QR".
   - AI_USAGE.md y /prompts/: según la regla de la sección 10.1 de AGENTS.md.

5. Verificación (obligatoria antes del commit)
   - npm run typecheck:api y npm run build sin errores.
   - En Vista Previa (npm run dev, «Vista Previa UI», PIN cualquiera) en /flota a 375 px: crear bus-03 y editar su tarifa sin que aparezca «Conductor» en ningún lado, sin errores en consola ni scroll horizontal.

6. Producción, en este orden:
   a) Correr 0003 completo en Supabase → SQL Editor. La verificación debe mostrar solo "turnos | conductor | YES".
   b) Commit con mi nombre (sin líneas Co-Authored-By ni de Claude) y push a main; Vercel despliega solo.
   c) Probar en producción: crear bus-03 desde /flota, pagarlo desde el celular y verlo en /conductor/bus-03 y en /flota.
   Si se despliega antes de correr 0003, crear un vehículo puede dejar el vehículo guardado sin turno abierto.
