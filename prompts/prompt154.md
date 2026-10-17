# Encargo 3 para Grok · Súbase · el paradero en el cobro sin pase

Repo: /Users/saychain/Documents/AI_Projects/Openpayments. Mismas reglas de siempre (sin prettier, sin commit, comentarios cortos en español).

## Rutas tuyas (solo estas)
- `src/components/IlustracionCobro.tsx`
- `src/pages/VehiculoCobroPage.tsx`

En paralelo otro ejecutor crea `src/assets/escenas/paradero.webp` (fondo transparente, recortada al dibujo). Impórtala aunque todavía no exista.

## Qué quiere Andrés (prompt149)
En el cobro SIN pase («Activar pase y pagar») va otra ilustración: un paradero con la línea coral y una buseta llegando (de Flow). En el cobro CON pase sigue la registradora. Igual que la registradora: integrada con el texto, nunca debajo de él.

## Diferencia importante del paradero
La calle azul noche y la franja coral llegan hasta los bordes izquierdo, derecho y de abajo de la imagen. Si la imagen queda más angosta que la pantalla, la calle se vería cortada en seco a mitad de pantalla. Por eso el paradero no se encoge: va siempre a lo ancho y lo que se ajusta es cuánto baja.

## Qué hacer
1. `IlustracionCobro.tsx`: generaliza `Registradora` en un componente `IlustracionCobro` con props `{ src: string; modo: 'encajar' | 'ancho'; contenido; hastaBarra }` y deja `Registradora` y `Paradero` como envoltorios cortos (o exporta solo `IlustracionCobro` y usa `src`/`modo` desde la página, como prefieras).
   - `modo 'encajar'`: lo de hoy, sin cambios (registradora).
   - `modo 'ancho'` (paradero): ancho fijo `w = 1.10 * W`, centrada (sale un 5 % por cada lado). Lo que se busca es el desplazamiento vertical: `oculto` = cuánto del alto `h` queda detrás de la barra, entre `0.05*h` y `0.55*h`. Toma el `oculto` más chico con el que la silueta no toque ningún obstáculo (misma regla de `HOLGURA` y `MARGEN_X`). Si ni con `0.55*h` cabe, no la muestres. La silueta, los obstáculos y el cálculo de la barra (`hasta`) son los mismos de hoy.
2. `VehiculoCobroPage.tsx`: con pase → registradora (`modo 'encajar'`); sin pase → paradero (`modo 'ancho'`).

## Verificación
`npx tsc --noEmit`. En el navegador (Vista Previa, `http://localhost:5173/v/bus-01`) a 375 × 812 y 430 × 932, sin pase (`localStorage.removeItem('subase_pase_token')`): di el `oculto` que eligió y si toca texto. Con pase, confirma que la registradora sigue igual.
