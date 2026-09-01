-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Nicola Mustone

create table public.encounters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text,
  state jsonb not null,
  status text not null default 'running',
  updated_at timestamptz not null default now(),
  player_code text,
  kind text not null default 'live',
  campaign_id text
);

create unique index encounters_one_live_per_owner
  on public.encounters (owner_id) where kind = 'live';
create index encounters_owner_idx on public.encounters (owner_id);
create index encounters_owner_kind
  on public.encounters (owner_id, kind, updated_at desc);
create unique index encounters_player_code_key
  on public.encounters (player_code) where player_code is not null;

create table public.creatures (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index creatures_owner_idx on public.creatures (owner_id);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index players_owner_idx on public.players (owner_id);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index campaigns_owner_idx on public.campaigns (owner_id);

create table public.spells (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text,
  data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index spells_owner_idx on public.spells (owner_id);

create table public.effects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text,
  data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index effects_owner_idx on public.effects (owner_id);

alter table public.encounters enable row level security;
alter table public.creatures enable row level security;
alter table public.players enable row level security;
alter table public.campaigns enable row level security;
alter table public.spells enable row level security;
alter table public.effects enable row level security;

create policy "encounters are private" on public.encounters
  to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "creatures are private" on public.creatures
  to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "players are private" on public.players
  to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "campaigns are private" on public.campaigns
  to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "spells are private" on public.spells
  to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "effects are private" on public.effects
  to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

revoke all on table public.encounters from anon, authenticated;
revoke all on table public.creatures from anon, authenticated;
revoke all on table public.players from anon, authenticated;
revoke all on table public.campaigns from anon, authenticated;
revoke all on table public.spells from anon, authenticated;
revoke all on table public.effects from anon, authenticated;

grant select, insert, update, delete on table public.encounters to authenticated;
grant select, insert, update, delete on table public.creatures to authenticated;
grant select, insert, update, delete on table public.players to authenticated;
grant select, insert, update, delete on table public.campaigns to authenticated;
grant select, insert, update, delete on table public.spells to authenticated;
grant select, insert, update, delete on table public.effects to authenticated;
