# Encargo para Antigravity — Súbase, panel de la empresa (/flota)

Proyecto: /Users/saychain/Documents/AI_Projects/Openpayments (React 18 + Vite 6 + TypeScript + Tailwind 4 + lucide-react + react-router-dom 6). Súbase tiene tres interfaces: pasajero (pagar), conductor (QR y pagos del turno) y empresa (esta). La transportadora es quien paga Súbase (pitch, diapositiva 9: comisión de 1,5 % por transacción + SaaS por vehículo, «panel de recaudo en tiempo real, conciliación por conductor y ruta»). Este panel es el que le muestra ese valor.

## Tus rutas (exclusivas; nadie más está editando)
- src/lib/api.ts
- src/App.tsx
- src/components/AppShell.tsx
- src/pages/FlotaPage.tsx (nuevo)
- src/index.css (solo si necesitas una clase nueva; no borres ni cambies las existentes)
- Para el cambio 9 (ids de vehículo): src/pages/*.tsx y src/components/*.tsx, solo el literal del id.

## Prohibido
- Tocar prompts/, AI_USAGE.md, ESTADO.md, README.md, AGENTS.md, CLAUDE.md, «Database Infrastructure/».
- Cambiar nombres o firmas de funciones exportadas existentes. Solo agregar.
- Instalar dependencias (nada de librerías de gráficos: las barras son divs). Hacer commit.
- Inventar endpoints. Solo existen los del contrato de ESTADO.md más el nuevo GET /api/flota de abajo.

## Marca y criterio (igual que el resto de la app)
Fondo negro #000000; texto blanco; secundario gris plata #C3C5C6; acento arena #D2B99A; azul marino #113462 solo para botones. Poppins: 300 solo en 24px o más; todo lo menor de 18px en 400 y mínimo 15px (rótulos de una o dos palabras pueden ir en 13px). Íconos lucide con strokeWidth 1.5. Título a la izquierda con el subrayado arena (clase existente .subase-sand-rule). Sin tarjetas anidadas, sin sombras: separa con filetes de 1px en rgba(195,197,198,0.2), como la lista de la diapositiva 8 del pitch. Trato de usted. Áreas táctiles de 44px como mínimo.

## Contrato nuevo: GET /api/flota?fecha=YYYY-MM-DD
fecha es opcional (por defecto, hoy en America/Bogota). Respuesta 200:

```json
{
  "fecha": "2026-10-17",
  "actualizadoEn": "2026-10-17T14:05:00Z",
  "totales": { "recaudo": 9600, "pasajes": 3, "pendientes": 0, "fallidos": 1, "vehiculosConPagos": 2, "vehiculos": 3 },
  "porRuta": [ { "ruta": "Poblado – Centro – Laureles", "recaudo": 6400, "pasajes": 2, "vehiculos": 1 } ],
  "porVehiculo": [ { "id": "bus-01", "nombre": "Bus 01 — Circular Coonatra", "ruta": "Poblado – Centro – Laureles", "tipo": "bus", "conductor": "Carlos Muñoz", "tarifa": 3200, "recaudo": 6400, "pasajes": 2, "fallidos": 0, "ultimoPagoEn": "2026-10-17T14:03:10Z" } ],
  "ultimosPagos": [ { "viajeId": "…", "vehiculoId": "bus-01", "monto": 3200, "estado": "pagado", "fecha": "2026-10-17T14:03:10Z" } ]
}
```
Todos los montos son pesos colombianos enteros. recaudo y pasajes cuentan solo estado 'pagado'. ultimosPagos trae los 20 más recientes de cualquier estado. porRuta y porVehiculo vienen ordenados por recaudo, de mayor a menor. ultimoPagoEn y conductor pueden ser null.

## Cambios

### src/lib/api.ts
1. Tipos FlotaResumen, FlotaRuta, FlotaVehiculo, FlotaPago según el contrato.
2. `export async function fetchFlota(fecha?: string): Promise<FlotaResumen>`:
   a. Modo Vista Previa: arma el resumen con PREVIEW_VEHICULOS y con viajes de demostración del día: unos 14 viajes deterministas (no aleatorios en cada polling) repartidos entre los tres vehículos, con 1 'fallido' y el resto 'pagado', con horas de hoy entre las 6:00 y la hora actual. Súmales los viajes reales de 'subase_preview_viajes' (los que paga la Vista Previa del pasajero), para que un pago hecho en la demo aparezca en el panel.
   b. Modo real: GET /api/flota (con ?fecha= si viene). Si responde 404 (la ruta aún no existe en el backend), arma el mismo resumen en el cliente con los endpoints que ya existen: fetchVehiculo(id) y fetchVehiculoFeed(id) para cada id de `VEHICULOS_FLOTA = ['bus-01', 'bus-02', 'taxi-01']`, filtrando los viajes de hoy. Cualquier otro error se propaga como hoy.
3. PREVIEW_VEHICULOS debe ser igual al seed del backend (Database Infrastructure/supabase-setup.sql), con estos ids, nombres, rutas, tipos, conductores y tarifa 3200:
   - bus-01: «Bus 01 — Circular Coonatra», «Poblado – Centro – Laureles», bus, Carlos Muñoz
   - bus-02: «Bus 02 — Buses Unidos», «Robledo – Centro», bus, Luz Marina Gil
   - taxi-01: «Taxi 01 — Poblado», «Poblado – Aeropuerto JMC», taxi, Jhon Fredy Ríos
   Si VehiculoInfo no tiene tipo ni conductor, guárdalos en un mapa aparte para la flota; no cambies VehiculoInfo.

### src/pages/FlotaPage.tsx (nuevo) y ruta /flota en src/App.tsx
4. Encabezado: título «Recaudo de la flota» (Poppins 300, 32px), subrayado arena y debajo, en 15px gris plata: «Hoy · {fecha larga en español} · se actualiza cada 5 segundos». Polling cada 5 s con setInterval y limpieza al desmontar.
5. Cuatro cifras (stat tiles, no gráficos). Grilla de 2×2 en celular y 4 columnas desde 768px. Cada una lleva un filete superior, una etiqueta de 15px en gris plata, el valor en Poppins 300 blanco (40px en celular, 48px desde 768px) y una nota de 13–15px:
   - «Recaudo de hoy», con formatCOP; nota: «{n} pasajes pagados».
   - «Pasajes», con el número; nota: «{n} confirmando», solo si hay pendientes.
   - «Vehículos con pagos», como «2 de 3»; nota: «en ruta hoy».
   - «Comisión Súbase», 1,5 % del recaudo redondeado; nota: «estimada, 1,5 % por transacción».
   Si fallidos > 0, debajo de las cifras va una línea con el ícono AlertTriangle y el texto «{n} pago(s) fallido(s) hoy», en blanco. Nunca solo con color.
6. Sección «Por ruta» (h2 en Poppins 400, 18px). Una fila por ruta:
   - Línea 1: nombre de la ruta (16px blanco) a la izquierda y recaudo (16px blanco, cifras tabulares) a la derecha.
   - Línea 2: «{pasajes} pasajes · {vehiculos} vehículo(s)», 15px gris plata.
   - Debajo, una barra de 6px de alto: pista con fondo rgba(195,197,198,0.15) a todo el ancho y relleno arena #D2B99A con ancho proporcional al recaudo de la ruta con más recaudo (esa ruta = 100 %), extremo derecho redondeado 4px y extremo izquierdo recto. Si el recaudo es 0, sin relleno.
   - La barra es aria-hidden; el valor ya está en texto. Usa una lista semántica (ol).
7. Sección «Por vehículo» con el mismo patrón de fila y barra:
   - Línea 1: ícono Bus o CarTaxiFront (según tipo, 20px) + nombre a la izquierda; recaudo a la derecha.
   - Línea 2: «{conductor} · {ruta}» en gris plata.
   - Línea 3: «Último pago hace {n} min», o «Sin pagos hoy», en gris plata; si fallidos > 0, agrega « · {n} fallido(s)».
   - Toda la fila es un enlace a /conductor/{id} con aria-label «Ver terminal de {nombre}».
8. Sección «Últimos pagos»: hasta 10 filas con hora (hh:mm), nombre corto del vehículo, monto y estado con ícono + texto: CircleCheck «Pagado», Clock «Confirmando…», XCircle «Fallido». Todo en blanco o gris plata, nunca rojo ni verde. Si no hay pagos: «Todavía no hay pagos hoy.»
9. Diseño ancho: desde 1024px, ancho máximo 1100px, las cuatro cifras en una fila y debajo dos columnas («Por ruta» y «Por vehículo» a la izquierda, «Últimos pagos» a la derecha). Agrega a AppShell una prop opcional `ancho?: 'normal' | 'amplio'` (por defecto 'normal', sin cambiar las demás páginas) y úsala en FlotaPage.
10. Errores: mismo patrón que /v/:id (título «No pudimos cargar la flota», mensaje amable, botón «Reintentar», código pequeño al final y botón de Vista Previa solo si import.meta.env.DEV).
11. En el pie de AppShell, junto a «Vista del conductor», agrega el enlace «Vista de la empresa» → /flota.

### Ids de vehículo
12. Reemplaza el id por defecto 'bus-101' por 'bus-01' en todo src/: valores por defecto de AppShell, PaseListoPage, ActivarPasePage, ConductorPage y cualquier otro literal. El QR real apunta a /v/bus-01.

## Hecho cuando
- `npx tsc -b` y `npx vite build --outDir /tmp/subase-build-flota` pasan sin errores. No dejes cambios en dist/.
- /flota en Vista Previa muestra cifras, barras y últimos pagos a 375×812 y a 1280×800, sin scroll horizontal.
- Un pago hecho en /v/bus-01 en Vista Previa aparece en /flota en el siguiente polling.
- `grep -rn "bus-101" src` no devuelve nada.
- No hagas una verificación larga con navegador: con build limpio y una captura a 375 y otra a 1280 basta.
- Al terminar, responde con los archivos tocados y una línea por cambio (1…12): hecho, parcial o no hecho, y por qué.
