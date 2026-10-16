# AI Usage Disclosure

## Tools Used
- Claude (Claude Code, modelo Claude Opus 5.5)
- Google Antigravity (CLI `agy`): Gemini 4 Argon (Medium) hasta `prompts/prompt30.md` (el alias configurado «Gemini 3.5 Flash (High)» resolvía a ese modelo); Gemini 4 Argon (High) desde `prompts/prompt34.md`
- Grok (xAI)
- Diffusion Studio (`dapi media listen`), solo para transcribir una nota de voz del equipo (`prompts/prompt27.md`; en `prompts/prompt28.md` se pidió usar Google Speech-to-Text, que no se usó)

## Where and How We Used AI

### 1. Documentation - Instrucciones para agentes (`/AGENTS.md`, `/CLAUDE.md`)
- Se usó Claude Code para corregir los enlaces de referencia de Open Payments (documentación y SDK) en ambos archivos (`prompts/prompt1.md`).
- Se usó Claude Code para agregar la política de IA: formato de `AI_USAGE.md` y registro de prompts en `/prompts/` (`prompts/prompt2.md`).
- Se usó Claude Code para crear este `AI_USAGE.md` y la carpeta `/prompts/`.

### 2. Investigación - Código fuente del SDK de Open Payments
- Se usó Claude Code con `opensrc` para descargar y revisar el código de `@interledger/open-payments` 7.4.0 (`interledger/open-payments-node`) y del repo `interledger/open-payments` (specs, docs y snippets), antes de escribir el backend (`prompts/prompt3.md`).
- Se usó Claude Code para agregar lo encontrado en esa revisión a `AGENTS.md` (secciones 7, 8 y 8.1) y a `CLAUDE.md` (regla 6) (`prompts/prompt4.md`).

### 3. Frontend - Aplicación Web PWA (`/src/...`, `/index.html`, `/vite.config.ts`)
- Se usó Google Antigravity para estructurar el frontend React + Vite + TypeScript + Tailwind CSS (`prompts/prompt5.md`, `prompts/prompt6.md`, `prompts/prompt7.md`) y aplicar la Guía de Marca oficial (`prompts/prompt8.md`):
  - Sistema de diseño fiel a `Guia_de_Marca_SUBASE.pdf` (`/src/index.css`, `/index.html`): fondo negro `#000000`, estela radial azul-a-ámbar (`#113659`, `#34567C`, `#12406D`, `#7E5432`) con textura de grano fino, tipografía **Poppins Light (300)** y **Regular (400)**, subrayados cortos en color Arena (`#D2B99A`, `45×3 px`), texto secundario Gris plata (`#C3C5C6`), botones en Azul marino (`#113462`) y tarjetas de borde `1 px` sin sombras.
  - Cliente de API y manejo de token `Bearer` en `localStorage` (`/src/lib/api.ts`), utilidades de formato COP (`/src/lib/format.ts`) y sonido de confirmación Web Audio API (`/src/lib/sound.ts`).
  - Vistas núcleo: cobro en vehículo (`/src/pages/VehiculoCobroPage.tsx`), activación de pase GNAP (`/src/pages/ActivarPasePage.tsx`), confirmación de grant (`/src/pages/PaseListoPage.tsx`), recibo con cashback (`/src/pages/ReciboPage.tsx`) y terminal del conductor con QR y polling cada 2 s (`/src/pages/ConductorPage.tsx`).
- Se usó Claude Code para revisar el frontend frente a los criterios de evaluación del hackathon y la Guía de Marca, y para hacer el commit del frontend, sin editar código (`prompts/prompt9.md`, `prompts/prompt10.md`, `prompts/prompt11.md`, `prompts/prompt12.md`).

### 4. Frontend - Auditoría y rediseño de UX (`/src/...`)
- Se usó Claude Code para auditar el diseño en celular (360×640 y 375×812): legibilidad, botón principal fuera de pantalla, recibo que abría desplazado, jerga técnica, confianza y uso para el conductor; y para fijar el criterio de rediseño sobre el pitch y la Guía de Marca (`prompts/prompt13.md` a `prompts/prompt20.md`, `prompts/prompt23.md`). Dos direcciones visuales prototipadas con IA se descartaron y no están en el repo.
- Se usó Grok para aplicar el rediseño de las vistas del pasajero, con el encargo completo en `prompts/prompt21.md`: estructura del deck (una idea por pantalla, estela detrás del título, flujo de tres pasos de la diapositiva 5 en `/src/components/PasoLinea.tsx`), botón principal fijo, `ScrollToTop` y pantalla «Pagar otra vez» (`/src/App.tsx`, `/src/lib/ultimoVehiculo.ts`), recibo para mostrar al conductor con reloj en vivo (`/src/pages/ReciboPage.tsx`), textos con trato de usted y estados de error (`/src/pages/VehiculoCobroPage.tsx`, `/src/pages/ActivarPasePage.tsx`, `/src/pages/PaseListoPage.tsx`, `/src/components/AppShell.tsx`, `/src/index.css`, `/index.html`).
- Se usó Google Antigravity para la terminal del conductor, con el encargo completo en `prompts/prompt22.md`: capa «Empezar turno», confirmación a pantalla completa con voz (`speechSynthesis`) solo para pagos en estado `pagado` (`/src/pages/ConductorPage.tsx`, `/src/lib/sound.ts`), y el mapeo de errores 5xx a `BACKEND_OFFLINE` (`/src/lib/api.ts`).
- Claude Code revisó el diff de ambos, probó el flujo completo en Vista Previa y corrigió a mano los mensajes de error al trato de usted (`/src/lib/api.ts`), el respaldo de voz cuando el navegador aún no carga las voces (`/src/lib/sound.ts`), el signo del cashback, un texto repetido y el marcador del plegable, y para hacer el commit (`prompts/prompt24.md`, `prompts/prompt25.md`, `prompts/prompt26.md`, `prompts/prompt27.md`).

### 5. Frontend - Panel de la empresa (`/src/pages/FlotaPage.tsx`)
- Idea del equipo (nota de voz de Santiago): tres interfaces, pasajero, conductor y empresa.
- Se usó Claude Code para definir el contenido del panel y proponer el contrato `GET /api/flota` alineado con el esquema de Supabase del equipo (`ESTADO.md` §2.1), con criterio de visualización (cifras protagonistas y barras de una sola serie validadas contra el fondo) (`prompts/prompt29.md`).
- Se usó Google Antigravity (Gemini 4 Argon, Medium) para implementarlo, con el encargo completo en `prompts/prompt30.md`: `fetchFlota` con respaldo en el cliente si la ruta no existe (`/src/lib/api.ts`), la página `/flota` (`/src/pages/FlotaPage.tsx`, `/src/App.tsx`), el ancho amplio en `/src/components/AppShell.tsx` y la alineación de los ids de vehículo con el seed (`bus-01`, `bus-02`, `taxi-01`).
- Claude Code revisó el diff, lo probó a 375 y 1280 px y ajustó a mano el tamaño mínimo de dos notas y el formato de «último pago hace N h» (`prompts/prompt31.md` a `prompts/prompt36.md`, que también cubren la configuración local de la llave privada y del modelo de Antigravity).

### 6. Backend / Infraestructura - Cambio de stack y spike de pago
- Se usó Claude Code para planear la implementación (Supabase + Vercel, sin Railway) y decidir PWA en vez de Expo (`prompts/prompt37.md` a `prompts/prompt41.md`).
- Se usó Claude Code para actualizar el stack, la estructura y las variables de entorno en `AGENTS.md` y `CLAUDE.md` (`prompts/prompt42.md`).
- Se usó Claude Code para escribir `scripts/spike-pago.ts` (prueba del flujo completo contra la Test Wallet), `scripts/package.json`, `scripts/tsconfig.json` y `.env.example` (`prompts/prompt42.md`).
- Se usó Claude Code para evaluar una recomendación sobre la jerarquía empresa → conductor y aplicar dos cambios: `metadata` en incoming/outgoing payments (`AGENTS.md` §8 y §8.1, `scripts/spike-pago.ts`) y el plan B de una sola wallet address de la flota (`AGENTS.md` §2) (`prompts/prompt43.md`, `prompts/prompt44.md`).
- Se usó Claude Code para verificar la wallet `flota1` (datos públicos y `jwks.json`), confirmar que la llave privada corresponde a la llave registrada y crear `.env.local`, que no se sube al repo (`prompts/prompt45.md`).
- Se usó Claude Code para cambiar la spec a una sola wallet address de la flota para todos los vehículos (`AGENTS.md` §0, §2, §3, §8, §8.1; `CLAUDE.md` regla 4) (`prompts/prompt46.md`).
- Se usó Claude Code para verificar la wallet `test_platzi1`, configurarla como pasajero, ejecutar `scripts/spike-pago.ts` contra la Test Wallet (la aprobación del pase la hizo una persona) y pasar los resultados a `AGENTS.md` §8/§8.1, `CLAUDE.md` y `ESTADO.md` (`prompts/prompt47.md`).
- Se usó Claude Code para integrar los cambios de GitHub (renumerar estos prompts de `prompt5`–`prompt16` a `prompt37`–`prompt48` para no chocar con los del equipo) y escribir la librería del backend `api/_lib/` (`op.ts`, `db.ts`, `auth.ts`, `errores.ts`) y `scripts/prueba-rotacion.ts`, con el mapeo de errores verificado en el código de Rafiki (`prompts/prompt48.md`).
- Se usó Claude Code para escribir los endpoints de `api/` (`vehiculos/[id]/index.ts`, `vehiculos/[id]/feed.ts`, `pases/index.ts`, `pases/[paseId]/confirmar.ts`, `pases/me.ts`, `viajes/index.ts`, `viajes/[id].ts`), `api/_lib/http.ts`, `api/_lib/viajes.ts`, `vercel.json` y el servidor local `scripts/dev-api.ts` (`prompts/prompt49.md`).
- Se usó Claude Code para hacer commit y push a `main` (`prompts/prompt50.md`).
- Se usó Claude Code para verificar con `scripts/prueba-rotacion.ts` que un token vencido se puede rotar y mapear `403 Inactive Token` a `PASE_VENCIDO` (`api/_lib/errores.ts`).
- Se usó Claude Code para revisar el frontend y planear el enlace front ↔ back y las tres vistas (pasajero, conductor, empresa) (`prompts/prompt51.md`), y para escribir el backend de ese plan: `GET /api/viajes`, `api/flota.ts`, `api/empresa/vehiculos/index.ts`, `api/empresa/vehiculos/[id].ts`, `api/_lib/empresa.ts` y `api/_lib/gestion.ts` (`prompts/prompt52.md`).
- Se usó Claude Code para hacer commit y push de ese backend y conectar el frontend responsive con el backend (`prompts/prompt53.md`): `src/lib/api.ts` (PIN de empresa, mis viajes, gestión de vehículos, `estado` del recibo), `src/pages/MiPasePage.tsx`, `src/pages/QrVehiculoPage.tsx`, `src/components/FlotaVehiculos.tsx`, y cambios en `FlotaPage.tsx` (PIN y pestañas), `ReciboPage.tsx`, `ConductorPage.tsx`, `AppShell.tsx`, `App.tsx` e `index.css`. Se verificó con `agent-browser` que no hay desborde horizontal a 320, 375, 768 y 1280 px y se probó en vista previa crear, editar y desactivar un vehículo.
- Se usó Claude Code para revisar la base de Supabase, apuntar los vehículos a `flota1` (COP), corregir `Database Infrastructure/supabase-setup.sql` (sin `unique` en `wallet_address`) y verificar en la base el pago de punta a punta que hizo una persona en el navegador (`prompts/prompt54.md`, `prompts/prompt55.md`).
- Se usó Claude Code para hacer commit y push a `main` (`prompts/prompt56.md`).
- Se usó Claude Code para revisar el deploy en Vercel (variables y logs de la función), encontrar que `OP_PRIVATE_KEY_B64` no estaba en base64 y hacer que `api/_lib/op.ts` acepte la llave en base64 o PEM, y que `api/_lib/http.ts` acepte `APP_URL` sin `https://` (`prompts/prompt57.md`).
- Se usó Claude Code para reemplazar en Vercel (Production) `OP_PRIVATE_KEY_B64`, `OP_KEY_ID` y `OP_CLIENT_WALLET_ADDRESS` desde la llave local sin mostrarla, redesplegar y verificar en la base y en los logs de producción el pago real hecho desde un celular (`prompts/prompt58.md`, `prompts/prompt59.md`).
- Se usó Claude Code para diagnosticar el scroll «pegado» en el celular y corregirlo: `overflow-x-hidden` → `overflow-x-clip` y `min-h-dvh` → `min-h-svh` en `src/components/AppShell.tsx` (el contenedor tenía scroll propio y rompía el header sticky), grano de fondo en su propia capa de GPU (`src/index.css`), bloqueo del scroll de fondo bajo las capas a pantalla completa del conductor (`src/pages/ConductorPage.tsx`) y pie de página sin el texto del pasajero en las vistas de conductor y empresa. Se verificó con `agent-browser` emulando un iPhone 14 en todas las páginas (`prompts/prompt60.md`).

## What We Did Ourselves
- Archivos hechos con poca o ninguna IA: `Guide to Open Payments_Spanish.md`, `Súbase — Pitch Open Payments Hackathon.pdf`, `Guia_de_Marca_SUBASE.pdf`.
- Definición de arquitectura, modelo de negocio, contrato de API y revisión de todos los cambios sugeridos por la IA.

## Prompt Log
Ver `/prompts/` para el texto completo de cada prompt (`prompt1.md`, `prompt2.md`, … en orden).
