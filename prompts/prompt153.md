# Encargo 2 para Antigravity · Súbase · procesar la ilustración «paradero»

Repo: /Users/saychain/Documents/AI_Projects/Openpayments

## Rutas tuyas (solo estas)
- `src/assets/escenas/paradero.webp` (nuevo)
- `.tmp-paradero/` (carpeta de trabajo, ignorada por git)

No toques ningún otro archivo. No hagas commit.

## Igual que la registradora, con dos diferencias
Repite el procedimiento de `.tmp-registradora/procesar.py` (léelo y cópialo a `.tmp-paradero/procesar.py`), con estas entradas y salidas:
- Entrada: `.tmp-paradero/tile-arriba.png` (798 × 718) y `.tmp-paradero/tile-abajo.png` (798 × 714). Es una imagen vertical completa (ilustración de Flow de 768 × 1376), partida en dos mitades: arriba y abajo. La última fila o dos de la pieza de abajo pueden ser una raya oscura de la interfaz: quítalas solo si la fila es casi toda negra (más del 90 % de los píxeles con brillo < 40). OJO: abajo hay una calle azul noche (RGB ~ 30,34,48) que es dibujo y no se quita.
- Salida: `src/assets/escenas/paradero.webp` y `.tmp-paradero/vista-sobre-crema.png`.

Diferencias:
1. La calle y la franja coral llegan hasta los bordes izquierdo, derecho y de abajo de la imagen: al recortar al rectángulo con alfa, NO dejes margen en esos tres lados (el dibujo debe tocar el borde). El margen de 8 px solo arriba.
2. Ancho final: 1000 px como máximo (la imagen original tiene 768; no la agrandes: si es menor, déjala como está).

## Hecho cuando
Existe `src/assets/escenas/paradero.webp` con alfa, < 250 KB. En el resumen: tamaño en px, peso en KB, color de fondo detectado y filas quitadas.
