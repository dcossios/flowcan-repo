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

### Códigos de error (`{ error: { code, message } }`)
- `SALDO_INSUFICIENTE`
- `TOPE_ALCANZADO`
- `PAGO_DUPLICADO`
- `PASE_INVALIDO`
- `PASE_VENCIDO`
- `OP_ERROR`
