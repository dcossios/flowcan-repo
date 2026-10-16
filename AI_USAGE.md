# AI Usage Disclosure

## Tools Used
- Claude (Claude Code)

## Where and How We Used AI

### 1. Documentation - Instrucciones para agentes (`/AGENTS.md`, `/CLAUDE.md`)
- Se usó Claude Code para corregir los enlaces de referencia de Open Payments (documentación y SDK) en ambos archivos (`prompts/prompt1.md`).
- Se usó Claude Code para agregar la política de IA: formato de `AI_USAGE.md` y registro de prompts en `/prompts/` (`prompts/prompt2.md`).
- Se usó Claude Code para crear este `AI_USAGE.md` y la carpeta `/prompts/`.

### 2. Investigación - Código fuente del SDK de Open Payments
- Se usó Claude Code con `opensrc` para descargar y revisar el código de `@interledger/open-payments` 7.4.0 (`interledger/open-payments-node`) y del repo `interledger/open-payments` (specs, docs y snippets), antes de escribir el backend (`prompts/prompt3.md`).
- Se usó Claude Code para agregar lo encontrado en esa revisión a `AGENTS.md` (secciones 7, 8 y 8.1) y a `CLAUDE.md` (regla 6) (`prompts/prompt4.md`).

## What We Did Ourselves
- Archivos hechos con poca o ninguna IA: `Guide to Open Payments_Spanish.md`.
- Revisión de todos los cambios sugeridos por la IA.

## Prompt Log
Ver `/prompts/` para el texto completo de cada prompt (`prompt1.md`, `prompt2.md`, …).
