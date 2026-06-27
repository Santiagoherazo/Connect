-- ══════════════════════════════════════════════════════════════════
-- Migration 003: Sistema de amigos + invitaciones a pines
-- ══════════════════════════════════════════════════════════════════

-- ─── FRIENDSHIPS ──────────────────────────────────────────────────
create table if not exists public.friendships (
  id            uuid primary key default uuid_generate_v4(),
  requester_id  uuid references public.profiles(id) on delete cascade not null,
  addressee_id  uuid references public.profiles(id) on delete cascade not null,
  status        text not null default 'pending'
                  check (status in ('pending', 'accepted', 'blocked')),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  -- Prevent duplicate friendships in both directions
  constraint no_self_friendship check (requester_id != addressee_id),
  constraint unique_friendship unique (requester_id, addressee_id)
);

create index if not exists friendships_requester on public.friendships(requester_id);
create index if not exists friendships_addressee on public.friendships(addressee_id);
create index if not exists friendships_status on public.friendships(status);

-- ─── PIN INVITES ───────────────────────────────────────────────────
create table if not exists public.pin_invites (
  id          uuid primary key default uuid_generate_v4(),
  pin_id      uuid references public.pins(id) on delete cascade not null,
  inviter_id  uuid references public.profiles(id) on delete cascade not null,
  invitee_id  uuid references public.profiles(id) on delete cascade not null,
  status      text not null default 'pending'
                check (status in ('pending', 'accepted', 'declined')),
  created_at  timestamptz default now(),
  constraint no_self_invite check (inviter_id != invitee_id),
  constraint unique_pin_invite unique (pin_id, invitee_id)
);

create index if not exists pin_invites_invitee on public.pin_invites(invitee_id, status);
create index if not exists pin_invites_pin on public.pin_invites(pin_id);

-- ─── RLS ──────────────────────────────────────────────────────────
alter table public.friendships  enable row level security;
alter table public.pin_invites  enable row level security;

-- Friendships: both parties can see, requester can create
create policy "Users can see own friendships" on public.friendships
  for select using (
    auth.uid() = requester_id or auth.uid() = addressee_id
  );

create policy "Users can send friend requests" on public.friendships
  for insert with check (auth.uid() = requester_id);

create policy "Addressee can update status" on public.friendships
  for update using (auth.uid() = addressee_id);

create policy "Either party can delete friendship" on public.friendships
  for delete using (
    auth.uid() = requester_id or auth.uid() = addressee_id
  );

-- Pin invites: inviter and invitee can see
create policy "Users can see own pin invites" on public.pin_invites
  for select using (
    auth.uid() = inviter_id or auth.uid() = invitee_id
  );

create policy "Members can send pin invites" on public.pin_invites
  for insert with check (
    auth.uid() = inviter_id and
    exists (
      select 1 from public.pin_members
      where pin_id = pin_invites.pin_id
        and user_id = auth.uid()
        and status = 'active'
    )
  );

create policy "Invitee can update invite status" on public.pin_invites
  for update using (auth.uid() = invitee_id);

-- ─── Realtime ─────────────────────────────────────────────────────
alter publication supabase_realtime add table public.friendships;
alter publication supabase_realtime add table public.pin_invites;
