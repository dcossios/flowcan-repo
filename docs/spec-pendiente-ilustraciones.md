# Spec · lo que quedó pendiente de las ilustraciones (17 oct, ~05:45)

Repo: `/Users/saychain/Documents/AI_Projects/Openpayments`. Nada de esto está en commit. Reglas: sin prettier, comentarios cortos en español, cada prompt a una IA se guarda tal cual en `/prompts/` (el siguiente libre es `prompt161.md`), push solo con permiso de Andrés y como Sidechain07.

## Estado al cortar

| Pieza | Estado |
|---|---|
| Cobro con pase: registradora detrás del texto, columna angosta, botón coral, pase debajo | Hecho, visto a 375/400/430. A 320 no cabe y no se muestra |
| Cobro sin pase: paradero con línea y buseta | Hecho por Grok (217 px a 375, 329 a 430). **Opus no lo miró** |
| «Hoy, con su pase, puede pagar N pasajes» con estaciones; sin línea de recarga; buses sin texto | Hecho |
| Ayacucho limpio (base, isla, derecha) | Antigravity **ya sobrescribió** `src/assets/escenas/ayacucho-{base,isla,derecha}.webp` (05:43), pero se cortó sin reportar: **alineación sin verificar**. Las viejas están en `.tmp-inicio/viejas/` |
| Ruta N (v1, con «ruta n» y la «N») | Capturada en `.tmp-inicio/rutan-arriba.png` + `rutan-abajo.png`. Sin procesar. Tiene un «« sobrante delante de «ruta n» |
| Inicio con dos escenas | Sin hacer |
| Docs | AI_USAGE al día hasta prompt148; faltan 149–160 |

## 1. Verificar el Ayacucho limpio — Opus (criterio visual)
1. Abrir `.tmp-inicio/ayacucho-control.png` y comparar con la vieja.
2. Correr la app (`/`, con un bus reciente en Vista Previa) a 375 × 812: la cuadrícula amarilla, las bandas y los vehículos deben caer exactos sobre la calle; la isla y la acera derecha deben tapar los vehículos como antes.
3. Si algo no calza: restaurar `cp .tmp-inicio/viejas/*.webp src/assets/escenas/` y pedirle a Antigravity el IoU y el (dx, dy) que calculó `.tmp-inicio/procesar.py`.

Hecho cuando: se ve igual que antes pero con los andenes limpios.

## 2. Procesar Ruta N — Antigravity
Ruta exclusiva: `src/assets/escenas/rutan-{base,isla,derecha}.webp`, `.tmp-inicio/`.
1. Pegar las dos piezas y llevarlas a 768 × 1376 (igual que Ayacucho).
2. Borrar el «« que quedó a la izquierda de «ruta n» en la fachada (≈ x 392–404, y 783–795 en 768 × 1376; ver `.tmp-inicio/rutan-logo-crop.png`): rellenar con el color del panel naranja de al lado.
3. Correr `python3 -I .tmp-inicio/procesar.py rutan .tmp-inicio/rutan-arriba.png .tmp-inicio/rutan-abajo.png` (calle a transparente, alineación contra la base vieja, isla con la máscara vieja, acera derecha, techo).
4. Reportar (dx, dy), IoU final (≥ 0,97) y el **techo** (y de la primera fila con edificio; Ruta N sube más que Ayacucho, la torre llega cerca de y ≈ 230).

Hecho cuando: existen los tres WebP y `.tmp-inicio/rutan-control.png`.

## 3. Dos escenas en el inicio — Grok
Rutas exclusivas: `src/components/EscenaInicio.tsx`, `src/App.tsx`.
1. En `EscenaInicio.tsx`, reemplazar las constantes fijas de imagen por una tabla de escenas:
   `ayacucho: { base, isla, derecha, techo: <techo reportado en 1, la vieja era 395> }` y `rutan: { base, isla, derecha, techo: <techo de 2> }`. `TECHO` deja de ser constante y sale de la escena.
2. `PanelEscena` recibe `escena?: 'ayacucho' | 'rutan'` (por defecto `ayacucho`) y la pasa a `Escena`.
3. En `App.tsx`, el inicio sin bus reciente («Escanee el QR del bus») usa `escena="rutan"`. «Pagar otra vez» y el conductor siguen con Ayacucho.

Hecho cuando: `npx tsc --noEmit` pasa y a 375 × 812 el texto nunca toca la torre de Ruta N (el encuadre se ajusta solo con el techo).

## 4. Revisión final — Opus
- Mirar el cobro sin pase a 375 y 430 (que se vean buseta y línea coral, que no toque texto).
- Leer el diff completo de `IlustracionCobro.tsx`, `VehiculoCobroPage.tsx`, `AppShell.tsx`, `Sistema.tsx`, `index.css`, `EscenaInicio.tsx`.
- Borrar lo temporal: `public/tmp-propuestas/`, `.tmp-registradora/`, `.tmp-paradero/`, `.tmp-inicio/` (ya están en `.git/info/exclude`, no entran al commit).
- AI_USAGE: agregar prompts 149–160 (paradero volteado con línea y buseta, Ruta N con foto del modelo 3D de Sketchfab y los dos logos, la v1 elegida por Andrés, inicio en limpio).
- `npx vite build` y, con permiso de Andrés, commit y push como Sidechain07.

## Cierre (17 oct, ~06:13, Antigravity · prompt163–164)
- **1 Ayacucho limpio:** verificado sin regenerar nada. IoU de la calle frente a la vieja 0,9865; isla 0,9993; techo 391 (igual que la vieja). En la app, cuadrícula, líneas y vehículos caen sobre la calle.
- **2 Ruta N:** procesado por Antigravity (`prompt162`, 05:46) con el «« borrado. IoU de la calle 0,986; isla 0,9992; techo 225.
- **3 Dos escenas:** `ESCENAS` en `EscenaInicio.tsx` (Ayacucho techo 395, Ruta N 229: el mismo margen de 4 px), `PanelEscena escena?: 'ayacucho' | 'rutan'`, `App.tsx` usa `rutan` solo en el inicio sin bus reciente. `npx tsc --noEmit` pasa; a 320, 375 y 430 el texto no toca la torre.
- **4 Revisión:** cobro sin pase a 375 y 430 con buseta y línea coral, sin tocar el texto. Diff completo leído (`IlustracionCobro.tsx`, `VehiculoCobroPage.tsx`, `AppShell.tsx`, `Sistema.tsx`, `index.css`, `EscenaInicio.tsx`); `handlePagar` no cambió. Temporales borrados (`public/tmp-propuestas/`, `.tmp-registradora/`, `.tmp-paradero/`, `.tmp-inicio/`). `AI_USAGE.md` al día con los prompts 149–164. `npx vite build` pasa.
- **Listo para commit y push** (con tu permiso, como `Sidechain07`).
