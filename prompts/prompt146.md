# Encargo para Antigravity · Súbase · procesar la ilustración «registradora»

Repo: /Users/saychain/Documents/AI_Projects/Openpayments

## Rutas tuyas (solo estas)
- `src/assets/escenas/registradora.webp` (nuevo)
- `.tmp-registradora/` (carpeta de trabajo, ya existe, ignorada por git)

No toques ningún otro archivo del repo. No hagas commit. No instales paquetes (Pillow ya está: `python3 -c "import PIL"`).

## Entrada
Dos recortes PNG de una ilustración de Google Flow (original 1376 × 768). Cubren el 60 % derecho de la imagen; se pegan uno debajo del otro, sin solapamiento:
- `.tmp-registradora/tile-arriba.png` (1538 × 714): mitad de arriba
- `.tmp-registradora/tile-abajo.png` (1538 × 718): mitad de abajo. Sus últimas filas pueden ser una franja oscura de la interfaz (no es dibujo): quítalas (filas cuyo brillo medio sea < 60).

El dibujo es el interior de la entrada de una buseta (torniquete, tablero, puerta) dentro de una mancha con base azul noche, sobre un fondo crema liso (~ RGB 240,232,214).

## Qué hacer (script Python en `.tmp-registradora/procesar.py`, córrelo con `python3 -I`)
1. Pega las dos piezas en vertical y quita la franja oscura del final.
2. Color de fondo = mediana de un parche de 40 × 40 px en la esquina superior izquierda.
3. Fondo a transparente con borde suave: para cada píxel, d = máxima diferencia absoluta por canal contra el color de fondo; alfa = clamp((d − 6) / (28 − 6), 0, 1). Donde alfa > 0, des-premultiplica el color contra el fondo: c = (pix − (1 − alfa) · fondo) / alfa, recortado a 0–255. Donde alfa < 0,02, alfa = 0. (Lo crema que se ve por el hueco de la puerta también queda transparente: está bien.)
4. Recorta al rectángulo que contiene todo lo que tiene alfa > 0, con 8 px de margen.
5. Si el ancho pasa de 1400 px, reduce a 1400 de ancho manteniendo la proporción. Redimensiona en modo premultiplicado (`im.convert('RGBa').resize(..., Image.LANCZOS).convert('RGBA')`) para que no salgan halos.
6. Guarda `src/assets/escenas/registradora.webp` (WebP con alfa, quality 88, method 6). Debe pesar menos de 300 KB; si pesa más, baja quality hasta 80.
7. Guarda también `.tmp-registradora/vista-sobre-crema.png`: el resultado compuesto sobre RGB (240,233,214), para revisión.
8. Guarda `.tmp-registradora/silueta.json`: para 100 columnas a lo ancho, la fila más alta (como fracción de la altura, 0 = arriba) donde alfa > 0,5, o null si la columna está vacía.

## Hecho cuando
- Existe `src/assets/escenas/registradora.webp` con alfa, < 300 KB.
- En el resumen dices: tamaño final en px, peso en KB, color de fondo detectado, cuántas filas oscuras quitaste, y pegas el contenido de silueta.json.
