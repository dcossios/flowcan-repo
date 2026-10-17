-- Migración 0003 — Súbase · El vehículo no tiene conductor (Supabase → SQL Editor → Run)
-- Un bus tiene varios conductores: el conductor no es un dato del vehículo. Los turnos se abren sin nombre
-- y cada viaje queda atribuido a su turno (viajes.turno_id). Se puede correr más de una vez.
-- Orden en producción: correr este archivo completo ANTES de desplegar el código nuevo. El código viejo sigue
-- funcionando (cobrar, feed, /flota, editar nombre/ruta/tarifa); solo fallan crear un vehículo y cambiarle el conductor.
alter table public.turnos alter column conductor drop not null;
alter table public.vehiculos drop column if exists conductor;
select table_name, column_name, is_nullable from information_schema.columns
where table_schema = 'public' and column_name = 'conductor';
