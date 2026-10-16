# CLAUDE.md — Súbase

@AGENTS.md

> La especificación completa está en **AGENTS.md** (decisiones, stack, contrato de API y flujo de pago). Léelo antes de escribir código. **ESTADO.md** es la fuente de verdad del avance.

## No negociables (resumen por si el import no carga)

1. **Open Payments de Interledger es obligatorio.** Todo pago se hace con el SDK oficial `@interledger/open-payments` contra la Test Wallet (`https://wallet.interledger-test.dev`). Sin esto el proyecto no se evalúa.
2. **No inventes APIs del SDK.** Ante la duda, verifica en la documentación (https://openpayments.dev/es/) o en la guía del SDK (https://openpayments.dev/es/sdk/before-you-begin/) y marca `// TODO verificar`.
3. **El SDK y las llaves van solo en el backend** (`server/`). Nunca en el frontend ni en el repo.
4. **No custodiamos fondos:** pasajero → wallet del vehículo (una wallet address por vehículo, dentro de la cuenta de la flota).
5. **Web app (PWA), sin app nativa. Pago por QR → `/v/:vehiculoId`. NFC = roadmap.**
6. **Pase = grant `outgoing-payment` interactivo una sola vez**, con `debitAmount` + `interval` (tope diario), sin `receiver`. Cada viaje: incoming payment → quote → outgoing payment, sin interacción.
7. **Sesión del pase: token en `localStorage` + `Authorization: Bearer`** (no cookies).
8. **Alcance cerrado:** activar pase → QR → pagar → recibo → feed del conductor. Código congelado el sábado a las 10:15; deadline a las 11:00.
9. **Registra cada prompt** con su texto real en `/prompts/AAAA-MM-DD_HHMM_<persona>_<herramienta>_<tema>.md` y mantén `AI_USAGE.md` al día.

## Stack

Node 20 + TypeScript + Express (`tsx`) · `@interledger/open-payments` · SQLite (`better-sqlite3`) · Frontend Lovable (React + Vite + Tailwind, `qrcode.react`) · Deploy: Lovable/Vercel (front) y Railway (API), con HTTPS.

## Estilo

Respuestas y comentarios en español. Cambios pequeños, probados contra la Test Wallet. Actualiza ESTADO.md cuando cambie un endpoint o una decisión.
