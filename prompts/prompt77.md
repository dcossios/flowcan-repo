# Encargo para Antigravity (Gemini 4 Argon) — replicar en SVG la escena hecha en Flow

Proyecto: /Users/saychain/Documents/AI_Projects/Openpayments. Archivo: docs/prototipo-portada.html. Es un prototipo de portada estilo Mini Metro para la app Súbase (pago de bus en Medellín). La ilustración se genera con JS en SVG isométrico.

## Referencia (míralas antes de empezar)
- Imagen completa hecha en Flow: /Users/saychain/Downloads/Replace_building_with_graphic_co…_2K_20261016164029.jpg (usa `ls /Users/saychain/Downloads/Replace_building*` si el nombre con «…» da problemas).
- Versión reducida y recortes: /private/tmp/claude-501/-Users-saychain--claude-spares-spare-rORXho/df1a8e6f-35b5-41da-81df-128d2bfd1470/scratchpad/flow/flow-vista.jpg, flow-q1.jpg … flow-q4.jpg

La escena es una esquina de El Poblado / Provenza en Medellín:
- Un hotel verde oliva en «L», de 5 pisos, con letreros blancos «HOTEL» montados en el remate de la esquina, un bajante y ventanas verde azulado con marco claro.
- En su cara lateral, un mural: perfil de una mujer con pelo rosado y morado, un colibrí y flores amarillas y rosadas sobre fondo verde agua.
- En el primer piso, un café con marquesina verde agua y una terraza con mesas y sillas; en la esquina izquierda, un toldo a rayas rojo y blanco y un kiosco de madera.
- Una acera elevada gris claro con borde redondeado, jardineras de pasto y 4 o 5 palmas altas (una grande adelante a la izquierda, junto a la banda).
- Dos árboles redondos adelante.
- 7 u 8 peatones caminando.
- Dos motos con casco rojo en la vía oscura.
- Una cebra peatonal blanca abajo a la derecha.

## Tu ruta (exclusiva)
Solo docs/prototipo-portada.html. No toques src/, prompts/, AI_USAGE.md, ESTADO.md ni ningún otro archivo. No hagas commit. No instales nada.

## Qué se conserva tal cual
- El HTML y el CSS de las pantallas (barra, ficha, título, bajada, botón).
- Los campos de color (crema #F1E9DC arriba, noche #1E2230 con la frontera `X0 = 420` sobre el eje isométrico) y el río.
- Las bandas concéntricas (`SEP = 51`, `R = 90`, Metro gris #C9CCD2 de 22 y banda del bus de 34) sin sombra.
- El tren del Metro, la función `buseta()` y su posición (474, 262), con su animación.
- El `viewBox="-150 -40 375 780"`.
- Las funciones `iso`, `P`, `pol`, `frente`, `lado`, `caja`, `sombra`, `curva`, `textoFrente`, `textoLado` y `shade`.
- La escala: 10 unidades = 1 m, piso = 26 u, persona ≈ 17 u.

## Qué cambias
Reemplaza el bloque «Fila de casas pegadas…» (las tres llamadas a `casa()` y su sombra) por la escena de la referencia, dentro del codo que forman las bandas (aprox. x 515–760, y 300–520 en coordenadas de suelo). Crea las funciones que necesites, por ejemplo:
- `acera()`: losa de 3 u de alto, tope #D9D6CF, borde #B9B5AC, esquina redondeada hacia el codo.
- `hotel()`: en «L», cara frontal #93A05B, lateral #7C8A4A, techo #A7B26C, remate #556B45, ventanas #2F4F4F con marco #E8E4DA, bajante, y dos letreros «HOTEL» con `textoFrente` / `textoLado`.
- `muralLado(...)`: mapea formas 2D (u a lo largo de y, v a lo largo de z) sobre el plano de la cara lateral. Perfil estilizado de mujer (piel #E3A27A, pelo #C2589B y #8E4A9E), colibrí verde agua, flores #F2C14E y #E86A9A sobre fondo #5DA7A0. Formas planas simples: no tiene que ser idéntico al de Flow, pero sí reconocible como mural con rostro y colibrí.
- `cafe()`: marquesina #3E8C86, interior oscuro, 6–8 mesas con sillas #7A5235, toldo a rayas rojo y blanco, kiosco de madera.
- `palma(x, y, alto)`: tronco #8A5A35 con anillos y una copa de 10–14 hojas alargadas radiales en #3E8E4F y #6BBF59, sobre un cuadro de pasto #5FA35A.
- `arbol()`: copa redonda #4E9A49.
- `persona(x, y, ropa)` y `moto(x, y)`: casco rojo #E8483C.
- `cebra()`: franjas blancas alineadas al eje isométrico.

## Reglas
- Colores planos. Sin degradados ni filtros. Sombras solo como polígonos semitransparentes, como hoy.
- Orden de pintado por profundidad (x + y menor primero).
- Determinista: nada de `Math.random`.
- Menos de ~900 elementos SVG por pantalla.
- Si animas algo nuevo (por ejemplo, las motos), que respete `@media (prefers-reduced-motion: reduce)` como la clase `.mov`.
- Composición: la escena va abajo a la derecha. La zona del título y la bajada (arriba a la izquierda, hasta unos 420 px de alto) queda libre, y el botón queda abajo. Las piezas pueden cortarse contra el borde derecho, como en la referencia.

## Hecho cuando
- La página carga sin errores en la consola.
- Sacas una captura con Chrome sin interfaz y la comparas con la referencia: `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 --window-size=820,1060 --virtual-time-budget=2500 --screenshot=/tmp/portada-argon.png http://localhost:5173/docs/prototipo-portada.html`
- Una sola ronda de ajuste si algo choca. No hagas una verificación larga.
- Respondes con lo que hiciste, lo que no se pudo replicar y por qué, y la ruta de la captura.
