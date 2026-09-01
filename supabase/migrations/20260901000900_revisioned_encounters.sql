-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Nicola Mustone

alter table public.encounters
  add column revision bigint not null default 0,
  add constraint encounters_revision_nonnegative check (revision >= 0);

create table public.encounter_revisions (
  encounter_id uuid not null references public.encounters on delete cascade,
  owner_id uuid not null references auth.users on delete cascade,
  revision bigint not null,
  state jsonb not null,
  created_at timestamptz not null default now(),
  checkpoint boolean not null default false,
  primary key (encounter_id, revision),
  constraint encounter_revisions_revision_positive check (revision >= 0)
);
create index encounter_revisions_owner_idx
  on public.encounter_revisions (owner_id, encounter_id, revision desc);
create index encounter_revisions_retention_idx
  on public.encounter_revisions (encounter_id, created_at desc);
alter table public.encounter_revisions enable row level security;
revoke all on table public.encounter_revisions from anon, authenticated;

insert into public.encounter_revisions (
  encounter_id, owner_id, revision, state, created_at, checkpoint
)
select id, owner_id, revision, state, updated_at, true
from public.encounters
where kind = 'live';

create table public.encounter_writer_leases (
  encounter_id uuid primary key references public.encounters on delete cascade,
  owner_id uuid not null references auth.users on delete cascade,
  writer_id uuid not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create index encounter_writer_leases_owner_idx
  on public.encounter_writer_leases (owner_id, encounter_id);
alter table public.encounter_writer_leases enable row level security;
revoke all on table public.encounter_writer_leases from anon, authenticated;

create or replace function public.claim_encounter_writer(
  want_encounter uuid,
  want_writer uuid
) returns jsonb
  language plpgsql security definer set search_path = public
  as $$
  declare
    me uuid := auth.uid();
    current_revision bigint;
    active_writer uuid;
    active_until timestamptz;
  begin
    if me is null then
      raise exception using errcode = '28000', message = 'claim_encounter_writer() needs a signed-in caller';
    end if;
    if want_writer is null then
      raise exception 'claim_encounter_writer() needs a writer identifier';
    end if;

    select revision into current_revision
      from encounters
      where id = want_encounter and owner_id = me and kind = 'live'
      for update;
    if not found then
      raise exception 'claim_encounter_writer() needs an owned live encounter';
    end if;

    select writer_id, expires_at into active_writer, active_until
      from encounter_writer_leases where encounter_id = want_encounter;
    if not found or active_writer = want_writer or active_until <= now() then
      insert into encounter_writer_leases (encounter_id, owner_id, writer_id, expires_at)
        values (want_encounter, me, want_writer, now() + interval '5 minutes')
        on conflict (encounter_id) do update
          set writer_id = excluded.writer_id,
              expires_at = excluded.expires_at,
              updated_at = now();
      return jsonb_build_object(
        'status', 'acquired',
        'revision', current_revision,
        'leaseToken', want_writer
      );
    end if;

    return jsonb_build_object('status', 'read-only', 'revision', current_revision);
  end
  $$;
revoke execute on function public.claim_encounter_writer(uuid, uuid) from public, anon;
grant execute on function public.claim_encounter_writer(uuid, uuid) to authenticated;

create or replace function public.takeover_encounter_writer(
  want_encounter uuid,
  want_writer uuid
) returns jsonb
  language plpgsql security definer set search_path = public
  as $$
  declare
    me uuid := auth.uid();
    current_revision bigint;
    current_state jsonb;
  begin
    if me is null then
      raise exception using errcode = '28000', message = 'takeover_encounter_writer() needs a signed-in caller';
    end if;
    if want_writer is null then
      raise exception 'takeover_encounter_writer() needs a writer identifier';
    end if;

    select revision, state into current_revision, current_state
      from encounters
      where id = want_encounter and owner_id = me and kind = 'live'
      for update;
    if not found then
      raise exception 'takeover_encounter_writer() needs an owned live encounter';
    end if;

    insert into encounter_revisions (
      encounter_id, owner_id, revision, state, created_at, checkpoint
    ) values (
      want_encounter, me, current_revision, current_state, now(), true
    ) on conflict (encounter_id, revision) do update set checkpoint = true;

    insert into encounter_writer_leases (encounter_id, owner_id, writer_id, expires_at)
      values (want_encounter, me, want_writer, now() + interval '5 minutes')
      on conflict (encounter_id) do update
        set writer_id = excluded.writer_id,
            expires_at = excluded.expires_at,
            updated_at = now();

    return jsonb_build_object(
      'status', 'acquired',
      'revision', current_revision,
      'leaseToken', want_writer
    );
  end
  $$;
revoke execute on function public.takeover_encounter_writer(uuid, uuid) from public, anon;
grant execute on function public.takeover_encounter_writer(uuid, uuid) to authenticated;

create or replace function public.save_encounter_revision(
  want_owner uuid,
  want_encounter uuid,
  expected_revision bigint,
  want_writer uuid,
  want_state jsonb,
  want_updated_at timestamptz
) returns jsonb
  language plpgsql security definer set search_path = public
  as $$
  declare
    me uuid := auth.uid();
    live_id uuid;
    current_revision bigint;
    active_writer uuid;
    active_until timestamptz;
  begin
    if me is null or me is distinct from want_owner then
      raise exception using errcode = '28000', message = 'save_encounter_revision() identity changed';
    end if;
    if expected_revision is null or want_writer is null then
      raise exception 'save_encounter_revision() needs an expected revision and writer identifier';
    end if;

    if want_encounter is null then
      if expected_revision <> 0 then
        return jsonb_build_object('status', 'stale', 'revision', 0);
      end if;
      begin
        insert into encounters (owner_id, state, updated_at, revision)
          values (me, want_state, want_updated_at, 1)
          returning id into live_id;
      exception when unique_violation then
        select id, revision into live_id, current_revision
          from encounters where owner_id = me and kind = 'live';
        return jsonb_build_object('status', 'stale', 'revision', current_revision);
      end;
      insert into encounter_writer_leases (encounter_id, owner_id, writer_id, expires_at)
        values (live_id, me, want_writer, now() + interval '5 minutes');
      insert into encounter_revisions (encounter_id, owner_id, revision, state)
        values (live_id, me, 1, want_state);
      return jsonb_build_object(
        'status', 'saved', 'id', live_id, 'revision', 1, 'leaseToken', want_writer
      );
    end if;

    select revision into current_revision
      from encounters
      where id = want_encounter and owner_id = me and kind = 'live'
      for update;
    if not found then
      raise exception 'save_encounter_revision() needs an owned live encounter';
    end if;
    if current_revision <> expected_revision then
      return jsonb_build_object('status', 'stale', 'revision', current_revision);
    end if;

    select writer_id, expires_at into active_writer, active_until
      from encounter_writer_leases where encounter_id = want_encounter;
    if not found or active_writer <> want_writer or active_until <= now() then
      return jsonb_build_object('status', 'lease-lost', 'revision', current_revision);
    end if;

    current_revision := current_revision + 1;
    update encounters
      set state = want_state, updated_at = want_updated_at, revision = current_revision
      where id = want_encounter;
    insert into encounter_revisions (encounter_id, owner_id, revision, state)
      values (want_encounter, me, current_revision, want_state);
    update encounter_writer_leases
      set expires_at = now() + interval '5 minutes', updated_at = now()
      where encounter_id = want_encounter;

    delete from encounter_revisions old
      where old.encounter_id = want_encounter
        and old.created_at < now() - interval '7 days'
        and old.revision not in (
          select recent.revision from encounter_revisions recent
          where recent.encounter_id = want_encounter
          order by recent.revision desc
          limit 10
        );

    return jsonb_build_object(
      'status', 'saved',
      'id', want_encounter,
      'revision', current_revision,
      'leaseToken', want_writer
    );
  end
  $$;
revoke execute on function public.save_encounter_revision(uuid, uuid, bigint, uuid, jsonb, timestamptz)
  from public, anon;
grant execute on function public.save_encounter_revision(uuid, uuid, bigint, uuid, jsonb, timestamptz)
  to authenticated;

revoke all on table public.encounters from anon, authenticated;
grant select, insert, delete on table public.encounters to authenticated;
grant update (name, player_code) on table public.encounters to authenticated;

drop policy "encounters are private" on public.encounters;
create policy "owners read encounters" on public.encounters
  for select to authenticated using (auth.uid() = owner_id);
create policy "owners insert saved encounters" on public.encounters
  for insert to authenticated with check (auth.uid() = owner_id and kind = 'saved');
create policy "owners update encounter labels" on public.encounters
  for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owners delete saved encounters" on public.encounters
  for delete to authenticated using (auth.uid() = owner_id and kind = 'saved');
