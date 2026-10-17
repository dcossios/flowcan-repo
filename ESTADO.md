# ESTADO.md — Súbase

> Fuente de verdad del avance y del contrato de API entre Frontend (`src/`) y Backend (`api/`, Vercel Functions + Supabase).
> Última actualización: Viernes 16 oct 2026.

---

## 1. Avance por componente

| Área | Tarea | Estado | Responsable |
|---|---|---|---|
| **Documentación** | `AGENTS.md`, `CLAUDE.md`, `AI_USAGE.md`, `/prompts/` | ✅ Listo | Equipo |
| **Frontend (`src/`)** | Configuración React + Vite + TypeScript + Tailwind + `qrcode.react` | ✅ Listo | Frontend |
| **Frontend (`src/`)** | Cliente API (`src/lib/api.ts`) + sesión `Bearer` en `localStorage` | ✅ Listo | Frontend |
| **Frontend (`src/`)** | `/v/:vehiculoId` — Cobro de pasaje con un toque y cupo disponible | ✅ Listo | Frontend |
| **Frontend (`src/`)** | `/pase/activar` — Wallet address + tope diario ($10k / **$20k** / $30k) | ✅ Listo | Frontend |
| **Frontend (`src/`)** | `/pase/listo` — Confirmación del grant GNAP (`interact_ref`, `hash`) | ✅ Listo | Frontend |
| **Frontend (`src/`)** | `/recibo/:viajeId` — Comprobante con cashback simulado (2%) | ✅ Listo | Frontend |
| **Frontend (`src/`)** | `/conductor/:vehiculoId` — QR grande + recaudo del turno + feed 2s con sonido | ✅ Listo | Frontend |
| **Frontend (`src/`)** | Rediseño sobre el pitch y la Guía de Marca: flujo de 3 pasos, botón fijo, trato de usted, recibo para mostrar al conductor, `/` = «Pagar otra vez» | ✅ Listo (probado en Vista Previa) | Andrés |
| **Frontend (`src/`)** | Conductor: «Empezar turno», capa a pantalla completa y voz solo con `estado === 'pagado'`; `pendiente` = «Confirmando…», `fallido` = «Pago fallido» | ✅ Listo (probado en Vista Previa) | Andrés |
| **Frontend ↔ Backend** | El feed devuelve `estado` en `pendiente` / `pagado` / `fallido`, y `PAGO_DUPLICADO` trae el recibo en `error.recibo` | ✅ Soportado en `api/_lib/errores.ts` | Andrés / David |
| **Frontend (`src/`)** | `/flota` — panel de la empresa: recaudo, pasajes, comisión estimada, por ruta, por vehículo y últimos pagos (polling 5 s); si `GET /api/flota` da 404, se arma con `/feed` | ✅ Listo (probado en Vista Previa, 375 y 1280 px) | Andrés |
| **Backend (`api/`)** | Stack: Vercel Functions (Node) + Supabase Postgres + `@interledger/open-payments` 7.4.0. Sin Express, SQLite ni Railway | ✅ Decidido | David |
| **Backend (`api/`)** | Spike de pago real (`scripts/spike-pago.ts`): 3.200 COP `test_platzi1` → `flota1`, pagado en ~3 s | ✅ Listo | David |
| **Backend (`api/`)** | Librería `api/_lib/`: `op.ts` (pase, hash, rotación, cobro, confirmación, gastado hoy), `db.ts`, `auth.ts`, `errores.ts` | ✅ Listo (compila; helpers probados contra la Test Wallet) | David |
| **Backend (`api/`)** | ¿Se puede rotar un token del pase ya vencido? (`scripts/prueba-rotacion.ts`) | ✅ Sí: el pase sobrevive sin uso. Token vencido = `403 Inactive Token` (mapeado a `PASE_VENCIDO`) | David |
| **Backend (`api/`)** | 7 endpoints + `vercel.json` + API local (`npm run dev:api`, puerto 3001) | ✅ Escritos y compilan; rutas y errores probados en local. **Falta probarlos con Supabase** (faltan `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`) | David |
| **Backend** | `GET /api/flota` (formato de 2.1, confirmado) **con PIN de empresa** (`X-Empresa-Pin`) | ✅ Escrito; falta probar con Supabase | David |
| **Backend** | `GET /api/viajes` (mis viajes del pasajero) y gestión: `GET/POST /api/empresa/vehiculos`, `PATCH /api/empresa/vehiculos/:id` (con PIN) | ✅ Escrito; falta probar con Supabase | David |
| **Frontend** | Conectado al backend nuevo: PIN de empresa en `/flota` (pestañas «Resumen» y «Vehículos»: crear, editar, activar/desactivar, ver QR), «Mi pase» (`/mi-pase`: disponible hoy, vence, mis viajes, quitar pase), recibo con `pendiente`/`fallido` (se actualiza solo), QR imprimible (`/qr/:vehiculoId`), enlace «Mi pase» en el encabezado del pasajero | ✅ Listo en vista previa; sin desborde horizontal a 320, 375, 768 y 1280 px. Falta probar contra Supabase | David |
| **Integración** | Prueba end-to-end en local (front 5173 + API 3001 + Supabase + Test Wallet): activar pase `test_platzi1` → pagar `bus-01` → recibo, «Mi pase», conductor y `/flota` | ✅ 16 oct: viaje `pagado` en ~6 s, con incoming/quote/outgoing guardados, turno del conductor y cashback 2 % | David |
| **Integración** | Supabase: `vehiculos.wallet_address` sin `unique` y los 3 vehículos en `flota1`, COP/2, `tarifa = 320000` | ✅ Aplicado en la base; `Database Infrastructure/supabase-setup.sql` corregido | David |
| **Deploy** | Producción en https://flowcan-repo.vercel.app con las 7 variables (`OP_*`, `SUPABASE_*`, `EMPRESA_PIN`, `APP_URL`) | ✅ 16 oct: pago real desde el celular (`test_platzi1` → `bus-01`), `pagado` en ~6,5 s; un segundo toque dentro de 2 min devolvió `409 PAGO_DUPLICADO` sin cobrar | David |
| **Frontend** | Scroll «pegado» en el celular: el contenedor de `AppShell` tenía scroll propio (`overflow-x: hidden`) y `min-h-dvh` recalculaba el diseño al esconderse la barra de Safari; capas del conductor sin bloqueo del fondo | ✅ Corregido y verificado en emulación de iPhone 14; falta confirmarlo en un iPhone real | David |
| **Frontend** | Sistema de diseño (`src/components/Sistema.tsx`), elegido por Andrés el 17 oct: panel crema arriba de cada pantalla con el número de ruta en un cuadro del color de su línea, título Poppins 600, ruta con flechas y «Pasaje» con el monto en cuadro tinta; detalles en negro; botón principal blanco en píldora con flecha (el marino daba 1,7 : 1 sobre negro). Inicio con la escena de Ayacucho (Flow + SVG animado); el conductor empieza el turno con la misma escena | ✅ Aplicado a inicio, cobro, activar pase, pase listo, recibo, mi pase, conductor y empresa (`/flota` pestañas «Resumen» y «Vehículos» con `PanelCrema`, `Pasaje` grande, `FichaEstado`, insignias y barras del color de cada ruta); probado en Vista Previa a 320, 375 y 1280 px. Escena fija en la variante D (sin el edificio vecino, al 78 %); en el conductor llena la pantalla con las calles hasta el borde. Prioridad 3 (17 oct): cobro con fondo crema completo y la ruta por titular; «Hoy le alcanza para N pasajes» con un cuadro por pasaje; el pase y «Cambiar» encima de «Pagar»; recaudo del turno arriba en el conductor; «¿Otro bus? Escanee su QR» en el inicio | Andrés |
| **Pagos** | Pago en cualquier moneda: el pasajero paga en la suya (CAD, USD…) y el bus recibe COP exactos. `GET /api/wallet`, topes por moneda, `viajes.debito_*`, confirmación por el incoming payment, recibo «Pagó CAD 1,44 · el bus recibió $3.200» | ✅ 17 oct: migración 0002 aplicada y prueba de punta a punta en local: `turista1` pagó **CAD 1,44** y `flota1` recibió **320000 COP** (incoming `completed`), viaje `pagado` en ~6 s | David |
| **Base / API / Front** | El vehículo ya no tiene conductor: se quita `vehiculos.conductor` de la base, del backend y del front; los turnos se abren sin nombre (`turnos.conductor` opcional) y cada viaje sigue atado a su turno. Arregla crear un vehículo desde `/flota`, que fallaba en producción porque la columna ya no existía. Migración `Database Infrastructure/0003_sin_conductor_en_vehiculo.sql` (correr **antes** del deploy) | ✅ Código listo y verificado en Vista Previa; ⏳ correr 0003 en Supabase y probar en producción | David |
| **Deploy** | Variables `OP_*` en el entorno **Preview** de Vercel siguen con la llave vieja (la CLI pide rama) | ⏳ Corregir desde el panel de Vercel si se usan URLs de preview | David |

---

## 2. Contrato de API vigente

| Método | Ruta | Auth | Body / Respuesta |
|---|---|---|---|
| `GET` | `/api/vehiculos/:id` | `Bearer` opcional | → `{ id, nombre, ruta, tarifa, moneda, paseActivo, disponibleHoy, topeDiario }` |
| `POST` | `/api/pases` | — | `{ walletAddress, topeDiario, volver }` → `{ paseId, redirectUrl }` |
| `POST` | `/api/pases/:paseId/confirmar` | — | `{ interactRef, hash }` → `{ paseToken, pase }` |
| `GET` | `/api/pases/me` | `Bearer` | → `{ activo, topeDiario, disponibleHoy, venceEn }` |
| `POST` | `/api/viajes` | `Bearer` | `{ vehiculoId }` → `{ viajeId, monto, cashback, vehiculo, fecha, disponibleHoy }` |
| `GET` | `/api/viajes/:id` | `Bearer` | → `{ viajeId, monto, cashback, vehiculo, fecha, disponibleHoy }` |
| `GET` | `/api/vehiculos/:id/feed?desde=` | — | → `[{ viajeId, monto, estado, fecha }]` |
| `GET` | `/api/viajes` | `Bearer` | → mis viajes `[{ viajeId, monto, cashback, estado, fecha, vehiculo: { id, nombre, ruta } }]` |
| `GET` | `/api/flota?fecha=` | PIN | → resumen del día (2.1) |
| `GET` / `POST` | `/api/empresa/vehiculos` | PIN | lista (incluye inactivos) / crea `{ id, nombre, ruta, tipo, tarifa }` (abre un turno sin nombre) |
| `PATCH` | `/api/empresa/vehiculos/:id` | PIN | `{ nombre?, ruta?, tarifa?, activo? }` (desactivar cierra el turno; reactivar abre uno) |
| `GET` | `/api/flota?fecha=` | — | → resumen de la flota del día (propuesta, ver 2.1) |

> **Montos hacia el front: siempre en pesos colombianos enteros.** `viajes.monto` en Supabase está escalado en la moneda de la wallet (USD, escala 2), así que el backend responde con el valor en COP (`vehiculos.tarifa_cop`) en `monto`, `tarifa`, `recaudo`, `cashback`, `disponibleHoy` y `topeDiario`. Si el front recibe `monto: 100`, muestra «$100».

### 2.1 `GET /api/flota` (panel de la empresa, `/flota`) — confirmado e implementado en `api/flota.ts`

**Cambio respecto a la propuesta:** pide el PIN de empresa en el header `X-Empresa-Pin` (el panel muestra el recaudo). Si falta o es incorrecto responde `401 NO_AUTORIZADO`. Incluye los vehículos inactivos solo si tuvieron viajes ese día.

`fecha` es opcional (`YYYY-MM-DD`, por defecto hoy en `America/Bogota`). Sale de `vehiculos` + `viajes` del esquema de `Database Infrastructure/supabase-setup.sql`.

```json
{
  "fecha": "2026-10-17",
  "actualizadoEn": "2026-10-17T14:05:00Z",
  "totales": { "recaudo": 9600, "pasajes": 3, "pendientes": 0, "fallidos": 1, "vehiculosConPagos": 2, "vehiculos": 3 },
  "porRuta": [ { "ruta": "Poblado – Centro – Laureles", "recaudo": 6400, "pasajes": 2, "vehiculos": 1 } ],
  "porVehiculo": [ { "id": "bus-01", "nombre": "Bus 01 — Circular Coonatra", "ruta": "Poblado – Centro – Laureles", "tipo": "bus", "tarifa": 3200, "recaudo": 6400, "pasajes": 2, "fallidos": 0, "ultimoPagoEn": "2026-10-17T14:03:10Z" } ],
  "ultimosPagos": [ { "viajeId": "…", "vehiculoId": "bus-01", "monto": 3200, "estado": "pagado", "fecha": "2026-10-17T14:03:10Z" } ]
}
```

- `recaudo` y `pasajes` cuentan solo `estado = 'pagado'`. `pendientes` y `fallidos` cuentan los otros dos estados del día.
- `porRuta` agrupa por `vehiculos.ruta`; `porRuta` y `porVehiculo` van ordenados por `recaudo` de mayor a menor e incluyen vehículos sin pagos (con 0).
- `ultimosPagos`: los 20 viajes más recientes del día, de cualquier estado.
- `porVehiculo` no trae `conductor`: el vehículo no tiene conductor (un bus tiene varios) y cada viaje queda atado a su turno (`viajes.turno_id`). `ultimoPagoEn` puede ser `null`.
- La comisión de Súbase (1,5 %) la calcula el front sobre `recaudo`; no hace falta en la respuesta.
- **Si la ruta todavía no existe (404), el front arma el mismo resumen** con `GET /api/vehiculos/:id` y `/feed` de `bus-01`, `bus-02` y `taxi-01`. La demo no depende de este endpoint.

### Códigos de error (`{ error: { code, message } }`)
- `SALDO_INSUFICIENTE`
- `TOPE_ALCANZADO`
- `PAGO_DUPLICADO`
- `PASE_INVALIDO`
- `PASE_VENCIDO`
- `OP_ERROR`
- `NO_ENCONTRADO` (404), `DATOS_INVALIDOS` (400) y `NO_AUTORIZADO` (401, PIN de empresa): extra del backend; el front los muestra como `OP_ERROR` con el mensaje del backend hasta que `api.ts` los agregue.

**Montos:** la API habla en **pesos** (`tarifa: 3200`, `topeDiario: 20000`). La base de datos y Open Payments usan unidades mínimas (COP, `assetScale` 2 → `320000`). La conversión está en `api/_lib/op.ts` (`aMinimas`, `aPesos`).

---

## 3. Datos verificados de la Test Wallet (16 oct)
- Flota y cliente de Súbase: `https://ilp.interledger-test.dev/flota1` (COP, `assetScale` 2). La Test Wallet solo permite **una address en COP por cuenta**, así que todos los vehículos cobran en `flota1` y el `metadata` del incoming payment identifica vehículo, turno y viaje.
- Pasajero de prueba: `https://ilp.interledger-test.dev/test_platzi1` (otra cuenta, COP).
- Token del pase: `expires_in: 600` (10 min). Quote: vence a los 5 min. Pago confirmado en ~3 s.
- **Para Santiago:** en `Database Infrastructure/supabase-setup.sql`, `vehiculos.wallet_address` es `unique` y el seed usa wallets `REEMPLAZAR-*` en USD. Debe quedar sin `unique`, con `wallet_address = 'https://ilp.interledger-test.dev/flota1'`, `asset_code = 'COP'`, `asset_scale = 2` y `tarifa = 320000` para los tres vehículos.
