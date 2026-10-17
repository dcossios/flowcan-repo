-- Súbase · Pegar completo en Supabase → SQL Editor → Run
-- 1) Migración 0001
-- Si la base ya existía con wallet_address unique, correr antes:
--   alter table public.vehiculos drop constraint if exists vehiculos_wallet_address_key;
-- Migración 0001 — Súbase
-- Tablas: vehiculos, turnos, pases, viajes.
-- Solo el backend (Vercel Functions, con la service role key) accede a la base.
-- El navegador NUNCA habla directo con Supabase.

-- ============================================================
-- a) vehiculos
-- ============================================================
create table public.vehiculos (
  id text primary key,                                   -- slug corto que va en el QR (ej. 'bus-01')
  nombre text not null,
  ruta text not null,
  tipo text not null check (tipo in ('bus', 'taxi')),
  wallet_address text not null,                          -- wallet que recibe (hoy flota1 para todos: la Test Wallet permite una sola address COP por cuenta). SIN unique
  tarifa bigint not null check (tarifa > 0),             -- entero escalado en la moneda de la wallet
  asset_code text not null,
  asset_scale smallint not null,
  tarifa_cop integer not null,                           -- solo para mostrar en la UI
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

-- ============================================================
-- b) turnos
-- ============================================================
create table public.turnos (
  id uuid primary key default gen_random_uuid(),
  vehiculo_id text not null references public.vehiculos (id),
  conductor text null,                                   -- opcional: el vehículo no tiene conductor; el turno se abre sin nombre
  inicio timestamptz not null default now(),
  fin timestamptz null
);

-- Un solo turno abierto por vehículo
create unique index turnos_un_abierto_por_vehiculo
  on public.turnos (vehiculo_id)
  where fin is null;

-- ============================================================
-- c) pases (grant interactivo de Open Payments del pasajero)
-- ============================================================
create table public.pases (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  auth_server text not null,                             -- URL exacta usada en grant.request (la necesita la verificación del hash)
  resource_server text not null,
  asset_code text not null,
  asset_scale smallint not null,
  tope_diario bigint not null check (tope_diario > 0),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'activo', 'vencido', 'revocado')),
  client_nonce text not null,                            -- nonce que mandamos en interact.finish.nonce
  interact_finish text,                                  -- "interact.finish" que devuelve el auth server (para el hash)
  continue_uri text,
  continue_token text,
  access_token text,
  manage_url text,
  token_expira_en timestamptz,
  pase_token_hash text unique,                           -- sha256 del paseToken; el token en claro NUNCA se guarda
  volver text,                                           -- ruta del front a la que volver tras activar
  activado_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- ============================================================
-- d) viajes
-- ============================================================
create table public.viajes (
  id uuid primary key default gen_random_uuid(),
  pase_id uuid not null references public.pases (id),
  vehiculo_id text not null references public.vehiculos (id),
  turno_id uuid null references public.turnos (id),
  monto bigint not null check (monto > 0),
  asset_code text not null,
  asset_scale smallint not null,
  cashback bigint not null default 0,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'pagado', 'fallido')),
  error_code text null,                                  -- SALDO_INSUFICIENTE | TOPE_ALCANZADO | OP_ERROR ...
  incoming_payment_id text,
  quote_id text,
  outgoing_payment_id text,
  debito_valor bigint null check (debito_valor is null or debito_valor > 0), -- lo que pagó el pasajero en su moneda (migración 0002)
  debito_moneda text null,
  debito_escala smallint null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- Idempotencia de 2 min por (pase, vehículo)
create index viajes_pase_vehiculo_creado_idx
  on public.viajes (pase_id, vehiculo_id, creado_en desc);

-- Feed del conductor
create index viajes_vehiculo_creado_idx
  on public.viajes (vehiculo_id, creado_en desc);

-- ============================================================
-- e) set_actualizado_en() + triggers
-- ============================================================
create function public.set_actualizado_en()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

create trigger pases_set_actualizado_en
  before update on public.pases
  for each row execute function public.set_actualizado_en();

create trigger viajes_set_actualizado_en
  before update on public.viajes
  for each row execute function public.set_actualizado_en();

-- ============================================================
-- f) Seguridad
-- pases guarda tokens de Open Payments: RLS activado SIN políticas
-- y sin permisos para los roles públicos de la API de Supabase.
-- No crear vistas aquí; si hace falta una, debe ser
-- WITH (security_invoker = true) para no saltarse el RLS.
-- ============================================================
alter table public.vehiculos enable row level security;
alter table public.turnos    enable row level security;
alter table public.pases     enable row level security;
alter table public.viajes    enable row level security;

revoke all on public.vehiculos from anon, authenticated;
revoke all on public.turnos    from anon, authenticated;
revoke all on public.pases     from anon, authenticated;
revoke all on public.viajes    from anon, authenticated;

-- 2) Seed
-- Seed de demo — Súbase
-- 2 buses y 1 taxi de Medellín, tarifa ~3.200 COP.

-- Todos los vehículos cobran en la wallet de la flota (AGENTS.md §2). COP con assetScale 2: 3.200 COP = 320000.
insert into public.vehiculos
  (id, nombre, ruta, tipo, wallet_address, tarifa, asset_code, asset_scale, tarifa_cop)
values
  ('bus-01',  'Bus 01 — Circular Coonatra', 'Poblado – Centro – Laureles', 'bus',
   'https://ilp.interledger-test.dev/flota1', 320000, 'COP', 2, 3200),
  ('bus-02',  'Bus 02 — Buses Unidos',      'Robledo – Centro',            'bus',
   'https://ilp.interledger-test.dev/flota1', 320000, 'COP', 2, 3200),
  ('taxi-01', 'Taxi 01 — Poblado',          'Poblado – Aeropuerto JMC',    'taxi',
   'https://ilp.interledger-test.dev/flota1', 320000, 'COP', 2, 3200);

-- Un turno abierto por vehículo
insert into public.turnos (vehiculo_id) select id from public.vehiculos;

-- 3) Verificación (debe mostrar 3 vehículos y 3 turnos abiertos)
select id, tipo, tarifa, asset_code, wallet_address from public.vehiculos;
select vehiculo_id, inicio, fin from public.turnos;
-- RLS activo en las 4 tablas (rowsecurity = true):
select tablename, rowsecurity from pg_tables where schemaname = 'public';
