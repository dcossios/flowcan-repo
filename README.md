# Súbase — Pague el bus sin efectivo, desde cualquier wallet

> **Hackathon Interledger Open Payments · Medellín · Octubre 2026**
> Recaudo digital para buses barriales y taxis de Medellín sobre **Interledger Open Payments**.

---

## Qué es Súbase

El pasajero escanea el QR del vehículo con la cámara nativa de su celular y paga su pasaje con un solo toque bajo un **pase preautorizado** (grant `outgoing-payment` de Open Payments con límite de gasto diario `debitAmount` + `interval`). El celular del conductor funciona como terminal en tiempo real, sin datáfonos ni hardware adicional, y el dinero va directo de la wallet del pasajero a la wallet del vehículo sin custodia de fondos.

---

## Estructura del repositorio

```text
/
├── src/           ← Frontend PWA mobile-first (React + Vite + TypeScript + Tailwind + qrcode.react)
├── api/           ← Backend: Vercel Functions (Node) + Supabase + @interledger/open-payments
├── prompts/       ← Registro palabra por palabra de los prompts usados (política de IA)
├── AI_USAGE.md    ← Declaración de uso de herramientas de IA
├── AGENTS.md      ← Especificación técnica y decisiones de arquitectura
├── CLAUDE.md      ← Resumen de reglas no negociables
└── ESTADO.md      ← Estado de avance y contrato de API
```

---

## Rutas del Frontend (`src/`)

- `/v/:vehiculoId`: Cobro del pasaje (muestra tarifa, cupo disponible hoy y botón de un toque **"Pagar"**; si no hay pase activo, lleva a activarlo).
- `/pase/activar`: Activación única del pase preautorizado GNAP (dirección de wallet + tope diario de `$10.000`, **`$20.000`** o `$30.000`).
- `/pase/listo`: Confirmación del grant interactivo (`interact_ref` y `hash`) y retorno automático al vehículo.
- `/recibo/:viajeId`: Comprobante digital con confirmación `"✅ Pasaje pagado"` y cashback simulado.
- `/conductor/:vehiculoId`: Terminal del conductor con código QR grande, recaudo del turno y feed en vivo (polling cada 2 s) con alerta sonora.

---

## Cómo correr el Frontend en local

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. Por defecto el servidor de desarrollo de Vite redirige `/api/*` a `http://localhost:3001` (o a la URL configurada en `VITE_API_URL`).

## Cómo correr el Backend en local

1. Copie `.env.example` a `.env.local` y llénelo (wallet de Súbase, `OP_KEY_ID`, ruta de la llave privada, Supabase). Nunca lo suba al repo.
2. En una terminal: `npm run dev:api` (API en `http://localhost:3001`, las mismas funciones de `api/` que corren en Vercel).
3. En otra: `npm run dev` (el front en `http://localhost:5173` manda `/api` al puerto 3001).

En Vercel, front y API quedan en el mismo dominio; las variables van en *Settings → Environment Variables* (la llave como `OP_PRIVATE_KEY_B64`).
