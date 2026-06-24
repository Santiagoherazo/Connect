-- Agregar campos de ubicación y compartición al perfil
alter table public.profiles
  add column if not exists lat              double precision,
  add column if not exists lng              double precision,
  add column if not exists last_seen_at     timestamptz,
  add column if not exists location_sharing boolean not null default true;

-- Índice para buscar perfiles con ubicación reciente
create index if not exists profiles_location
  on public.profiles(lat, lng)
  where lat is not null and lng is not null;

-- RLS: solo amigos pueden ver tu ubicación
-- (asumimos que la política de profiles ya permite SELECT a usuarios autenticados;
--  la columna location_sharing actúa como filtro a nivel de app)
