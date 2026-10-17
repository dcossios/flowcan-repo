# Encargo 4 para Grok · Súbase · el paradero se encaja como la registradora

Repo: /Users/saychain/Documents/AI_Projects/Openpayments. Mismas reglas (sin prettier, sin commit, comentarios cortos en español).

## Rutas tuyas
- `src/components/IlustracionCobro.tsx` (solo esta)

## Por qué (revisión de Opus)
Con el modo `ancho` el paradero sale enorme (1,10·W) y, para no tocar el texto, se esconde casi la mitad de abajo detrás de la barra: a 430 px solo se ven la palma, el árbol y la banca, y la calle con la línea coral y la buseta —lo que pidió Andrés— quedan tapadas. Lo importante del paradero está abajo; tiene que quedar a la vista, apoyado en la barra.

## Qué hacer
1. El paradero usa el mismo modo `encajar` que la registradora (el ancho más grande que no toque texto, anclado abajo a la derecha), con sus propias constantes: `SANGRA_DERECHA = 0.03` (la buseta va a la derecha y no se debe cortar mucho) y `OCULTO_ABAJO = 0.03`. La registradora sigue con las suyas (0.10 / 0.10). Pasa las constantes como props o por un objeto de configuración por ilustración; deja de usar el modo `ancho` (bórralo si queda sin uso).
2. Como la calle del paradero llega al borde izquierdo de la imagen y la imagen va a quedar más angosta que la pantalla, ese borde se vería como un corte en seco. Ponle a la `<img>` del paradero una máscara que lo desvanezca: `mask-image` (y `-webkit-mask-image`) `linear-gradient(to right, transparent 0%, #000 22%)`. Solo al paradero.
3. Rango de búsqueda del paradero: entre `0.6·W` y `1.3·W`; si ni `0.6·W` cabe, prueba hasta `0.45·W` antes de esconderla (como hiciste con la registradora).

## Verificación
`npx tsc --noEmit`. Vista Previa sin pase (borra `subase_pase_token` **y** `paseToken` del localStorage) a 375 × 812 y 430 × 932: di el ancho elegido y si se ven la buseta y la línea coral. Con pase: la registradora igual que antes.
