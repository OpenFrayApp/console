-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Nicola Mustone

create table public.live_view_sessions (
  owner_id uuid primary key references auth.users on delete cascade,
  encounter_id uuid not null unique references public.encounters on delete cascade,
  code text not null,
  capability_hash text not null unique,
  generation bigint not null default 1,
  rotated_at timestamptz not null default now(),
  constraint live_view_capability_hash check (capability_hash ~ '^[a-f0-9]{64}$'),
  constraint live_view_code check (code ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$')
);
alter table public.live_view_sessions enable row level security;
revoke all on table public.live_view_sessions from anon, authenticated;

create or replace function public.start_live_view(
  want_encounter uuid,
  want_code text,
  want_capability_hash text
) returns bigint
  language plpgsql security definer set search_path = public
  as $$
  declare
    me uuid := auth.uid();
    next_generation bigint;
  begin
    if me is null then
      raise exception 'start_live_view() needs a signed-in caller';
    end if;
    if want_capability_hash !~ '^[a-f0-9]{64}$' then
      raise exception 'The live-view capability hash is invalid';
    end if;
    if not exists (
      select 1 from encounters
      where id = want_encounter
        and owner_id = me
        and kind = 'live'
        and player_code = want_code
    ) then
      raise exception 'start_live_view() needs an owned live encounter and matching code';
    end if;

    insert into live_view_sessions (owner_id, encounter_id, code, capability_hash)
      values (me, want_encounter, want_code, want_capability_hash)
      on conflict (owner_id) do update
        set encounter_id = excluded.encounter_id,
            code = excluded.code,
            capability_hash = excluded.capability_hash,
            generation = live_view_sessions.generation + 1,
            rotated_at = now()
      returning generation into next_generation;
    return next_generation;
  end
  $$;
revoke execute on function public.start_live_view(uuid, text, text) from public, anon;
grant execute on function public.start_live_view(uuid, text, text) to authenticated;

create or replace function public.stop_live_view(want_capability_hash text) returns boolean
  language plpgsql security definer set search_path = public
  as $$
  declare
    removed integer;
  begin
    if auth.uid() is null then return false; end if;
    delete from live_view_sessions
      where owner_id = auth.uid() and capability_hash = want_capability_hash;
    get diagnostics removed = row_count;
    return removed = 1;
  end
  $$;
revoke execute on function public.stop_live_view(text) from public, anon;
grant execute on function public.stop_live_view(text) to authenticated;

create or replace function public.stop_all_live_views() returns boolean
  language plpgsql security definer set search_path = public
  as $$
  declare
    removed integer;
  begin
    if auth.uid() is null then return false; end if;
    delete from live_view_sessions where owner_id = auth.uid();
    get diagnostics removed = row_count;
    return removed <= 1;
  end
  $$;
revoke execute on function public.stop_all_live_views() from public, anon;
grant execute on function public.stop_all_live_views() to authenticated;

create or replace function public.live_view_topic_active(want_topic text) returns boolean
  language sql stable security definer set search_path = public
  as $$
    select exists (
      select 1 from live_view_sessions
      where capability_hash = split_part(want_topic, ':', 2)
        and want_topic like 'player:%'
    )
  $$;
revoke execute on function public.live_view_topic_active(text) from public;
grant execute on function public.live_view_topic_active(text) to anon, authenticated;

create or replace function public.live_view_topic_owned(want_topic text) returns boolean
  language sql stable security definer set search_path = public
  as $$
    select exists (
      select 1 from live_view_sessions
      where capability_hash = split_part(want_topic, ':', 2)
        and owner_id = auth.uid()
        and want_topic like 'player:%'
    )
  $$;
revoke execute on function public.live_view_topic_owned(text) from public, anon;
grant execute on function public.live_view_topic_owned(text) to authenticated;

create policy "live viewers receive traffic" on realtime.messages
  for select to anon, authenticated
  using (
    extension in ('broadcast', 'presence')
    and public.live_view_topic_active(realtime.topic())
  );

create policy "live viewers announce presence" on realtime.messages
  for insert to anon, authenticated
  with check (
    extension = 'presence'
    and realtime.topic() like 'player:%:join'
    and public.live_view_topic_active(realtime.topic())
  );

create policy "owners publish live traffic" on realtime.messages
  for insert to authenticated
  with check (
    extension in ('broadcast', 'presence')
    and realtime.topic() not like 'player:%:join'
    and public.live_view_topic_owned(realtime.topic())
  );
