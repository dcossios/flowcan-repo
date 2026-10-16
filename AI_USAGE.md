# AI Usage Disclosure

## Tools Used
- Claude (Claude Code)
- Google Antigravity (Gemini)
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

## What We Did Ourselves
- Archivos hechos con poca o ninguna IA: `Guide to Open Payments_Spanish.md`, `Súbase — Pitch Open Payments Hackathon.pdf`, `Guia_de_Marca_SUBASE.pdf`.
- Definición de arquitectura, modelo de negocio, contrato de API y revisión de todos los cambios sugeridos por la IA.

## Prompt Log
Ver `/prompts/` para el texto completo de cada prompt (`prompt1.md`, `prompt2.md`, … en orden).
