# AGENTS.md — Súbase

> Instrucciones para cualquier agente de código (Codex, Claude, Lovable, Copilot) que trabaje en este repo.
> Hackathon Interledger Open Payments · Medellín · 16–17 oct 2026 · **Deadline duro: sábado 17, 11:00 (código congelado 10:15).**

---

## 0. REGLA #1 — OPEN PAYMENTS ES OBLIGATORIO (NO NEGOCIABLE)

- Todo movimiento de dinero se hace con **Open Payments de Interledger**, usando el SDK oficial **`@interledger/open-payments`** contra la **Interledger Test Wallet** (`https://wallet.interledger-test.dev`).
- Sin Open Payments el proyecto **no es evaluado**. Ninguna simulación reemplaza un pago real en la Test Wallet.
- **No inventes APIs ni firmas del SDK.** Si no estás seguro de un método, parámetro o respuesta, verifica en la documentación (https://openpayments.dev/es/) o en la guía del SDK (https://openpayments.dev/es/sdk/before-you-begin/) y déjalo marcado con `// TODO verificar`.
- El SDK y las llaves privadas viven **solo en el backend**. Nunca en el frontend ni en el repo.
- **No custodiamos fondos:** el dinero va de la wallet del pasajero a la wallet del vehículo. Súbase solo orquesta.

---

## 1. Qué es

Recaudo digital para buses barriales y taxis de Medellín. El pasajero escanea el QR del vehículo con la cámara de su celular (iPhone o Android) y paga con un toque bajo un **pase preautorizado** (grant de Open Payments con tope diario). El conductor ve el pago confirmado en vivo.

---

## 2. Decisiones tomadas (no reabrir sin el equipo)

| Tema | Decisión |
|---|---|
| Plataforma | **Web app (PWA) mobile-first.** Sin app nativa, sin Expo. |
| Método de pago | **QR → `/v/:vehiculoId`**, leído con la cámara nativa. Sin escáner dentro de la app. |
| NFC | **Roadmap, no se construye.** (Sticker NFC con la misma URL; Web NFC del conductor para la tarjeta de no bancarizados). |
| Wallet receptora | **Una cuenta de la flota en la Test Wallet, con una wallet address por vehículo.** El dinero cae directo en la flota, sin barridos. |
| Conductor | No tiene wallet. Se identifica por turno en nuestro backend, que le atribuye cada pago. |
| Pase | Grant `outgoing-payment` **interactivo una sola vez**, con `limits.debitAmount` (tope) + `limits.interval` (diario), vigencia de 30 días, **sin `receiver`** (sirve para cualquier vehículo). |
| Tarifa | Variable por vehículo. Vive en el backend (`vehiculos.tarifa`), **nunca en la URL**. |
| Confirmación | **Un toque en "Pagar"** (no cobro automático al abrir la URL). |
| Sesión del pase | **Token en `localStorage` del navegador, enviado como `Authorization: Bearer`.** No usar cookies: front y API están en dominios distintos y Safari bloquea cookies de terceros. |
| Cashback | **Simulado** (calculado y mostrado en el recibo, sin pago real). Debe decirse así en el pitch. |
| Nequi / bancos | No exponen Open Payments. Son solo canal de recarga (vía Bre-B) en el pitch. No construir. |
| Divisas (turista USD→COP) | Opcional, solo si el núcleo funciona a las 10:00 del sábado. |

---

## 3. Piezas de Open Payments que usamos

| Pieza | Uso |
|---|---|
| **Wallet addresses** | Pasajero; una por vehículo (dentro de la cuenta de la flota); la de Súbase como cliente que firma las peticiones. |
| **Grants (GNAP)** | Interactivo: el pase del pasajero (`outgoing-payment`). No interactivos: `incoming-payment` y `quote`. |
| **Límites de gasto** | `debitAmount` + `interval`. Esto es el pase y el diferencial frente a un QR bancario. |
| **Incoming payment** | La "solicitud" de cobro del vehículo, con `incomingAmount` = tarifa. |
| **Quote** | Cuánto se debita al pasajero (y la conversión de divisa si aplica). |
| **Outgoing payment** | La ejecución de cada viaje bajo el grant, sin interacción. |
| **Rotación de token** | El access token del pase expira: se rota en el backend antes de cobrar. |

**Patrón de pago:** pagos recurrentes con **límite de gasto y monto variable** + una **solicitud** (incoming payment) por viaje.

**Mapeo a la demo exigida:** Solicitud = incoming payment + quote · Autorización = activar el pase · Ejecución = outgoing payment · Finalización = "✅ Pasaje pagado" en la vista del conductor.

---

## 4. Stack

| Capa | Tecnología |
|---|---|
| Backend | **Node 20 + TypeScript + Express**, ejecutado con `tsx` |
| Pagos | **`@interledger/open-payments`** (SDK oficial) + Interledger Test Wallet |
| Persistencia | **SQLite** (`better-sqlite3`): pases, viajes, vehículos, turnos |
| Frontend | **Lovable** (React + Vite + Tailwind), `qrcode.react` para el QR |
| Tiempo real (feed) | Consulta cada 2 s (polling); SSE solo si sobra tiempo |
| Deploy | Front: Lovable Publish (o Vercel). Backend: Railway con volumen para SQLite. **HTTPS obligatorio.** |

---

## 5. Estructura del repo

```
/                  ← repo público (sincronizado con Lovable)
├── src/           ← frontend (Lovable, no editar a mano sin avisar a Samuel)
├── server/        ← backend Node + Open Payments
│   ├── src/
│   │   ├── op/            # cliente Open Payments: grants, incoming, quote, outgoing
│   │   ├── routes/        # pases, viajes, vehiculos
│   │   ├── db.ts
│   │   └── index.ts
│   ├── seed/vehiculos.json
│   └── .env.example
├── prompts/       ← TEXTO REAL de todos los prompts: prompt1.md, prompt2.md, … (obligatorio)
├── AI_USAGE.md    ← obligatorio
├── AGENTS.md
├── CLAUDE.md
├── ESTADO.md      ← fuente de verdad del avance
└── README.md
```

> Verificar temprano que Lovable tolera la carpeta `server/` en su repo sincronizado. Si da problemas, mover el backend a un repo aparte y enlazarlo desde el README.

---

## 6. Variables de entorno (`server/.env`, nunca commitear)

```
OP_CLIENT_WALLET_ADDRESS=https://ilp.interledger-test.dev/subase   # wallet de Súbase (cliente)
OP_KEY_ID=...                                                      # de la Test Wallet → Developer keys
OP_PRIVATE_KEY_PATH=./private.key                                  # o OP_PRIVATE_KEY_B64 en el deploy
FRONTEND_URL=https://<front>                                       # para el redirect del grant y CORS
DB_PATH=./data/subase.db
PORT=3001
```

`private.key` y `.env` van en `.gitignore`.

---

## 7. Contrato de API (fuente de verdad: ESTADO.md)

| Método | Ruta | Auth | Body / respuesta |
|---|---|---|---|
| GET | `/api/vehiculos/:id` | Bearer opcional | → `{ id, nombre, ruta, tarifa, moneda, paseActivo, disponibleHoy, topeDiario }` |
| POST | `/api/pases` | — | `{ walletAddress, topeDiario, volver }` → `{ paseId, redirectUrl }` |
| POST | `/api/pases/:paseId/confirmar` | — | `{ interactRef, hash }` → `{ paseToken, pase }` |
| GET | `/api/pases/me` | Bearer | → `{ activo, topeDiario, disponibleHoy, venceEn }` |
| POST | `/api/viajes` | Bearer | `{ vehiculoId }` → `{ viajeId, monto, cashback, vehiculo, fecha, disponibleHoy }` |
| GET | `/api/viajes/:id` | Bearer | → recibo |
| GET | `/api/vehiculos/:id/feed?desde=` | — | → `[{ viajeId, monto, estado, fecha }]` |
| GET | `/api/flota` | — | (opcional) recaudo por vehículo |

Errores con `{ error: { code, message } }`. Códigos: `SALDO_INSUFICIENTE`, `TOPE_ALCANZADO`, `PAGO_DUPLICADO`, `PASE_INVALIDO`, `PASE_VENCIDO`, `OP_ERROR`.

**Flujo del grant:** `POST /api/pases` pide el grant interactivo con `interact.finish.uri = {FRONTEND_URL}/pase/listo?paseId=...` → la wallet redirige al front con `interact_ref` y `hash` → el front llama a `/confirmar` → el backend hace `grant.continue`, guarda `access_token.value` y `access_token.manage`, y devuelve un `paseToken` propio (nunca el token de Open Payments).

---

## 8. Flujo de cobro por viaje (`POST /api/viajes`)

1. Validar `paseToken`, y la **idempotencia por `(pase, vehiculo)` en una ventana de 2 min**. Si ya hay un pago, devolver ese recibo (`PAGO_DUPLICADO`).
2. Rotar el access token del pase si expiró (`client.token.rotate`).
3. Grant no interactivo `incoming-payment` en el auth server de la wallet del vehículo → crear el **incoming payment** con `incomingAmount` = tarifa.
4. Grant no interactivo `quote` en el auth server del pasajero → crear la **quote** (`receiver` = URL del incoming payment).
5. Crear el **outgoing payment** con `quoteId`, usando el access token del pase.
6. Guardar el viaje (pase, vehículo, conductor del turno, monto, estado, ids de Open Payments) y calcular el cashback simulado.
7. Responder con el recibo. El feed del conductor lo toma en el siguiente polling.

Mapear los errores del SDK a los códigos de la sección 7. **Usar siempre `assetCode`/`assetScale` de la wallet address** (los montos son strings enteros escalados). Si la Test Wallet no ofrece COP, operar en la moneda disponible y mostrar el equivalente en COP en la UI.

---

## 9. Frontend (rutas)

- `/v/:vehiculoId`: cobro (tarifa, disponible hoy, botón "Pagar"); sin pase lleva a activar.
- `/pase/activar`: dirección de wallet + tope diario ($10k / **$20k** / $30k) → redirige a la wallet.
- `/pase/listo`: confirma el grant y vuelve a `volver` si existe.
- `/recibo/:viajeId`: comprobante con cashback.
- `/conductor/:vehiculoId`: QR grande + recaudo del turno + feed en vivo con sonido.
- `/flota`: opcional.

Español colombiano, alto contraste, botones grandes. Montos en COP formateados (`$3.200`).

---

## 10. Reglas de trabajo para agentes

1. **Open Payments primero.** Si una tarea no avanza el flujo de pago demostrable, va después.
2. **Alcance cerrado.** Núcleo: activar pase → QR → pagar → recibo → feed del conductor. Lo opcional (divisas, `/flota`, split) solo con el núcleo estable. **Nada de features nuevas después de las 10:15 del sábado.**
3. **No inventes APIs.** Si dudas, marca `// TODO verificar` y avisa.
4. **Seguridad mínima:** sin llaves en el código ni en los logs; CORS restringido a `FRONTEND_URL`; validar los inputs.
5. **Cambios pequeños y que funcionen.** Cada endpoint se prueba contra la Test Wallet antes de darlo por hecho.
6. **Actualiza ESTADO.md** cuando cambie un endpoint, una decisión o el estado de una tarea.
7. **Política de IA (obligatoria del hackathon):** mantener `AI_USAGE.md` y la carpeta `/prompts/` al día según la sección 10.1.
8. Todo el código se escribe durante el evento. No importar código previo del equipo.

### 10.1 Política de IA: `AI_USAGE.md` y `/prompts/`

**`AI_USAGE.md`** (en la raíz del repo) debe incluir:

- Qué herramientas de IA se usaron.
- Para qué se usaron.
- En qué parte del proyecto se usaron (archivos, funciones o componentes específicos).
- Los archivos específicos en los que se usó poca o ninguna IA.

Formato obligatorio:

```markdown
# AI Usage Disclosure

## Tools Used
- Claude (Claude Code)
- <otra herramienta>

## Where and How We Used AI

### 1. Backend - Payment flow (`/server/src/op/...`)
- Se usó Claude para ... (incoming payments, quotes, outgoing payments, grants).
- Revisamos y reescribimos ... a mano después de probar contra la Test Wallet.

### 2. Frontend - <componente> (`/src/...`)
- Se usó <herramienta> para ...

### 3. Documentation - <documento>
- Se usó <herramienta> para ...
- Editado a mano para ...

## What We Did Ourselves
- Archivos hechos con poca o ninguna IA: `<ruta>`, `<ruta>`.
- Pruebas y verificación de todo el código sugerido por la IA.

## Prompt Log
Ver `/prompts/` para el texto completo de cada prompt (`prompt1.md`, `prompt2.md`, …).
```

**`/prompts/`**: cada prompt que se le pase a una herramienta de IA se guarda **tal cual, palabra por palabra** (nunca un resumen), un archivo por prompt, numerados en orden: `/prompts/prompt1.md`, `/prompts/prompt2.md`, `/prompts/prompt3.md`, etc. Si el prompt incluye texto pegado, se copia también tal cual.

---

## 11. Equipo

- **David Cossio:** backend Open Payments (grants, incoming, quote, outgoing, pase).
- **Santiago Restrepo:** integración, repo, deploy, conexión front↔API, flujo de demo.
- **Samuel López:** UX/UI en Lovable.
- **Andrés Mejía:** pitch, deck, unit economics, AI_USAGE.md, video, entrega.

## 12. Recursos

- Documentación de Open Payments: https://openpayments.dev/es/ · Glosario: https://openpayments.dev/es/resources/glossary/
- SDK de Open Payments: https://openpayments.dev/es/sdk/before-you-begin/
- Test Wallet: https://wallet.interledger-test.dev · Boutique (flujo de ejemplo): https://boutique.interledger-test.dev
