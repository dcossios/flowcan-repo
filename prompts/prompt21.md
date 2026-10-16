# Encargo para Grok — Súbase, vistas del pasajero

Proyecto: /Users/saychain/Documents/AI_Projects/Openpayments (React 18 + Vite 6 + TypeScript + Tailwind 4 + lucide-react + react-router-dom 6). Hackathon Interledger Open Payments, Medellín. App web móvil para pagar el bus por QR con un pase preautorizado.

Rediseña las vistas del pasajero construyendo SOLO sobre lo que el equipo ya definió: el pitch («Súbase — Pitch Open Payments Hackathon.pdf») y la Guía de Marca. No agregues colores, fuentes ni referencias visuales nuevas. No cambies el contrato de API ni las rutas.

## Tus rutas (exclusivas)
- index.html
- src/index.css
- src/App.tsx
- src/components/AppShell.tsx
- src/components/PasoLinea.tsx (nuevo)
- src/lib/ultimoVehiculo.ts (nuevo)
- src/pages/VehiculoCobroPage.tsx
- src/pages/ActivarPasePage.tsx
- src/pages/PaseListoPage.tsx
- src/pages/ReciboPage.tsx

## Prohibido
- Tocar src/lib/api.ts, src/lib/sound.ts, src/lib/format.ts y src/pages/ConductorPage.tsx (los trabaja otro ejecutor en paralelo). Puedes importar de ellos lo que ya exportan.
- Tocar prompts/, AI_USAGE.md, ESTADO.md, README.md, AGENTS.md, CLAUDE.md.
- Instalar dependencias. Hacer commit.
- Inventar endpoints o campos del API. Si necesitas un dato que no está en los tipos de src/lib/api.ts, no lo uses.
- Romper lo que usa ConductorPage.tsx: AppShell conserva sus props actuales (`children`, `subtitle?`, `vehiculoIdActual?`) y src/index.css conserva las clases `.subase-card`, `.subase-card-sand`, `.subase-divider`, `.subase-sand-rule` y `.subase-estela-bg` (puedes cambiar cómo se ven, pero no borrarlas).

## Marca (Guia_de_Marca_SUBASE.pdf)
- Colores: negro #000000 (fondo), blanco #FFFFFF (títulos y texto principal), gris plata #C3C5C6 (texto secundario y filetes), arena #D2B99A (acento fino: subrayado de títulos y paso actual), azul marino #113462 (botón principal, texto blanco encima). Nunca azul, marino ni ámbar como color de texto sobre negro.
- Tipografía: Poppins (ya cargada en index.html con 300/400/500).
- Íconos de línea blancos, finos (lucide-react con strokeWidth 1.5), sin relleno.
- Título de cada pantalla alineado a la izquierda, con un subrayado corto en arena de 45×3px debajo.
- Estela («Estela principal», sección 2.1 de la guía): una sola forma grande que cruza detrás del título de cada pantalla, como en la portada del pitch. No manchas repartidas por toda la página. CSS de la guía:
  background: radial-gradient(ellipse 34% 27% at 21% 68%, #113659 0%, rgba(17,54,89,0) 100%), radial-gradient(ellipse 28% 22% at 55% 33%, #34567C 0%, rgba(52,86,124,0) 100%), radial-gradient(ellipse 24% 20% at 66% 26%, #12406D 0%, rgba(18,64,109,0) 100%), radial-gradient(ellipse 16% 18% at 84% 34%, #7E5432 0%, rgba(126,84,50,0) 100%), #000000;
  Ponla en un bloque absoluto detrás de la zona del título (unos 380px de alto) que se desvanece a negro hacia abajo. Conserva el grano fino que ya existe en src/index.css.
- Sin sombras. Bordes de 1px solo donde haga falta agrupar; radio de 12px como máximo.

## Cambios (en este orden de prioridad)

### A. La estructura del deck
1. Una idea por pantalla, como cada lámina del pitch. Quita las tarjetas dentro de tarjetas y la numeración «01 ·», «02 ·» en cada bloque. Separa con filetes de 1px en rgba(195,197,198,0.2) y con espacio.
2. Crea src/components/PasoLinea.tsx con el flujo de la diapositiva 5 del pitch: escudo (ShieldCheck) «Active su pase» → QR (QrCode) «Escanee y pague» → check (CircleCheck) «Pagado», unidos por una línea fina.
   - Prop `paso: 1 | 2 | 3` y prop `variante: 'vertical' | 'compacta'`.
   - Vertical (como la diapositiva 5: ícono a la izquierda, título y una línea de descripción, conector vertical de 1px) solo en /pase/activar, para explicar el servicio.
   - Compacta (horizontal, una sola fila, ícono 20px + etiqueta 14px) arriba de /v/:id, /pase/listo y /recibo.
   - Paso actual en blanco con el ícono en arena; pasos hechos en blanco; pendientes en gris plata al 60%.
3. Estela detrás del título, como se describe arriba. Quita la clase de estela de página completa.
4. Quita la flecha ↗ (ArrowUpRight) junto a SÚBASE en la cabecera.
5. Cabecera negra opaca (#000), sin backdrop-blur, con un filete inferior de 1px. A la izquierda «SÚBASE» en Poppins 300, 22px. A la derecha «Medellín» en 15px gris plata. Saca el botón «Conductor» de la cabecera y déjalo como enlace pequeño en el pie («Vista del conductor»).
6. En /pase/activar, cierra con la frase del pitch, en Poppins 300 de 24px, blanca: «Que nadie se quede abajo del bus por no tener efectivo.»

### B. Adaptación a celular
7. Poppins 300 solo en textos de 24px o más (títulos y montos). Todo texto menor de 18px va en Poppins 400 y con mínimo 15px. Las etiquetas pequeñas en mayúsculas quedan en 13px como mínimo y solo para rótulos de una o dos palabras.
8. Botón principal fijo abajo en /v/:id y /pase/activar: contenedor `fixed bottom-0 inset-x-0` con fondo negro opaco, filete superior de 1px, padding inferior `calc(12px + env(safe-area-inset-bottom))`, ancho máximo igual al del contenido. Botón de 56px de alto mínimo, fondo #113462, texto blanco en Poppins 500 de 18px. Agrega padding inferior al main para que el botón no tape contenido.
9. Áreas táctiles de 44×44px como mínimo en todo lo tocable (enlaces, chips de wallet de prueba, opciones de tope, «Cambiar pase»).
10. En src/App.tsx agrega un ScrollToTop: `useEffect(() => window.scrollTo(0, 0), [location.pathname])` dentro del Router. Hoy el recibo abre con el scroll de la página anterior y tapa «Pagado».

### C. Confianza y lenguaje. Trato de usted en toda la interfaz (como el nombre, «Súbase»)
11. Palabras del pasajero. Usa estos textos:
   - «billetera», no «wallet»; «dirección de su billetera», no «wallet address».
   - Pie de todas las pantallas: «Su plata va directo de su billetera a la del bus.» y debajo, más pequeño: «Construido sobre Interledger Open Payments».
   - Saca del cuerpo de las pantallas toda la jerga: grant, Incoming Payment, Outgoing Payment, debitAmount, interval, P1D, GNAP, Test Wallet, receiver. Junta esa explicación en un `<details>` plegable «Cómo usamos Open Payments», solo en /pase/activar y en /recibo, con este texto: «Su pase es un grant de Open Payments para pagos salientes (outgoing-payment) con tope diario (debitAmount + interval). En cada viaje creamos un incoming payment en la billetera del bus, una quote y un outgoing payment bajo su pase, sin pedirle nada más. Súbase nunca guarda su plata.»
12. /pase/activar:
   - Título: «Active su pase». Debajo: «Una sola vez autoriza un tope diario. Después paga cada viaje con un toque.»
   - Encima del campo: «Dirección de su billetera». Ayuda: «Empieza por $ o https://». Mantén las wallets de prueba como atajos para la demo.
   - Tope: «Tope diario», con las opciones $10.000, $20.000 y $30.000. Cambia la etiqueta «Recomendado» por «Sugerido», que hoy no cabe a 360px.
   - Justo encima del botón: «Lo llevamos a su billetera para que apruebe el tope, como cuando paga por PSE. Solo se hace una vez.»
   - Botón: «Aprobar en mi billetera».
13. /recibo/:viajeId se diseña para mostrárselo al conductor:
   - PasoLinea compacta en el paso 3.
   - Ícono CircleCheck grande (64px, arena) + «Pagado» en Poppins 300 de 56px.
   - Monto en Poppins 300 de 48px.
   - «Buseta 101 · Santa Cruz → Estación Acevedo» (con nombre y ruta del vehículo del recibo).
   - Un reloj en vivo con segundos (hh:mm:ss, se actualiza cada segundo con setInterval y se limpia al desmontar), en Poppins 400 de 20px, con la etiqueta «Hora actual». Sirve para distinguir la pantalla real de un pantallazo.
   - «Muéstrele esta pantalla al conductor si se la pide.»
   - Debajo, filetes con: fecha del pago, «Tiquete N.º» (viajeId), «Disponible hoy», «Cashback (simulado)».
   - El `<details>` de Open Payments y el botón secundario «Volver al bus».
14. Último vehículo:
   - Crea src/lib/ultimoVehiculo.ts con `guardarUltimoVehiculo({ id, nombre, ruta, tarifa })` y `leerUltimoVehiculo()` sobre localStorage, con try/catch.
   - Guárdalo cuando /v/:id carga un vehículo.
   - En App.tsx, cambia la ruta "/" para que muestre una pantalla simple: si hay último vehículo, título «Pagar otra vez», el vehículo y la ruta, la tarifa y un botón «Ir a pagar» que lleva a /v/:id. Si no hay, «Escanee el QR del bus para pagar.»
   - Mantén el comodín `*` redirigiendo a "/".

### D. Estados de /v/:vehiculoId
15. Título de la pantalla = nombre de la ruta del vehículo (Poppins 300, 32–36px). Debajo, en 15px gris plata, el nombre del vehículo. PasoLinea compacta: paso 1 sin pase y paso 2 con pase.
   - «Pasaje» a la izquierda y el monto a la derecha (Poppins 300, 48px).
   - Con pase: «Disponible hoy $X de $Y» con la barra arena que ya existe; «Cambiar pase» como enlace de 44px de alto.
   - Botón fijo: con pase «Pagar $3.200»; sin pase «Activar pase y pagar».
16. Si falla la carga del vehículo, el título NO puede seguir diciendo «Cargando vehículo». Usa título «No pudimos cargar el vehículo», el mensaje amable del error y un botón «Reintentar». El código del error (OP_ERROR, etc.) va pequeño (13px, gris plata) al final, no como titular.
17. Si pagarViaje falla con code 'PAGO_DUPLICADO' y `err.details` trae un recibo con viajeId (en `details.recibo` o en el propio `details`), navega a /recibo/:viajeId con ese recibo en el state. Si no lo trae, muestra el mensaje sin rojo de alarma: «Ya pagó este bus hace menos de 2 minutos. No le cobramos dos veces.»
18. Botones y banner de «Vista Previa UI»: muéstralos solo si `import.meta.env.DEV` es true (en AppShell y en las páginas de esta lista).

## Hecho cuando
- `npx tsc -b` y `npx vite build --outDir /tmp/subase-build-grok` pasan sin errores. No dejes cambios en dist/.
- A 375×812 y a 360×640, el botón principal de /v/:id y /pase/activar se ve sin hacer scroll.
- Ningún texto queda por debajo de 15px, salvo etiquetas de 13px de una o dos palabras.
- Ningún texto en Poppins 300 por debajo de 24px.
- Las rutas, los nombres de las funciones de api.ts y el contrato no cambiaron.
- Al terminar, responde con la lista de archivos tocados y una línea por cambio (A1…D18) diciendo hecho, parcial o no hecho, y por qué.
