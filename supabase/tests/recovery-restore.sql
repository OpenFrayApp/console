-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Nicola Mustone

-- Verify restored relationships and structures without returning authored content.
do $recovery$
declare
  active_sessions integer := 0;
begin
  if exists (
    select 1 from auth.identities i
    left join auth.users u on u.id = i.user_id
    where u.id is null
  ) then raise exception 'RC-4: restored authentication identities have no account';
  end if;

  if to_regclass('auth.sessions') is not null then
    execute 'select count(*) from auth.sessions' into active_sessions;
  end if;
  if to_regclass('auth.refresh_tokens') is not null then
    execute 'select $1 + count(*) from auth.refresh_tokens'
      into active_sessions using active_sessions;
  end if;
  if active_sessions <> 0 then
    raise exception 'RC-4: authentication sessions entered the recovery point';
  end if;

  if exists (select 1 from public.live_view_sessions)
    or exists (select 1 from public.encounter_writer_leases)
  then raise exception 'RC-4: restored live authority remained active';
  end if;

  if exists (
    select 1 from public.encounters where jsonb_typeof(state) <> 'object'
  ) then raise exception 'RC-4: a restored encounter is not an object';
  end if;

  if exists (
    select 1 from public.encounters e
    where e.kind = 'live' and not exists (
      select 1 from public.encounter_revisions r where r.encounter_id = e.id
    )
  ) then raise exception 'RC-4: a restored live encounter has no recovery revision';
  end if;

  if exists (
    select 1 from public.encounters e
    join lateral (
      select state from public.encounter_revisions
      where encounter_id = e.id order by revision desc limit 1
    ) latest on true
    where e.kind = 'live' and latest.state is distinct from e.state
  ) then raise exception 'RC-4: a restored encounter differs from its latest revision';
  end if;

  if to_regprocedure('public.delete_account()') is null
    or to_regprocedure('public.share(text)') is null
    or to_regprocedure('public.save_encounter_revision(uuid,uuid,bigint,uuid,jsonb,timestamptz)') is null
    or to_regprocedure('public.apply_recovery_deletions()') is null
  then raise exception 'RC-4: a critical function is missing';
  end if;
end
$recovery$;
