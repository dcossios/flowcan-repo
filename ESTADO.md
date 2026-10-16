# ESTADO.md — Súbase

> Fuente de verdad del avance y del contrato de API entre Frontend (`src/`) y Backend (`server/`).
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
| **Frontend ↔ Backend** | El front espera `estado` en `pendiente` / `pagado` / `fallido` en el feed, y en `PAGO_DUPLICADO` el recibo en `error.recibo` o `error.details` | ⏳ Confirmar con David | Andrés / David |
| **Frontend (`src/`)** | `/flota` — panel de la empresa: recaudo, pasajes, comisión estimada, por ruta, por vehículo y últimos pagos (polling 5 s); si `GET /api/flota` da 404, se arma con `/feed` | ✅ Listo (probado en Vista Previa, 375 y 1280 px) | Andrés |
| **Backend** | `GET /api/flota` (propuesta en 2.1). Montos en COP hacia el front. Ids del seed: `bus-01`, `bus-02`, `taxi-01` | ⏳ Confirmar con David | David |
| **Backend (`server/`)** | Inicializar Node 20 + Express + SQLite + `@interledger/open-payments` | ⏳ Pendiente | David |
| **Backend (`server/`)** | Endpoints `/api/vehiculos/:id`, `/api/pases`, `/api/viajes`, `/feed` | ⏳ Pendiente | David |
| **Integración** | Prueba end-to-end contra Interledger Test Wallet | ⏳ Pendiente | Santiago / David |

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
| `GET` | `/api/flota?fecha=` | — | → resumen de la flota del día (propuesta, ver 2.1) |

> **Montos hacia el front: siempre en pesos colombianos enteros.** `viajes.monto` en Supabase está escalado en la moneda de la wallet (USD, escala 2), así que el backend responde con el valor en COP (`vehiculos.tarifa_cop`) en `monto`, `tarifa`, `recaudo`, `cashback`, `disponibleHoy` y `topeDiario`. Si el front recibe `monto: 100`, muestra «$100».

### 2.1 Propuesta `GET /api/flota` (panel de la empresa, `/flota`) — por confirmar con David

`fecha` es opcional (`YYYY-MM-DD`, por defecto hoy en `America/Bogota`). Sale de `vehiculos` + `viajes` del esquema de `Database Infrastructure/supabase-setup.sql`.

```json
{
  "fecha": "2026-10-17",
  "actualizadoEn": "2026-10-17T14:05:00Z",
  "totales": { "recaudo": 9600, "pasajes": 3, "pendientes": 0, "fallidos": 1, "vehiculosConPagos": 2, "vehiculos": 3 },
  "porRuta": [ { "ruta": "Poblado – Centro – Laureles", "recaudo": 6400, "pasajes": 2, "vehiculos": 1 } ],
  "porVehiculo": [ { "id": "bus-01", "nombre": "Bus 01 — Circular Coonatra", "ruta": "Poblado – Centro – Laureles", "tipo": "bus", "conductor": "Carlos Muñoz", "tarifa": 3200, "recaudo": 6400, "pasajes": 2, "fallidos": 0, "ultimoPagoEn": "2026-10-17T14:03:10Z" } ],
  "ultimosPagos": [ { "viajeId": "…", "vehiculoId": "bus-01", "monto": 3200, "estado": "pagado", "fecha": "2026-10-17T14:03:10Z" } ]
}
```

- `recaudo` y `pasajes` cuentan solo `estado = 'pagado'`. `pendientes` y `fallidos` cuentan los otros dos estados del día.
- `porRuta` agrupa por `vehiculos.ruta`; `porRuta` y `porVehiculo` van ordenados por `recaudo` de mayor a menor e incluyen vehículos sin pagos (con 0).
- `ultimosPagos`: los 20 viajes más recientes del día, de cualquier estado.
- `conductor` sale del turno abierto (`turnos.conductor`) o, si no hay, de `vehiculos.conductor`. `ultimoPagoEn` y `conductor` pueden ser `null`.
- La comisión de Súbase (1,5 %) la calcula el front sobre `recaudo`; no hace falta en la respuesta.
- **Si la ruta todavía no existe (404), el front arma el mismo resumen** con `GET /api/vehiculos/:id` y `/feed` de `bus-01`, `bus-02` y `taxi-01`. La demo no depende de este endpoint.

### Códigos de error (`{ error: { code, message } }`)
- `SALDO_INSUFICIENTE`
- `TOPE_ALCANZADO`
- `PAGO_DUPLICADO`
- `PASE_INVALIDO`
- `PASE_VENCIDO`
- `OP_ERROR`
