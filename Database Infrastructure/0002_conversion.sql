-- Migración 0002 — Súbase · Pago en cualquier moneda (Supabase → SQL Editor → Run)
-- El bus siempre recibe pesos (viajes.monto, en COP). Estas columnas guardan lo que se le debitó al
-- pasajero en SU moneda (debitAmount de la quote de Open Payments), p. ej. 144 CAD con escala 2 = CA$1,44.
-- Son NULL en viajes anteriores (entonces el pasajero pagó en la misma moneda del bus).

alter table public.viajes
  add column if not exists debito_valor bigint null check (debito_valor is null or debito_valor > 0),
  add column if not exists debito_moneda text null,
  add column if not exists debito_escala smallint null;

-- Verificación: deben aparecer las 3 columnas
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'viajes' and column_name like 'debito_%';
