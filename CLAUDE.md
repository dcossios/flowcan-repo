# CLAUDE.md — Súbase

@AGENTS.md

> La especificación completa está en **AGENTS.md** (decisiones, stack, contrato de API y flujo de pago). Léelo antes de escribir código. **ESTADO.md** es la fuente de verdad del avance.

## No negociables (resumen por si el import no carga)

1. **Open Payments de Interledger es obligatorio.** Todo pago se hace con el SDK oficial `@interledger/open-payments` contra la Test Wallet (`https://wallet.interledger-test.dev`). Sin esto el proyecto no se evalúa.
2. **No inventes APIs del SDK.** Ante la duda, verifica en la documentación (https://openpayments.dev/es/) o en la guía del SDK (https://openpayments.dev/es/sdk/before-you-begin/) y marca `// TODO verificar`.
3. **El SDK y las llaves van solo en el backend** (`api/`, Vercel Functions), incluida la service role key de Supabase. Nunca en el frontend ni en el repo.
4. **No custodiamos fondos:** pasajero → wallet de la flota (`flota1`, una sola address en COP; la Test Wallet solo permite una address COP por cuenta). Vehículo, turno y viaje van en el `metadata` del incoming payment y en nuestra base de datos.
5. **Web app (PWA), sin app nativa. Pago por QR → `/v/:vehiculoId`. NFC = roadmap.**
6. **Pase = grant `outgoing-payment` interactivo una sola vez**, con `debitAmount` + `interval` (tope diario), sin `receiver`. Cada viaje: incoming payment → quote → outgoing payment, sin interacción.
   - **Quote:** `method: 'ilp'` es obligatorio (`{ walletAddress, receiver, method: 'ilp' }`).
   - **`/confirmar` verifica el `hash`** del redirect antes de `grant.continue`. Para eso, `POST /api/pases` guarda el nonce propio y `interact.finish`.
   - **Un viaje solo queda `pagado`** cuando el outgoing payment tiene `sentAmount === debitAmount`. Si `failed`, queda `fallido`. Crear el pago no basta.
   - **`disponibleHoy`** sale de `outgoingPayment.getGrantSpentAmounts` después de confirmar el pago (no de `grantSpentDebitAmount` de `create`, que viene sin este pago).
   - **El token del pase dura 10 min en la Test Wallet** (`expires_in: 600`). El SDK no rota solo: rotar con `token.rotate` si vence en < 60 s y guardar el nuevo `value`, `manage` y vencimiento.
   - Firmas verificadas del SDK 7.4.0: sección 8.1 de AGENTS.md.
7. **Sesión del pase: token en `localStorage` + `Authorization: Bearer`** (no cookies).
8. **Alcance cerrado:** activar pase → QR → pagar → recibo → feed del conductor. Código congelado el sábado a las 10:15; deadline a las 11:00.
9. **Registra cada prompt tal cual** (palabra por palabra, nunca un resumen), un archivo por prompt y numerados en orden: `/prompts/prompt1.md`, `/prompts/prompt2.md`, etc.
10. **Mantén `AI_USAGE.md` al día** con el formato de la sección 10.1 de AGENTS.md (`# AI Usage Disclosure` → `## Tools Used` → `## Where and How We Used AI` → `## What We Did Ourselves` → `## Prompt Log`). Debe decir qué herramientas de IA se usaron, para qué, en qué archivos, funciones o componentes, y en qué archivos se usó poca o ninguna IA.

## Stack

Node 20 + TypeScript en Vercel Functions (`api/`) · `@interledger/open-payments` · Supabase Postgres (`@supabase/supabase-js`, service role solo en el servidor) · Frontend Lovable (React + Vite + Tailwind, `qrcode.react`) · Deploy: solo Vercel (front + API, mismo dominio) + Supabase, con HTTPS. Sin Railway ni Express.

## Estilo

Respuestas y comentarios en español. Cambios pequeños, probados contra la Test Wallet. Actualiza ESTADO.md cuando cambie un endpoint o una decisión.
