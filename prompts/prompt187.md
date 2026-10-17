# Encargo para Grok · Súbase · rediseño de /flota con la personalidad del sistema (tiempo: 25 min; el código se congela a las 10:15)

Repo: /Users/saychain/Documents/AI_Projects/Openpayments. Sin prettier, sin commit, comentarios cortos en español, código con el estilo de los archivos vecinos.

## Rutas tuyas (solo estas)
- `src/pages/FlotaPage.tsx`
- `src/components/FlotaVehiculos.tsx`
- `src/lib/rutas.ts` (solo lo del punto «Contraste»)

No toques `src/lib/api.ts` ni la lógica: PIN, `fetchFlota` con su polling, `fetchVehiculosEmpresa`, agregar, editar, desactivar/activar, «Ver QR» (`/qr/:id`) y «Terminal» (`/conductor/:id`) deben seguir funcionando igual.

## Por qué (revisión de Opus, prompt186)
Andrés lo ve genérico: fila de KPI, barras de progreso, tarjetas negras con filete de color y chips «ACTIVO». Eso es un dashboard SaaS cualquiera. Súbase tiene un lenguaje propio y /flota tiene que hablarlo.

```
REFERENCIA: mapa de Mini Metro + tablero de llegadas de la Terminal del Norte de Medellín. La empresa ve su flota como un mapa
            de líneas, no como un dashboard.
TIPOGRAFÍA: Poppins (la de la marca). Titulo 600 a 30/34 px; montos 600 en cifras tabulares; etiquetas = ETIQUETA (12 px,
            versalitas, tracking 0,12em); horas y códigos en font-mono 14 px.
PALETA:     campo crema #F0E9D6 (CREMA) · tinta #1E2230 (TINTA) · texto secundario #3A3F4E · color de cada línea de
            `coloresDeRuta` · verde de pagado #2F865F y rojo de fallido #B8403A solo en `FichaEstado`. Coral #EE5A52 solo como
            color de la línea del Bus 01, nunca en botones (el coral de botón es solo para pagar).
RIESGO:     cada vehículo es una línea de metro dibujada en SVG con una estación por pasaje: el dato es el dibujo.
```

Piezas que ya existen y se reutilizan (no inventes otras): `PanelCrema`, `Titulo`, `Bajada`, `Pasaje` (con `grande`), `FichaEstado`, `ETIQUETA`, `TINTA`, `CREMA` de `src/components/Sistema.tsx`; `coloresDeRuta`, `partirNombre`, `rutaConFlechas` de `src/lib/rutas.ts`; clases `.subase-btn-primary .subase-btn-tinta` (botón tinta sobre crema) de `src/index.css`. Mira `Alcance` en `Sistema.tsx`: su línea con estaciones (banda del color de la ruta de 7 px, círculos blancos con borde tinta de 3 px) es el mismo trazo que va acá.

## 1. Campo
`<AppShell ancho="amplio" rol="empresa" fondo="crema">` en todos los estados (PIN, carga, error, resumen, vehículos). Negro solo en el encabezado. Nada de tarjetas con borde ni filetes de color; las secciones se separan con una línea de 1 px `rgba(30,34,48,0.16)`.

## 2. Resumen — «Recaudo de la flota»
1. Barra superior igual (Flota 1, dirección, pestañas, Salir) pero con área de toque de 44 px (`min-h-11`) en pestañas y «Salir».
2. Héroe: `Titulo` «Recaudo de la flota», `Bajada` con la fecha y «se actualiza cada 5 segundos», y `Pasaje grande etiqueta="Recaudo de hoy"`. Debajo, una sola frase en vez de la fila de tres KPI, como el conductor: **«14 pasajes · 3 de 3 buses en ruta · comisión Súbase $672»** (pasajes y buses en semibold tinta; la comisión con «estimada, 1,5 %» en 14 px #3A3F4E). Si hay fallidos, una línea aparte con `FichaEstado estado="fallido" tamano={22}` y «1 pago fallido hoy · no se descontó al pasajero».
3. **Mapa de la flota** (el reemplazo de «Por vehículo»): `ETIQUETA` «Mapa de la flota» y, por vehículo, una fila:
   - Izquierda: cuadro de ruta (como `IdentidadVehiculo`: número en el color de su línea, 44 px) + «BUS 01» y la ruta con flechas.
   - La línea: SVG a todo el ancho disponible, banda horizontal del color de la ruta de 8 px de grueso, con **una estación por pasaje pagado** (círculo blanco r=7 con borde tinta de 3 px), separadas 26 px, empezando a la izquierda. Los fallidos van como estación con una X blanca sobre un cuadro #B8403A de 14 px. Más allá de la última estación la banda sigue en el mismo color al 25 % de opacidad hasta el borde (la ruta del día que falta). Si las estaciones no caben, la última es un círculo tinta con «+N» en blanco 11 px.
   - Derecha (o debajo en < 640 px): el recaudo del vehículo en un cuadro tinta pequeño (texto blanco 18 px 600) y «7 pasajes · último 10:42» en 14 px #3A3F4E, con el conductor.
   - Toda la fila es un `Link` a `/conductor/:id` con `min-h-11` y foco visible (outline 2 px tinta).
4. **Tablero de llegadas** (el reemplazo de «Últimos pagos»): un bloque tinta `#1E2230` con radio 3 px — el único bloque oscuro de la pantalla, como el tablero de una terminal. `ETIQUETA` «Llegadas · Open Payments» en #C9CCCE. Filas con hora en `font-mono` 14 px blanca, cuadro chico de ruta (ver «Contraste»), «Bus 01», monto `+$3.200` en 16 px 600 tabular, y `FichaEstado` de 22 px (pagado/pendiente/fallido). Separadores de 1 px blancos al 12 %.
5. En pantallas ≥ 1024 px: mapa a la izquierda (2/3) y tablero a la derecha (1/3), alineados arriba. En móvil, uno debajo del otro.

## 3. Vehículos — «Placas de ruta»
1. Encabezado: `Titulo` «Vehículos de la flota», «3 activos de 3 · todos cobran en» + dirección en mono, y botón «+ Agregar vehículo» con `subase-btn-primary subase-btn-tinta` (no blanco, no coral).
2. Cada vehículo es una **placa de ruta** sobre el crema, sin tarjeta: separadas por la línea de 1 px. Contenido:
   - Cuadro de ruta de 44 px + `ETIQUETA` «BUS 01» + nombre de la empresa en 20 px 600 (que haga salto de línea; **nunca** «Circular Coonat…»).
   - La ruta como **línea de metro con sus paradas con nombre**: separa `ruta` por «–»/«·» (como `rutaConFlechas`), banda del color de la ruta de 8 px, una estación por parada (círculo blanco con borde tinta), y debajo de cada estación su nombre en `ETIQUETA` tinta. La primera y la última parada en 600.
   - Datos en una fila: Conductor (nombre en 16 px 600), Pasaje (cuadro tinta pequeño con el monto) y Código QR (`font-mono` 14 px).
   - Estado: `FichaEstado estado="pagado" tamano={22}` + «En ruta» si está activo; si está inactivo, ficha gris y «Inactivo», la línea en gris #A79C86 punteada y la placa al 60 % de opacidad. Sin chips pill.
   - Acciones, todas `min-h-11`: «Ver QR» con `subase-btn-tinta` compacto (no a lo ancho), y «Terminal», «Editar», «Desactivar»/«Activar» como botones de borde tinta 1,5 px, radio 3 px, texto tinta 15 px 600. Nada blanco sobre crema.
3. En ≥ 1024 px, dos placas por fila; en móvil, una.
4. Formularios (agregar y editar) sobre el crema como «Activar pase»: campos blancos con borde 1,5 px `rgba(30,34,48,0.3)` y foco tinta, radio 3 px, etiquetas 15 px 600 tinta, ayudas 14 px #3A3F4E. Guardar con `subase-btn-tinta`.
5. Errores y pantalla del PIN: el mismo crema y tinta. Mensajes de error en 16 px tinta con `FichaEstado estado="fallido"`.

## Contraste (obligatorio, AA)
- En `src/lib/rutas.ts`: el «02» blanco sobre el verde #3FB27F da 2,66 : 1. Cambia `bus-02` a `texto: '#1E2230'` (5,94 : 1).
- Agrega en `rutas.ts` `insigniaChica(vehiculoId)` → `{ fondo, texto }` para cuadros de ruta con texto < 18,66 px: Bus 01 `{ '#B8403A', '#FFFFFF' }` (5,48 : 1), Bus 02 `{ '#3FB27F', '#1E2230' }`, taxi `{ '#F6C431', '#1E2230' }`. Úsalo en el tablero y en cualquier cuadro chico.
- Todo texto ≥ 14 px salvo `ETIQUETA` (12 px). Todo lo tocable ≥ 44 px de alto.

## Verificación
`npx tsc --noEmit`. En el navegador (Vite ya corre en http://localhost:5173; Vista Previa: `localStorage.setItem('subase_ui_preview_mode','true')`) a 320 × 700, 375 × 812 y 1280 × 900, las dos pestañas: sin desborde horizontal (`document.documentElement.scrollWidth === innerWidth`), ningún nombre cortado con «…», y nada que se pise. En el resumen: archivos cambiados y qué no pudiste hacer.
