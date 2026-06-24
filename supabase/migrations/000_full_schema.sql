-- ══════════════════════════════════════════════════════════════════
-- PARCHE APP — Schema completo
-- Pegar TODO esto en Supabase SQL Editor y ejecutar una sola vez
-- ══════════════════════════════════════════════════════════════════

-- ─── Extensions ───────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ══════════════════════════════════════════════════════════════════
-- TABLAS PRINCIPALES
-- ══════════════════════════════════════════════════════════════════

-- ─── PROFILES ─────────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  username      text unique,
  display_name  text not null default '',
  avatar_url    text,
  bio           text,
  languages     text[]  default '{}',
  interests     text[]  default '{}',
  mood_tags     text[]  default '{}',
  is_local      boolean default false,
  home_country  text,
  verified      boolean default false,
  pro_until     timestamptz,
  created_at    timestamptz default now()
);

-- Auto-crear perfil al registrarse
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── VENUES ───────────────────────────────────────────────────────
create table if not exists public.venues (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  category      text not null default 'cafe',
  lat           double precision not null,
  lng           double precision not null,
  address       text,
  neighborhood  text,
  discount_pct  integer default 10,
  partner_tier  text default 'basic' check (partner_tier in ('basic', 'premium')),
  active        boolean default true,
  created_at    timestamptz default now()
);

-- ─── PINS ─────────────────────────────────────────────────────────
create table if not exists public.pins (
  id             uuid primary key default uuid_generate_v4(),
  creator_id     uuid references public.profiles(id) on delete cascade not null,
  title          text not null,
  description    text,
  category       text not null check (category in ('tech','arte','naturaleza','social','food','nuevos_comienzos')),
  lat            double precision not null,
  lng            double precision not null,
  venue_id       uuid references public.venues(id),
  venue_name     text,
  max_members    integer not null default 6 check (max_members between 2 and 12),
  expires_at     timestamptz not null,
  status         text not null default 'active' check (status in ('active','full','expired','cancelled')),
  meeting_point  text,
  created_at     timestamptz default now()
);

create index if not exists pins_status_expires on public.pins(status, expires_at);
create index if not exists pins_category      on public.pins(category);
create index if not exists pins_creator       on public.pins(creator_id);
create index if not exists pins_location      on public.pins(lat, lng);

-- ─── PIN MEMBERS ──────────────────────────────────────────────────
create table if not exists public.pin_members (
  pin_id                uuid references public.pins(id) on delete cascade,
  user_id               uuid references public.profiles(id) on delete cascade,
  joined_at             timestamptz default now(),
  status                text default 'active' check (status in ('active','left')),
  confirmed_attendance  boolean default false,
  rating_venue          integer check (rating_venue between 1 and 5),
  rating_group          integer check (rating_group between 1 and 5),
  primary key (pin_id, user_id)
);

create index if not exists pin_members_user on public.pin_members(user_id);
create index if not exists pin_members_pin  on public.pin_members(pin_id);

-- Auto-marcar pin como 'full' cuando llega al máximo de miembros
create or replace function public.check_pin_capacity()
returns trigger as $$
declare
  v_max   integer;
  v_count integer;
begin
  select max_members into v_max from public.pins where id = new.pin_id;
  select count(*) into v_count
    from public.pin_members
    where pin_id = new.pin_id and status = 'active';
  if v_count >= v_max then
    update public.pins set status = 'full' where id = new.pin_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists after_member_join on public.pin_members;
create trigger after_member_join
  after insert on public.pin_members
  for each row execute procedure public.check_pin_capacity();

-- ─── MESSAGES ─────────────────────────────────────────────────────
create table if not exists public.pin_messages (
  id          uuid primary key default uuid_generate_v4(),
  pin_id      uuid references public.pins(id) on delete cascade not null,
  sender_id   uuid references public.profiles(id) on delete cascade not null,
  content     text not null,
  type        text default 'text' check (type in ('text','system','icebreaker')),
  created_at  timestamptz default now()
);

create index if not exists messages_pin on public.pin_messages(pin_id, created_at);

-- ─── ICEBREAKERS ──────────────────────────────────────────────────
create table if not exists public.icebreakers (
  pin_id        uuid references public.pins(id) on delete cascade primary key,
  content       text not null,
  generated_at  timestamptz default now(),
  model_used    text default 'gemini-1.5-flash'
);

-- ─── FRIENDSHIPS ──────────────────────────────────────────────────
create table if not exists public.friendships (
  id            uuid primary key default uuid_generate_v4(),
  requester_id  uuid references public.profiles(id) on delete cascade not null,
  addressee_id  uuid references public.profiles(id) on delete cascade not null,
  status        text not null default 'pending'
                  check (status in ('pending','accepted','blocked')),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  constraint no_self_friendship check (requester_id != addressee_id),
  constraint unique_friendship  unique (requester_id, addressee_id)
);

create index if not exists friendships_requester on public.friendships(requester_id);
create index if not exists friendships_addressee on public.friendships(addressee_id);
create index if not exists friendships_status    on public.friendships(status);

-- ─── PIN INVITES ──────────────────────────────────────────────────
create table if not exists public.pin_invites (
  id          uuid primary key default uuid_generate_v4(),
  pin_id      uuid references public.pins(id) on delete cascade not null,
  inviter_id  uuid references public.profiles(id) on delete cascade not null,
  invitee_id  uuid references public.profiles(id) on delete cascade not null,
  status      text not null default 'pending'
                check (status in ('pending','accepted','declined')),
  created_at  timestamptz default now(),
  constraint no_self_invite    check (inviter_id != invitee_id),
  constraint unique_pin_invite unique (pin_id, invitee_id)
);

create index if not exists pin_invites_invitee on public.pin_invites(invitee_id, status);
create index if not exists pin_invites_pin     on public.pin_invites(pin_id);

-- ══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════

alter table public.profiles     enable row level security;
alter table public.pins         enable row level security;
alter table public.pin_members  enable row level security;
alter table public.pin_messages enable row level security;
alter table public.icebreakers  enable row level security;
alter table public.venues       enable row level security;
alter table public.friendships  enable row level security;
alter table public.pin_invites  enable row level security;

-- PROFILES
create policy "Profiles are public"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- PINS
create policy "Active pins are public"
  on public.pins for select using (status in ('active','full'));

create policy "Authenticated users can create pins"
  on public.pins for insert with check (auth.uid() = creator_id);

create policy "Creators can update own pins"
  on public.pins for update using (auth.uid() = creator_id);

create policy "Creators can delete own pins"
  on public.pins for delete using (auth.uid() = creator_id);

-- PIN MEMBERS
create policy "Anyone can see pin members"
  on public.pin_members for select using (true);

create policy "Authenticated can join pins"
  on public.pin_members for insert with check (auth.uid() = user_id);

create policy "Members can update own membership"
  on public.pin_members for update using (auth.uid() = user_id);

-- MESSAGES (solo miembros del parche)
create policy "Members can read messages"
  on public.pin_messages for select using (
    exists (
      select 1 from public.pin_members
      where pin_id = pin_messages.pin_id
        and user_id = auth.uid()
        and status = 'active'
    )
  );

create policy "Members can send messages"
  on public.pin_messages for insert with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.pin_members
      where pin_id = pin_messages.pin_id
        and user_id = auth.uid()
        and status = 'active'
    )
  );

-- VENUES
create policy "Venues are public"
  on public.venues for select using (active = true);

-- ICEBREAKERS
create policy "Members can read icebreakers"
  on public.icebreakers for select using (
    exists (
      select 1 from public.pin_members
      where pin_id = icebreakers.pin_id
        and user_id = auth.uid()
        and status = 'active'
    )
  );

-- FRIENDSHIPS
create policy "Users can see own friendships"
  on public.friendships for select using (
    auth.uid() = requester_id or auth.uid() = addressee_id
  );

create policy "Users can send friend requests"
  on public.friendships for insert with check (auth.uid() = requester_id);

create policy "Addressee can update status"
  on public.friendships for update using (auth.uid() = addressee_id);

create policy "Either party can delete friendship"
  on public.friendships for delete using (
    auth.uid() = requester_id or auth.uid() = addressee_id
  );

-- PIN INVITES
create policy "Users can see own pin invites"
  on public.pin_invites for select using (
    auth.uid() = inviter_id or auth.uid() = invitee_id
  );

create policy "Members can send pin invites"
  on public.pin_invites for insert with check (
    auth.uid() = inviter_id and
    exists (
      select 1 from public.pin_members
      where pin_id = pin_invites.pin_id
        and user_id = auth.uid()
        and status = 'active'
    )
  );

create policy "Invitee can update invite status"
  on public.pin_invites for update using (auth.uid() = invitee_id);

-- ══════════════════════════════════════════════════════════════════
-- REALTIME
-- ══════════════════════════════════════════════════════════════════
alter publication supabase_realtime add table public.pin_messages;
alter publication supabase_realtime add table public.pins;
alter publication supabase_realtime add table public.pin_members;
alter publication supabase_realtime add table public.friendships;
alter publication supabase_realtime add table public.pin_invites;

-- ══════════════════════════════════════════════════════════════════
-- CRON — Expirar pines automáticamente cada minuto
-- ══════════════════════════════════════════════════════════════════
create extension if not exists pg_cron;

select cron.schedule(
  'expire-pins',
  '* * * * *',
  $$
    update public.pins
    set status = 'expired'
    where status in ('active','full')
      and expires_at < now();
  $$
);

-- ══════════════════════════════════════════════════════════════════
-- SEED — Venues aliados en Medellín
-- ══════════════════════════════════════════════════════════════════
insert into public.venues (name, category, lat, lng, address, neighborhood, discount_pct, partner_tier)
values
  ('Pergamino Café',  'cafe',       6.2088, -75.5676, 'Av. El Poblado #40B-18', 'El Poblado', 10, 'premium'),
  ('Café Velvet',     'cafe',       6.2476, -75.5803, 'Cra. 73 #44-55',         'Laureles',   15, 'premium'),
  ('Urbania Café',    'cafe',       6.2502, -75.5827, 'Cra. 76 #48-50',         'Laureles',   10, 'basic'),
  ('Huasi',           'restaurant', 6.2455, -75.5780, 'Cra. 70 #44B-22',        'Laureles',   12, 'basic'),
  ('Bonuar',          'restaurant', 6.2091, -75.5673, 'Calle 10 #41-27',        'El Poblado', 10, 'basic')
on conflict do nothing;
