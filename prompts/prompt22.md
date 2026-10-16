# Encargo para Antigravity — Súbase, terminal del conductor y librerías

Proyecto: /Users/saychain/Documents/AI_Projects/Openpayments (React 18 + Vite 6 + TypeScript + Tailwind 4 + lucide-react). Hackathon Interledger Open Payments, Medellín. El pitch del equipo dice «El celular del conductor es el terminal» y su paso 05 es «Confirmación en el celular del conductor». El conductor va manejando: no puede leer un listado ni tocar la pantalla mientras trabaja.

## Tus rutas (exclusivas)
- src/lib/api.ts
- src/lib/sound.ts
- src/pages/ConductorPage.tsx

## Prohibido
- Tocar cualquier otro archivo. Otro ejecutor está cambiando en paralelo index.html, src/index.css, src/App.tsx, src/components/* y las otras páginas.
- Cambiar los nombres o las firmas de las funciones exportadas por api.ts (otras páginas las usan). Solo puedes agregar exports nuevos.
- Tocar prompts/, AI_USAGE.md, ESTADO.md, README.md, AGENTS.md, CLAUDE.md.
- Instalar dependencias. Hacer commit.
- Inventar endpoints o campos del API. El feed es GET /api/vehiculos/:id/feed?desde= y devuelve [{ viajeId, monto, estado, fecha }]. Según AGENTS.md, estado vale 'pendiente', 'pagado' o 'fallido'.

## Marca (Guia_de_Marca_SUBASE.pdf)
Fondo negro #000000; texto blanco #FFFFFF; secundario gris plata #C3C5C6; acento arena #D2B99A; azul marino #113462 para el botón principal (texto blanco). Nunca azul, marino ni ámbar como texto sobre negro. Fuente Poppins. Íconos lucide-react con strokeWidth 1.5. Poppins 300 solo en textos de 24px o más; todo lo menor de 18px va en Poppins 400 con mínimo 15px. Trato de usted. Puedes seguir usando las clases .subase-card, .subase-divider y .subase-sand-rule de index.css y el componente AppShell con sus props actuales.

## Cambios

### src/lib/api.ts
1. En apiRequest, si la respuesta no es ok, el status es 500 o mayor y no vino JSON (payload null), lanza SubaseApiError('BACKEND_OFFLINE', ERROR_MESSAGES.BACKEND_OFFLINE). Pasa cuando el proxy de Vite no encuentra el backend; hoy cae en OP_ERROR y culpa a la billetera del usuario.
2. Cambia el mensaje de BACKEND_OFFLINE a: «El servidor de Súbase no responde. Intente de nuevo en unos segundos.» (sin mencionar localhost).
3. En el modo Vista Previa, fetchVehiculoFeed devuelve estado 'pagado' en vez de 'COMPLETADO'.

### src/lib/sound.ts
4. Agrega `export function desbloquearVoz(): void`. Dentro de un gesto del usuario, dice un SpeechSynthesisUtterance vacío o de volumen 0 para habilitar la voz en iOS y Android. Con guardas si window.speechSynthesis no existe.
5. Agrega `export function anunciarPago(monto: number): void`. Cancela cualquier anuncio anterior y dice «Pagado, {monto} pesos», con el monto como entero sin puntos (ej. «Pagado, 3200 pesos»), para que la voz lo lea «tres mil doscientos». Elige una voz con lang 'es-CO'; si no hay, la primera que empiece por 'es'; si no hay ninguna, no hace nada. rate 1, volume 1. Todo en try/catch.

### src/pages/ConductorPage.tsx
6. «Empezar turno»: al abrir la página, una capa a pantalla completa (fixed inset-0, fondo negro, z-50) con:
   - Título «Terminal de» + el nombre del vehículo.
   - Texto «Toque para empezar. Cada pago va a sonar y se va a anunciar en voz alta.»
   - Botón grande (64px de alto, fondo #113462, texto blanco 20px) «Empezar turno».
   Al tocarlo se ejecutan unlockAudio(), desbloquearVoz() y se cierra la capa. Quita el botón pequeño «Activar audio».
7. Llega un pago con estado 'pagado' (nuevo en el polling, no en la carga inicial):
   - playPaymentChime() y anunciarPago(monto).
   - Una capa fija a pantalla completa (fixed inset-0, z-40, fondo #000 con borde de 2px arena) durante 3 segundos, con ícono CircleCheck de 96px en arena, «Pagado» en Poppins 300 de 64px blanco, el monto en Poppins 300 de 56px blanco y la hora en 18px gris plata.
   - Se puede cerrar tocándola. No debe mover el QR ni el resto del layout.
   - Quita la alerta que hoy se inserta en el flujo encima del QR.
8. Estado 'pendiente': fila del listado con «Confirmando…» en gris plata, sin sonido. Cuando ese mismo viajeId pase a 'pagado' en un polling posterior, entonces sí suena, se anuncia y se muestra la capa. Ojo: hoy seenIdsRef descarta un viajeId ya visto; recuerda también el estado.
9. Estado 'fallido': fila con «Pago fallido» en gris plata, sin sonido ni capa.
10. Recaudo y pasajes del turno: cuenta solo los 'pagado'. Ponlos arriba, antes del QR, en grande: «Pasajes del turno» con el número en Poppins 300 de 48px, y «Recaudo» con el monto en Poppins 300 de 48px. En dos columnas, sin tarjeta anidada.
11. QR: sigue con módulos negros sobre fondo blanco y con al menos 16px de margen blanco alrededor. Debajo: «Escanee para pagar» + tarifa, en 17px. El QR apunta a la misma URL de hoy (`${window.location.origin}/v/${vehiculoId}`).
12. Quita la etiqueta «POLLING · 2S» y cualquier jerga técnica de la vista. El listado se titula «Pagos de este turno», con filas de hora, «N.º» viajeId y monto, en 16px.
13. El botón que activa la Vista Previa solo aparece si `import.meta.env.DEV` es true.
14. Áreas táctiles de al menos 44×44px. Nada en Poppins 300 por debajo de 24px.

## Hecho cuando
- `npx tsc -b` y `npx vite build --outDir /tmp/subase-build-agy` pasan sin errores. No dejes cambios en dist/.
- Las funciones exportadas que ya existían en api.ts y sound.ts conservan nombre y firma.
- Al terminar, responde con la lista de archivos tocados y una línea por cambio (1…14) diciendo hecho, parcial o no hecho, y por qué.
