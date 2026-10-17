# Encargo 3 para Antigravity · Súbase · base limpia de la escena del inicio (Ayacucho; Ruta N después)

Repo: /Users/saychain/Documents/AI_Projects/Openpayments

## Rutas tuyas (solo estas)
- `src/assets/escenas/ayacucho-base.webp`, `src/assets/escenas/ayacucho-isla.webp`, `src/assets/escenas/ayacucho-derecha.webp` (reemplazar)
- `.tmp-inicio/` (carpeta de trabajo, ignorada por git)

No toques código ni otros archivos. No hagas commit. Python con `python3 -I`; script en `.tmp-inicio/procesar.py`.

## Contexto
La escena del inicio es una ilustración vertical de 768 × 1376 (una esquina con edificio, andenes y calles) sobre la que la app dibuja en SVG la calle, las líneas de color, una cuadrícula y vehículos animados. Para eso la imagen base tiene la calle TRANSPARENTE, y hay dos recortes de la misma base que se dibujan encima de los vehículos: la isla de abajo a la izquierda y la acera de la derecha. Las coordenadas del SVG están medidas sobre la base vieja, así que las calles nuevas deben quedar EXACTAMENTE donde estaban.

Copias de las versiones viejas (referencia, no las borres): `.tmp-inicio/viejas/ayacucho-base.webp` (calle con alfa 0), `.tmp-inicio/viejas/ayacucho-isla.webp` (recorte en x 0, y 955, 260 × 421, con máscara propia), `.tmp-inicio/viejas/ayacucho-derecha.webp` (recorte en x 628, y 1140, 140 × 236).

## Entradas nuevas (Flow, redibujadas en limpio; la calle es un azul noche plano ~RGB 30,34,48)
- Ayacucho: `.tmp-inicio/v2-arriba.png` (798 × 718) + `.tmp-inicio/v2-abajo.png` (798 × 714)
Cada par es la imagen completa partida en mitad de arriba y de abajo. Quita al final solo filas casi negras de la interfaz (más del 90 % de píxeles con brillo < 25). Redimensiona cada imagen pegada a 768 × 1376 exactos (LANCZOS).

## Qué hacer (el script recibe por argumento el nombre de salida y las dos piezas, para correrlo después con Ruta N; ahora córrelo solo con Ayacucho)
1. **Calle a transparente.** Inunda (flood fill / componentes conexas) desde puntos que seguro son calle: (384, 1300), (560, 1060), (150, 1060), (700, 1330). Un píxel es calle si su diferencia máxima por canal con RGB(30,34,48) es ≤ 22. Solo lo conectado a esas semillas se vuelve alfa 0 (las ventanas oscuras del edificio no se tocan). Después, borde suave: los píxeles a 1 px del área inundada con diferencia ≤ 45 reciben alfa proporcional (0 a 22 → 0; 45 → 255), des-premultiplicando contra el azul noche. Los cables y postes negros que cruzan la calle deben seguir opacos.
2. **Alineación con la base vieja.** Compara la máscara de calle nueva (alfa < 128) con la de `.tmp-inicio/viejas/ayacucho-base.webp`: busca el desplazamiento entero (dx, dy) en [−16, 16] que maximice el IoU. Si no es (0, 0), mueve la imagen nueva para que coincida (lo que queda vacío arriba se rellena con el crema del cielo; abajo y a los lados, transparente). Reporta (dx, dy), el IoU antes y después, y el IoU final (debe ser ≥ 0,97; si no, dilo y no inventes).
3. **Base:** guarda `<nombre>-base.webp` (WebP con alfa, quality 88, method 6). Ayacucho reemplaza `ayacucho-base.webp`.
4. **Acera derecha:** recorte de la base nueva en x 628, y 1140, 140 × 236, tal cual → `<nombre>-derecha.webp`.
5. **Isla:** recorte de la base nueva en x 0, y 955, 260 × 421; alfa final = mínimo entre el alfa del recorte nuevo y el alfa de `.tmp-inicio/viejas/ayacucho-isla.webp` (la máscara vieja dice qué parte es isla) → `<nombre>-isla.webp`.
6. **Techo:** fila más alta (y) con un píxel que no sea el crema del cielo (diferencia > 25 con el color de la esquina superior izquierda) en la base nueva. Repórtala (la vieja de Ayacucho era 395).
7. Vista de control: `.tmp-inicio/<nombre>-control.png` = base nueva compuesta sobre RGB(30,34,48), para revisión.

## Hecho cuando
Existen los tres WebP de Ayacucho y el script queda listo para correr con otro par de piezas y otro nombre. Resumen con: (dx, dy), IoU antes/después, techo y pesos en KB.
