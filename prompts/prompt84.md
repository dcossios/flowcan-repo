# Encargo para Antigravity (Gemini 4 Argon) — detallar la escena para que coincida con la imagen de Flow

Sigues en el mismo archivo de antes: /Users/saychain/Documents/AI_Projects/Openpayments/docs/prototipo-portada.html (y docs/mural-calco.js si hace falta). La versión anterior ya está revisada: la página usa solo el SVG generado con JS; se quitaron la imagen original y el plegable «Boceto», el `viewBox` de los celulares es "-40 60 290 603", la buseta está en (474, 420), el Metro es azul Línea A y el Bus 02 es verde. Consérvalo.

## Referencias
- Marco del conductor recortado de la imagen de Flow, a resolución completa (1218 × 1166): /private/tmp/claude-501/-Users-saychain--claude-spares-spare-rORXho/df1a8e6f-35b5-41da-81df-128d2bfd1470/scratchpad/flow/flow-marco-conductor.png
- Comparación actual (izquierda Flow, derecha nuestro SVG): …/scratchpad/flow/comparacion-actual.png

## PROHIBIDO (no negociable)
- Usar la imagen de Flow o cualquier raster en la página: nada de `<img>`, `data:image`, `background-image` con fotos, `<image>` en SVG ni copiar PNG/JPG a docs/. Todo se dibuja con polígonos y trazados SVG desde JS. El mural ya vectorizado (mural-calco.js) sí se usa.
- Tocar cualquier archivo fuera de docs/prototipo-portada.html y docs/mural-calco.js. Hacer commit.
- Seguir trabajando después de entregar el reporte final.

## 1. Agrega un tercer marco con la proporción de Flow
Debajo de las dos pantallas de celular, agrega un `<figure>` «Escritorio · proporción de Flow» con un `.tel` de 609 × 583 px, el mismo texto del conductor en una columna a la izquierda (ancho ~33 %) y la escena a la derecha, encuadrada como en flow-marco-conductor.png. En ese marco la escena tiene que coincidir con la referencia: mismo encuadre, mismas proporciones, mismas piezas en los mismos lugares. Usa un `viewBox` propio para ese marco (no cambies el de los celulares).

## 2. Diferencias que hay que corregir (medidas sobre la referencia)
1. **Escala.** El hotel ocupa ~55 % del ancho del marco cuadrado y llega casi a la barra negra; la esquina de la acera queda a ~85 % del alto. Hoy el hotel es mucho más chico. Agranda la escena o ajusta el encuadre del marco cuadrado hasta que coincida. En los celulares, que el hotel ocupe del ~38 % del ancho hacia la derecha, desde justo debajo de la bajada hasta el botón.
2. **Hotel.**
   - En «L» con esquina interior profunda y al menos 6 pisos.
   - Remate superior con borde oscuro #556B45.
   - Columnas/pilastras oscuras verticales en las aristas.
   - En la cara izquierda, una fila de rejillas pequeñas horizontales cerca del techo.
   - Ventanas grandes verde azulado #2F4F4F con marco claro, en filas regulares y distintas por cara (como la referencia, no una cuadrícula uniforme).
   - Bajante grueso con codo arriba, pegado a la arista interior.
   - Los dos letreros «HOTEL» más grandes, blancos con letra negra gruesa, inclinados según su cara.
3. **Mural.** Cubre ~2/3 de la altura de las caras de la esquina interior, desde el 3.er piso hasta la marquesina. El colibrí va en la cara izquierda y la mujer con las flores en la derecha, grandes. Escálalos para que llenen esas caras como en la referencia.
4. **Café / planta baja.**
   - Una gran cubierta gris oscura #2B2F3A que envuelve la esquina sobre la terraza, con borde frontal y un letrero claro pequeño.
   - Toldo verde agua #3E8C86 en la parte izquierda y toldo a rayas rojo y blanco en el extremo izquierdo.
   - Mostrador/caja de madera #8B5A2B.
   - Terraza con 10–14 mesas redondas pequeñas y sillas de madera bajo la cubierta.
   - Materas con arbustos a lo largo del frente.
5. **Palmas.**
   - Copas densas de 24–30 hojas finas y puntiagudas en estallido radial, dos o tres verdes (#2E7D3E, #3E9B4F, #6CC05A), las de arriba más claras.
   - Tronco marrón #7A5232 delgado con anillos sutiles.
   - Una palma gigante adelante a la izquierda, más alta que el 4.º piso del hotel, y 4–5 palmas alrededor de la acera, cada una con su cuadro de pasto #5FA35A.
   - Dos árboles redondos #3F8F45 adelante y un arbusto oscuro.
6. **Acera.**
   - Esquina redondeada amplia y bordillo gris visible (el canto se ve como una franja más oscura).
   - Un poste gris delgado cerca de la esquina.
7. **Peatones.** 8, de ~17 u de alto, con cabeza, torso, brazos y piernas en posición de caminar, ropa variada (rojo, azul, blanco, amarillo) y algunos con morral.
8. **Motos.** 2 con piloto: una adelante a la izquierda de la acera, en la vía, y otra junto a la cebra. Moto oscura con dos ruedas, piloto con chaqueta de color y casco rojo #E8483C.
9. **Cebra.** 5–6 franjas anchas blancas, abajo a la derecha, alineadas con el eje isométrico de la vía.
10. **Bus y tren.** El tren blanco del Metro con ventanas oscuras sobre la banda azul, entrando arriba a la izquierda de la escena. La buseta en su banda, visible, con ventanas blancas y letrero.

## Hecho cuando
- Sin errores en la consola. Sin rasters (verifícalo: `grep -nE "<img|data:image|\.png|\.jpe?g|<image" docs/prototipo-portada.html` no debe devolver nada).
- Captura del marco cuadrado y comparación lado a lado con flow-marco-conductor.png. Corriges hasta que las piezas coincidan en tamaño y posición, en máximo dos rondas.
- Capturas de los dos celulares para confirmar que la escena no tapa el título ni el botón.
- Reporte: qué quedó igual, qué no y por qué, y las rutas de las capturas. Después te detienes.
