# Encargo para Antigravity · Súbase · terminal del conductor, QR imprimible y Pase listo con la personalidad del sistema (25 min; el código se congela a las 10:15)

Repo: /Users/saychain/Documents/AI_Projects/Openpayments. Sin prettier, sin commit, comentarios cortos en español, mismo estilo de código que los archivos vecinos.

## Rutas tuyas (solo estas)
- `src/pages/ConductorPage.tsx`
- `src/pages/QrVehiculoPage.tsx`
- `src/pages/PaseListoPage.tsx`

En paralelo Grok está editando `src/pages/FlotaPage.tsx`, `src/components/FlotaVehiculos.tsx` y `src/lib/rutas.ts`: no los toques. No toques `src/lib/api.ts`, `src/lib/sound.ts`, `Sistema.tsx` ni `index.css`. No cambies la lógica: polling del feed cada 2 s, sonido y voz al entrar un pago, capa «Empezar turno», aviso «Pagado» a pantalla completa, confirmación del grant en Pase listo (`/confirmar`, `volver`), impresión del QR (`window.print()` y la clase `no-print`).

## Lenguaje que hay que usar (el de todo Súbase)
```
REFERENCIA: mapa de Mini Metro + señalética de rutas de Medellín: número de ruta en un cuadro sólido del color de su línea.
TIPOGRAFÍA: Poppins. Titulo 600 a 30/34 px; montos 600 tabulares; etiquetas = ETIQUETA (12 px versalitas); horas y códigos en font-mono 14 px.
PALETA:     campo crema #F0E9D6 · tinta #1E2230 · secundario #3A3F4E · color de cada línea (`coloresDeRuta`) · #2F865F pagado
            y #B8403A fallido solo dentro de `FichaEstado`. El coral de botón es SOLO para pagar: aquí no se usa en botones.
RIESGO:     la ruta se dibuja como línea de metro con sus paradas con nombre.
```
Reutiliza (no inventes otras): `PanelCrema`, `IdentidadVehiculo`, `Titulo`, `Bajada`, `Pasaje` (con `grande`), `FichaEstado`, `ETIQUETA`, `TINTA`, `CREMA` de `src/components/Sistema.tsx`; `coloresDeRuta`, `partirNombre`, `rutaConFlechas`, `insigniaChica` de `src/lib/rutas.ts`; botones `.subase-btn-primary .subase-btn-tinta` (tinta sobre crema). Mira `Alcance` en `Sistema.tsx`: su línea (banda del color de la ruta, círculos blancos con borde tinta de 3 px) es el trazo de referencia.

**Línea de metro con paradas** (la usas en el conductor y en el QR; hazla como componente local en cada archivo, sin exportarla): separa la ruta por «–», «—» o «·» como hace `rutaConFlechas`; SVG con una banda horizontal del color de la ruta de 8 px y una estación por parada (círculo blanco r=8, borde tinta 3 px), repartidas a lo ancho; debajo de cada estación su nombre en `ETIQUETA` tinta (la primera y la última en 600). Que no se corte a 320 px: el texto de la parada puede hacer salto de línea.

## 1. Terminal del conductor (`/conductor/:id`, después de «Empezar turno»)
- `<AppShell … fondo="crema">`. Negro solo en el encabezado. Fuera las `subase-card` con borde gris y radio de 12 px.
- El héroe de recaudo que ya está arriba (recaudo del turno en `Pasaje grande`, «N pasajes · el último a las …») se queda igual.
- **El QR como placa de ruta sobre el crema**: `ETIQUETA` «Escanee para pagar»; el QR en un cuadrado blanco (mantener margen blanco de 16 px y `bgColor`/`fgColor` actuales), ancho máximo 280 px; debajo, la línea de metro con las paradas de la ruta del vehículo, y el pasaje en `Pasaje` normal (cuadro tinta). Sin borde alrededor de la placa.
- **El feed como tablero de llegadas**: un bloque tinta #1E2230 con radio 3 px — el único bloque oscuro de la pantalla. `ETIQUETA` «Llegadas del turno» en #C9CCCE. Filas: hora en `font-mono` 14 px blanca, monto `+$3.200` en 16 px 600 tabular blanco, `FichaEstado` de 22 px (pagado / pendiente «Confirmando…» / fallido «Pago fallido») y N.º en mono 14 px #C9CCCE. Separadores de 1 px blancos al 12 %. Vacío: «Aún no hay pagos en este turno.» en 16 px #C9CCCE.
- En ≥ 1024 px: placa del QR a la izquierda y tablero a la derecha. En móvil, uno debajo del otro.

## 2. QR imprimible (`/qr/:id`)
- Pantalla: campo crema (`AppShell` no se usa aquí si no se usa hoy; respeta la estructura actual) con la barra «← Volver a la empresa» e «Imprimir» (`subase-btn-tinta` compacto, `min-h-11`), ambas `no-print`.
- **La hoja** (lo que se imprime y se pega en el bus): fondo blanco, radio 3 px, sin sombra. Arriba «SÚBASE» (como el encabezado de la app, 300, tracking 0,06em). Cuadro de ruta grande (64 px, número del color de la línea, texto con contraste) + `ETIQUETA` «BUS 01» + empresa en 26 px 600. La línea de metro con las paradas. El QR grande. «Escanee para pagar» en 22 px 600 tinta y el pasaje en cuadro tinta (`Pasaje`). Al pie, «Con la cámara de su celular. Sin efectivo.» 15 px #3A3F4E y la URL en mono 13 px.
- Que al imprimir salgan los colores (`print-color-adjust: exact` en el estilo de la hoja).

## 3. Pase listo (`/pase/listo`) — solo si te alcanza el tiempo
- `<AppShell fondo="crema">` en todos los estados, como `ActivarPasePage` (que ya está en crema; míralo).
- Confirmado: `FichaEstado estado="pagado"` + «Pase activo»; los datos (le queda del tope hoy, tope diario, vigencia) en filas tinta sobre crema con línea de 1 px `rgba(30,34,48,0.16)`; «Continuar al bus» con `subase-btn-primary subase-btn-tinta subase-btn-flecha`.
- Error: `FichaEstado estado="fallido"` + título; «Intentar de nuevo» con `subase-btn-tinta`; «Volver al bus» como enlace tinta subrayado; el código de error en mono 13 px #3A3F4E.

## Reglas
- Todo texto ≥ 14 px salvo `ETIQUETA` (12 px). Todo lo tocable ≥ 44 px de alto. Contraste AA (en cuadros chicos de ruta usa `insigniaChica`).
- Nada blanco suelto sobre crema salvo el cuadrado del QR y la hoja imprimible.

## Verificación
`npx tsc --noEmit`. Navegador (Vite ya corre en http://localhost:5173; Vista Previa: `localStorage.setItem('subase_ui_preview_mode','true')`; para el conductor toca «Empezar turno») a 320 × 700, 375 × 812 y 1280 × 900: sin desborde horizontal y nada pisado. Resumen: archivos cambiados y lo que no alcanzaste.
