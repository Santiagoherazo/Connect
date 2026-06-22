-- ══════════════════════════════════════════════════════════════════
-- Migration 002: Cron job para expirar pines automáticamente
-- Ejecutar en Supabase SQL Editor después de la migración 001
-- ══════════════════════════════════════════════════════════════════

-- Habilitar pg_cron (disponible en todos los proyectos Supabase)
create extension if not exists pg_cron;

-- Cron que expira pines cada minuto
select cron.schedule(
  'expire-pins',           -- nombre del job
  '* * * * *',            -- cada minuto
  $$
    update public.pins
    set status = 'expired'
    where status in ('active', 'full')
      and expires_at < now();
  $$
);

-- Verificar que quedó programado
-- select * from cron.job;
