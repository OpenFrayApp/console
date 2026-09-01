-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Nicola Mustone
-- Hostile CB-1 fixture. Every authored row is synthetic and removed in the same statement.

do $cb1$
declare
  affected integer;
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  ) then raise exception 'CB-1: every public table must enable Row-Level Security';
  end if;

  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon'
  ) then raise exception 'CB-1: anonymous callers must have no direct table grants';
  end if;

  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'authenticated'
      and privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER')
  ) then raise exception 'CB-1: authenticated callers must have only minimal table grants';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.proconfig is distinct from array['search_path=public']::text[]
  ) then raise exception 'CB-1: every public security-definer function must fix its search path';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    where n.nspname = 'public' and p.prosecdef and acl.grantee = 0
  ) then raise exception 'CB-1: security-definer functions must not retain PUBLIC execution';
  end if;

  if to_regprocedure('public.answer_report(uuid,text)') is not null
    or to_regprocedure('public.inbound_queue(integer)') is not null
    or to_regprocedure('public.mail_thread(text)') is not null
    or to_regprocedure('public.mark_mail_handled(uuid)') is not null
    or to_regprocedure('public.inbound_waiting()') is not null
    or to_regprocedure('public.resolve_report(text,text,text)') is not null
  then raise exception 'CB-1: deprecated privileged overloads must be absent';
  end if;

  if has_function_privilege('anon', 'public.delete_account()', 'execute')
    or has_function_privilege('anon', 'public.may(text)', 'execute')
    or not has_function_privilege('anon', 'public.share(text)', 'execute')
  then raise exception 'CB-1: anonymous function execution must match the explicit allowlist';
  end if;

  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename in (
        'campaigns', 'creatures', 'effects', 'encounters', 'players', 'shares', 'spells'
      )
  ) then raise exception 'CB-1: owner rows must not leave through Realtime database-change channels';
  end if;

  execute 'set local role anon';
  perform share('missing-cb1-share');
  begin
    perform count(*) from campaigns;
    raise exception 'CB-1: an anonymous caller read owner rows' using errcode = 'OF000';
  exception
    when insufficient_privilege then null;
  end;
  begin
    perform delete_account();
    raise exception 'CB-1: an anonymous caller executed account deletion' using errcode = 'OF004';
  exception
    when insufficient_privilege then null;
  end;
  execute 'reset role';

  insert into auth.users (id, email) values
    ('11111111-1111-1111-1111-111111111111', 'owner-a@example.test'),
    ('22222222-2222-2222-2222-222222222222', 'owner-b@example.test'),
    ('33333333-3333-3333-3333-333333333333', 'viewer@example.test'),
    ('44444444-4444-4444-4444-444444444444', 'stale@example.test'),
    ('55555555-5555-5555-5555-555555555555', 'delete@example.test'),
    ('66666666-6666-6666-6666-666666666666', 'restricted@example.test');

  delete from user_roles where owner_id = '33333333-3333-3333-3333-333333333333';
  delete from auth.users where id = '44444444-4444-4444-4444-444444444444';

  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  perform set_config(
    'request.jwt.claims',
    '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
    false
  );
  execute 'set local role authenticated';
  insert into campaigns (name, data) values ('Owner fixture', '{}'::jsonb);
  if (select count(*) <> 1 from campaigns where name = 'Owner fixture') then
    raise exception 'CB-1: the owner must be allowed to create and read their row';
  end if;
  update campaigns set name = 'Owner updated' where name = 'Owner fixture';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'CB-1: the owner must be allowed to update their row';
  end if;
  execute 'reset role';

  perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
  perform set_config(
    'request.jwt.claims',
    '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}',
    false
  );
  execute 'set local role authenticated';
  if (select count(*) <> 0 from campaigns) then
    raise exception 'CB-1: another tenant must not read the owner row';
  end if;
  update campaigns set name = 'Cross-tenant update';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'CB-1: another tenant must not update the owner row';
  end if;
  delete from campaigns;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'CB-1: another tenant must not delete the owner row';
  end if;
  begin
    insert into campaigns (owner_id, name, data)
      values ('11111111-1111-1111-1111-111111111111', 'Cross-tenant insert', '{}'::jsonb);
    raise exception 'CB-1: another tenant inserted an owner row' using errcode = 'OF001';
  exception
    when insufficient_privilege or check_violation then null;
  end;
  execute 'reset role';

  perform set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
  perform set_config(
    'request.jwt.claims',
    '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}',
    false
  );
  execute 'set local role authenticated';
  if may('reports.read') then raise exception 'CB-1: a viewer gained report authority';
  end if;
  begin
    perform count(*) from public.user_roles;
    raise exception 'CB-1: a viewer read internal authority rows' using errcode = 'OF002';
  exception
    when insufficient_privilege then null;
  end;
  execute 'reset role';

  perform set_config('request.jwt.claim.sub', '66666666-6666-6666-6666-666666666666', false);
  perform set_config(
    'request.jwt.claims',
    '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}',
    false
  );
  execute 'set local role authenticated';
  if grant_role('66666666-6666-6666-6666-666666666666', 'admin', null)
    or reports_open() <> 0
  then raise exception 'CB-1: a restricted-function actor gained administrative authority';
  end if;
  execute 'reset role';

  perform set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', false);
  perform set_config(
    'request.jwt.claims',
    '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}',
    false
  );
  execute 'set local role authenticated';
  if (select count(*) <> 0 from campaigns) then
    raise exception 'CB-1: a stale writer read owner rows';
  end if;
  begin
    insert into campaigns (name, data) values ('Stale write', '{}'::jsonb);
    raise exception 'CB-1: a stale writer inserted a row' using errcode = 'OF003';
  exception
    when insufficient_privilege or check_violation or foreign_key_violation then null;
  end;
  execute 'reset role';

  insert into campaigns (owner_id, name, data)
    values ('55555555-5555-5555-5555-555555555555', 'Delete fixture', '{}'::jsonb);
  insert into creatures (owner_id, name, data)
    values ('55555555-5555-5555-5555-555555555555', 'Delete fixture', '{}'::jsonb);
  insert into effects (owner_id, name, data)
    values ('55555555-5555-5555-5555-555555555555', 'Delete fixture', '{}'::jsonb);
  insert into encounters (owner_id, state)
    values ('55555555-5555-5555-5555-555555555555', '{}'::jsonb);
  insert into players (owner_id, name, data)
    values ('55555555-5555-5555-5555-555555555555', 'Delete fixture', '{}'::jsonb);
  insert into shares (owner_id, code, kind, data)
    values ('55555555-5555-5555-5555-555555555555', 'cb1delete', 'encounter', '{}'::jsonb);
  insert into spells (owner_id, name, data)
    values ('55555555-5555-5555-5555-555555555555', 'Delete fixture', '{}'::jsonb);
  insert into byline_grants (owner_id)
    values ('55555555-5555-5555-5555-555555555555');
  insert into capability_denials (owner_id, capability)
    values ('55555555-5555-5555-5555-555555555555', 'share.encounter');
  insert into audit_log (actor_id, action)
    values ('55555555-5555-5555-5555-555555555555', 'cb1.fixture');
  execute 'set local session_replication_role = replica';
  insert into share_reports (code, reason, reporter_id)
    values ('cb1delete', 'other', '55555555-5555-5555-5555-555555555555');
  insert into takedown_notices (code, to_address)
    values ('cb1delete', 'delete@example.test');
  execute 'set local session_replication_role = origin';

  perform set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', false);
  perform set_config(
    'request.jwt.claims',
    '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}',
    false
  );
  execute 'set local role authenticated';
  perform delete_account();
  execute 'reset role';

  if exists (select 1 from auth.users where id = '55555555-5555-5555-5555-555555555555')
    or exists (select 1 from campaigns where owner_id = '55555555-5555-5555-5555-555555555555')
    or exists (select 1 from creatures where owner_id = '55555555-5555-5555-5555-555555555555')
    or exists (select 1 from effects where owner_id = '55555555-5555-5555-5555-555555555555')
    or exists (select 1 from encounters where owner_id = '55555555-5555-5555-5555-555555555555')
    or exists (select 1 from players where owner_id = '55555555-5555-5555-5555-555555555555')
    or exists (select 1 from shares where owner_id = '55555555-5555-5555-5555-555555555555')
    or exists (select 1 from spells where owner_id = '55555555-5555-5555-5555-555555555555')
    or exists (select 1 from byline_grants where owner_id = '55555555-5555-5555-5555-555555555555')
    or exists (select 1 from user_roles where owner_id = '55555555-5555-5555-5555-555555555555')
    or exists (select 1 from capability_denials where owner_id = '55555555-5555-5555-5555-555555555555')
    or exists (select 1 from audit_log where actor_id = '55555555-5555-5555-5555-555555555555')
    or exists (select 1 from takedown_notices where to_address = 'delete@example.test')
    or exists (select 1 from share_reports where reporter_id = '55555555-5555-5555-5555-555555555555')
  then raise exception 'CB-1: account deletion left an active owner link';
  end if;

  delete from share_reports where code = 'cb1delete';
  delete from audit_log where action = 'cb1.fixture';
  delete from auth.users where id in (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '66666666-6666-6666-6666-666666666666'
  );
end
$cb1$;
