# Encargo 2 para Grok · Súbase · botón de pago coral (sigue del encargo anterior)

Repo: /Users/saychain/Documents/AI_Projects/Openpayments. Mismas reglas: sin prettier, sin commit, comentarios cortos en español.

## Rutas tuyas (solo estas)
- `src/index.css` (agregar al final, no cambiar lo que hay)
- `src/pages/VehiculoCobroPage.tsx` (solo la barra fija de abajo)
- `src/components/IlustracionCobro.tsx` (solo cómo se calcula dónde empieza la barra)

## Qué quiere Andrés (prompt145)
La barra de pago del cobro como en su diseño: botón en píldora coral grande, texto centrado «Pagar $3.200 →» en blanco y semibold; debajo del botón, la fila «Su pase: pasajero» a la izquierda y «Cambiar» subrayado a la derecha. Fondo de la barra negro (el diseño era verde; Andrés pidió negro). Tipografía: la nuestra (Poppins, `var(--font-sans)`).

## Qué hacer
1. `index.css`, al final: clase `.subase-btn-pago` que se combina con `.subase-btn-primary`:
   `background: #EE5A52; color: #FFFFFF; min-height: 64px; border-radius: 32px; font-weight: 600; font-size: 19px; justify-content: center; gap: 10px;` · `:hover { background: #E04B43; }` · `:focus-visible { outline: 2px solid #F0E9D6; outline-offset: 3px; }`. Comentario: blanco sobre #EE5A52 da 3,4 : 1, suficiente para texto grande en negrita (WCAG AA ≥ 3 : 1); el coral es el rojo del Bus 01 del sistema.
2. `VehiculoCobroPage.tsx`, barra fija:
   - El botón «Pagar» y el enlace «Activar pase y pagar» llevan `subase-btn-primary subase-btn-pago` (ya no `subase-btn-flecha`). La flecha va en el JSX, pegada al texto: `Pagar {formatCOP(vehiculo.tarifa)} <span aria-hidden="true">→</span>` (y lo mismo en «Activar pase y pagar»). Mientras paga: spinner + «Pagando…», sin flecha.
   - La fila del pase («Su pase: pasajero» / «Cambiar») pasa a ir DEBAJO del botón, con `mt-2` y sin el `-mt-1 mb-1.5` que tenía arriba. Mismo contenido y estilos de texto.
3. `IlustracionCobro.tsx`: la barra quedó más alta, así que el número fijo `hastaBarra` (72/38) ya no sirve. Calcula la distancia real dentro del mismo efecto que mide todo: `barra = document.querySelector('.subase-fixed-bar')`, `shell = contenido.current.closest('.subase-shell-bar, .subase-shell-bar-alta')`; `hasta = shell.getBoundingClientRect().bottom − barra.offsetHeight − contenido.current.getBoundingClientRect().bottom`; úsalo como `bottom: -hasta` de la caja (estado). Si no encuentras barra o shell, usa la prop `hastaBarra` como respaldo. Observa también la barra con el `ResizeObserver`.

## Hecho cuando
- `npx tsc --noEmit` pasa.
- Resumen con los archivos cambiados.

## 4. Composición: columna izquierda angosta para que la registradora suba al lado del texto (decisión de Opus, prompt141)
Hoy, con pase, la ilustración queda en ~205 px abajo a la derecha y se ve como algo aparte: la línea «Tope diario $20.000 · se renueva a medianoche» va casi a todo el ancho y le cierra el paso. Andrés quiere que la ilustración haga parte del conjunto con el texto.

En `VehiculoCobroPage.tsx`, dentro del `PanelCrema`, envuelve el `Pasaje` y el `Alcance` (y, sin pase, el bloque de `PasoLinea` que va después del panel) en un contenedor `max-w-[215px] min-[400px]:max-w-[235px]`, de modo que en la mitad de abajo el texto quede en una columna a la izquierda y todo el lado derecho quede libre para la ilustración. La identidad (cuadro «01») y el título de la ruta siguen a todo el ancho. No cambies `Alcance` ni `Sistema.tsx`: la línea de estaciones es un SVG que ya se encoge con su contenedor.

No toques los rangos de búsqueda de `Registradora` salvo que hagan falta; con la columna angosta debería encontrar un ancho mucho mayor.

## Verificación
Abre `http://localhost:5173/v/bus-01` (el servidor de Vite ya corre en el puerto 5173; en la consola: `localStorage.setItem('subase_ui_preview_mode','true'); localStorage.setItem('subase_pase_token','preview-token')`) a 320 × 700, 375 × 812 y 430 × 932, con pase y sin pase (`localStorage.removeItem('subase_pase_token')`). En el resumen di el ancho que calculó `Registradora` en cada caso y si algo del dibujo toca texto.
