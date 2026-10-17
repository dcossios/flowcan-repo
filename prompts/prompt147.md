# Encargo para Grok · Súbase · la registradora detrás del texto del cobro

Repo: /Users/saychain/Documents/AI_Projects/Openpayments (React + Vite + Tailwind 4, TypeScript).

## Rutas tuyas (solo estas)
- `src/components/IlustracionCobro.tsx` (reescribir)
- `src/pages/VehiculoCobroPage.tsx`
- `src/components/Sistema.tsx` (solo el componente `PanelCrema`)
- `src/components/AppShell.tsx` (solo agregar la prop `previa`)

No toques ningún otro archivo. En paralelo, otro ejecutor está creando `src/assets/escenas/registradora.webp` (PNG/WebP con fondo transparente, el objeto ya recortado a su rectángulo, casi cuadrado): impórtalo con `import registradora from '../assets/escenas/registradora.webp';` aunque todavía no exista. No corras prettier ni formatees código que no cambias (comillas simples, 2 espacios, comentarios en español como el resto del archivo). No hagas commit.

## Contexto
La pantalla de cobro (`/v/:vehiculoId`) tiene fondo crema completo (`AppShell fondo="crema"`), un `PanelCrema` arriba con la identidad del bus, la ruta como título, el pasaje en un cuadro tinta y el bloque `Alcance` (frase «Hoy, con su pase, puede pagar N pasajes», una línea de estaciones en SVG y «Tope diario …»). Abajo hay una barra fija negra con el botón «Pagar». Entre el texto y la barra queda un espacio crema vacío.

Andrés quiere una ilustración (el interior de la entrada de una buseta con la registradora) que no se vea como una imagen aparte, sino integrada con el texto: como en la escena del inicio, la ilustración es el fondo del campo crema, crece desde la barra hacia arriba, sale cortada por el borde derecho y por la barra, y sube hasta quedar justo debajo de las líneas de texto, metiéndose en los huecos que deja el texto a la derecha (las líneas de texto son de largo distinto).

## Qué hacer

### 1. `AppShell.tsx`
Prop opcional `previa?: React.ReactNode`. En la barra azul de Vista Previa (la que se muestra con `isDev && previewMode`), si llega `previa`, se muestra en lugar del texto «Vista Previa UI». El botón «Usar API real» se queda.

### 2. `Sistema.tsx` · `PanelCrema`
Prop opcional `sinFondo?: boolean`. Con `sinFondo` el panel no pinta fondo (sin `backgroundColor`, `boxShadow` ni `clipPath`), para que se vea la ilustración de atrás. Sin la prop, todo igual que hoy.

### 3. `IlustracionCobro.tsx`
Reemplaza todo el archivo. Exporta `Registradora: React.FC<{ contenido: React.RefObject<HTMLElement | null>; hastaBarra: number }>`.

Render:
```tsx
<div ref={caja} data-ilustracion aria-hidden="true"
     className="pointer-events-none absolute -left-5 -right-5 top-0 z-0 overflow-hidden"
     style={{ bottom: -hastaBarra }}>
  {ancho > 0 && <img src={registradora} alt="" draggable={false} className="absolute block max-w-none"
       style={{ width: ancho, right: -SANGRA_DERECHA * ancho, bottom: -OCULTO_ABAJO * ancho * proporcion }} />}
</div>
```
La caja va de arriba del contenido hasta el borde de arriba de la barra fija (por eso `bottom: -hastaBarra`) y de borde a borde de la pantalla (`-left-5 -right-5`).

Constantes: `SANGRA_DERECHA = 0.10` (el 10 % del ancho de la imagen sale por la derecha), `OCULTO_ABAJO = 0.10` (el 10 % de abajo queda detrás de la barra), `HOLGURA = 16` (px mínimos entre el dibujo y cualquier texto), `MARGEN_X = 8`.

Cálculo del tamaño (en `useLayoutEffect`, y de nuevo con un `ResizeObserver` sobre `caja` y sobre `contenido.current`, en `resize` de la ventana y cuando `document.fonts.ready` resuelva):
1. Silueta: cuando la imagen carga (créala con `new Image()`), dibújala en un canvas de 120 px de ancho (alto proporcional) y lee el alfa: para cada una de las 120 columnas, `arriba[i]` = primera fila con alfa > 128, como fracción del alto (0 = arriba), o `null` si la columna está vacía. Guarda también `proporcion = naturalHeight / naturalWidth`.
2. Obstáculos: rectángulos de todo lo visible dentro de `contenido.current` que no esté dentro de `[data-ilustracion]`: las líneas de texto (TreeWalker sobre nodos de texto no vacíos y `Range.getClientRects()`), los `svg` y los elementos con fondo propio (por ejemplo el cuadro tinta del pasaje y el cuadro de color de la ruta: `getComputedStyle(el).backgroundColor` no transparente). Pásalos a coordenadas de `caja` (resta `caja.getBoundingClientRect()` left/top).
3. Para un ancho candidato `w` (alto `h = w * proporcion`), con `W` y `H` = ancho y alto de `caja`: la imagen ocupa `x0 = W + SANGRA_DERECHA*w − w`, `y0 = H + OCULTO_ABAJO*h − h`. La columna `i` de la silueta cubre `[x0 + i*w/120, x0 + (i+1)*w/120]` y su borde de arriba está en `y0 + arriba[i]*h`. El candidato es válido si para toda columna con `arriba[i] !== null` que caiga dentro de `[0, W]`, y para todo obstáculo cuyo rango horizontal (ensanchado `MARGEN_X` a cada lado) se cruce con esa columna, se cumple `y0 + arriba[i]*h >= obstaculo.bottom + HOLGURA`.
4. Busca el `w` válido más grande entre `0.8*W` y `1.7*W` (búsqueda binaria, ~20 pasos; la validez es monótona: más ancho = sube más). Si ni `0.8*W` es válido, `ancho = 0` (no se muestra la ilustración).
5. Evita bucles: solo `setAncho` si cambia más de 1 px.

Comenta arriba del archivo, en español y corto: qué es (la ilustración de Flow de la entrada de la buseta, prompt142), por qué va detrás del texto (prompt141) y cómo se encaja (la silueta contra las líneas de texto).

### 4. `VehiculoCobroPage.tsx`
- Quita todo lo temporal de `propuesta`: el `useSearchParams` (si queda sin uso, quítalo del import), la constante `propuesta`, el bloque `FranjaIlustracion` y la `<img>` de `/tmp-propuestas/`.
- Quita el bloque «Rutas piloto» del cuerpo. En su lugar pasa a `AppShell` `previa={…}` con los tres enlaces (`bus-01`, `bus-02`, `taxi-01`) en una fila: `inline-flex items-center min-h-11 px-1.5 text-[14px]`, el actual en `font-semibold text-white underline underline-offset-2` y los otros `text-white/75 hover:text-white`.
- Al contenedor del contenido (`<div className="flex-1 flex flex-col">`, el primero dentro de `AppShell`) ponle `ref={contenido}` (`useRef<HTMLDivElement>(null)`) y la clase `relative`.
- Como primer hijo de ese contenedor: `{!loading && vehiculo && <Registradora contenido={contenido} hastaBarra={paseActivo ? 72 : 38} />}`.
- `PanelCrema` con `sinFondo` y `className="relative z-10"`. Todos los bloques que siguen al panel dentro del contenedor (pasos, errores, reintentar) llevan `relative z-10` para quedar encima de la ilustración.

## Hecho cuando
- `npx tsc --noEmit` pasa (si falla solo porque todavía no existe `registradora.webp`, dilo).
- En el resumen: la lista de archivos cambiados y cómo resolviste los obstáculos (qué elementos cuentas).
