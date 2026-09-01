-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Nicola Mustone
-- Hostile CB-1 fixture. Every authored row is synthetic and removed in the same statement.

do $cb1$
declare
  affected integer;
  owner_table text;
  insert_statement text;
  live_encounter uuid;
  other_live_encounter uuid;
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
    with expected(table_name, privilege_type) as (
      values
        ('campaigns', 'SELECT'), ('campaigns', 'INSERT'),
        ('campaigns', 'UPDATE'), ('campaigns', 'DELETE'),
        ('creatures', 'SELECT'), ('creatures', 'INSERT'),
        ('creatures', 'UPDATE'), ('creatures', 'DELETE'),
        ('effects', 'SELECT'), ('effects', 'INSERT'),
        ('effects', 'UPDATE'), ('effects', 'DELETE'),
        ('encounters', 'SELECT'), ('encounters', 'INSERT'),
        ('encounters', 'UPDATE'), ('encounters', 'DELETE'),
        ('players', 'SELECT'), ('players', 'INSERT'),
        ('players', 'UPDATE'), ('players', 'DELETE'),
        ('shares', 'SELECT'), ('shares', 'INSERT'), ('shares', 'DELETE'),
        ('spells', 'SELECT'), ('spells', 'INSERT'),
        ('spells', 'UPDATE'), ('spells', 'DELETE')
    ), actual as (
      select table_name, privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public' and grantee = 'authenticated'
    )
    (select * from actual except select * from expected)
    union all
    (select * from expected except select * from actual)
  ) then raise exception 'CB-1: authenticated table grants differ from the exact allowlist';
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

  if exists (
    with expected(signature, grantee) as (
      values
        ('account_libraries()', 'authenticated'),
        ('account_made(uuid,integer)', 'authenticated'),
        ('account_overview(uuid)', 'authenticated'),
        ('accounts(integer)', 'authenticated'),
        ('answer_reports(text,text)', 'authenticated'),
        ('audit_recent(integer)', 'authenticated'),
        ('capabilities_of(uuid)', 'authenticated'),
        ('delete_account()', 'authenticated'),
        ('deny_capability(uuid,text,text)', 'authenticated'),
        ('grant_role(uuid,text,text)', 'authenticated'),
        ('live_view_topic_active(text)', 'anon'),
        ('live_view_topic_active(text)', 'authenticated'),
        ('live_view_topic_owned(text)', 'authenticated'),
        ('may(text)', 'authenticated'),
        ('may_publish_more()', 'authenticated'),
        ('may_use_reserved_byline()', 'authenticated'),
        ('my_capabilities()', 'authenticated'),
        ('report_share(text,text,text,text)', 'anon'),
        ('report_share(text,text,text,text)', 'authenticated'),
        ('reported_share(text)', 'authenticated'),
        ('reports_for(text)', 'authenticated'),
        ('reports_open()', 'authenticated'),
        ('reports_queue(integer)', 'authenticated'),
        ('restore_capability(uuid,text)', 'authenticated'),
        ('revoke_role(uuid,text)', 'authenticated'),
        ('share(text)', 'anon'),
        ('share(text)', 'authenticated'),
        ('start_live_view(uuid,text,text)', 'authenticated'),
        ('stop_all_live_views()', 'authenticated'),
        ('stop_live_view(text)', 'authenticated')
    ), actual as (
      select p.oid::regprocedure::text, r.rolname
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
      join pg_roles r on r.oid = acl.grantee
      where n.nspname = 'public'
        and p.prosecdef
        and acl.privilege_type = 'EXECUTE'
        and r.rolname in ('anon', 'authenticated')
    )
    (select * from actual except select * from expected)
    union all
    (select * from expected except select * from actual)
  ) then raise exception 'CB-1: privileged function grants differ from the exact allowlist';
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
  insert into creatures (name, data) values ('Owner fixture', '{}'::jsonb);
  insert into effects (name, data) values ('Owner fixture', '{}'::jsonb);
  insert into encounters (state) values ('{}'::jsonb);
  insert into players (name, data) values ('Owner fixture', '{}'::jsonb);
  insert into shares (code, kind, data) values ('cb1owner', 'encounter', '{}'::jsonb);
  insert into spells (name, data) values ('Owner fixture', '{}'::jsonb);
  foreach owner_table in array array[
    'campaigns', 'creatures', 'effects', 'encounters', 'players', 'shares', 'spells'
  ] loop
    execute format('select count(*) from %I', owner_table) into affected;
    if affected <> 1 then
      raise exception 'CB-1: the owner could not create or read %', owner_table;
    end if;
    if owner_table <> 'shares' then
      execute format('update %I set owner_id = owner_id', owner_table);
      get diagnostics affected = row_count;
      if affected <> 1 then raise exception 'CB-1: the owner could not update %', owner_table;
      end if;
    end if;
  end loop;
  update encounters set player_code = 'cb3-owner' returning id into live_encounter;
  if start_live_view(live_encounter, 'cb3-owner', repeat('a', 64)) <> 1 then
    raise exception 'CB-3: the encounter owner could not start a live view';
  end if;
  if not live_view_topic_owned('player:' || repeat('a', 64) || ':lobby') then
    raise exception 'CB-3: the encounter owner could not publish';
  end if;
  perform set_config('realtime.topic', 'player:' || repeat('a', 64) || ':lobby', false);
  insert into realtime.messages (topic, extension, event, private)
    values
      ('player:' || repeat('a', 64) || ':lobby', 'broadcast', 'cb3-fixture', true),
      ('player:' || repeat('a', 64) || ':lobby', 'presence', 'cb3-fixture', true);
  execute 'reset role';

  perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
  perform set_config(
    'request.jwt.claims',
    '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}',
    false
  );
  execute 'set local role authenticated';
  foreach owner_table in array array[
    'campaigns', 'creatures', 'effects', 'encounters', 'players', 'shares', 'spells'
  ] loop
    execute format('select count(*) from %I', owner_table) into affected;
    if affected <> 0 then raise exception 'CB-1: another tenant read %', owner_table;
    end if;
    if owner_table = 'shares' then
      begin
        execute 'update shares set owner_id = owner_id';
        raise exception 'CB-1: shares unexpectedly allow updates' using errcode = 'OF005';
      exception
        when insufficient_privilege then null;
      end;
    else
      execute format('update %I set owner_id = owner_id', owner_table);
      get diagnostics affected = row_count;
      if affected <> 0 then raise exception 'CB-1: another tenant updated %', owner_table;
      end if;
    end if;
    execute format('delete from %I', owner_table);
    get diagnostics affected = row_count;
    if affected <> 0 then raise exception 'CB-1: another tenant deleted from %', owner_table;
    end if;
  end loop;
  foreach insert_statement in array array[
    $sql$insert into campaigns (owner_id, name, data) values ('11111111-1111-1111-1111-111111111111', 'Cross-tenant insert', '{}')$sql$,
    $sql$insert into creatures (owner_id, name, data) values ('11111111-1111-1111-1111-111111111111', 'Cross-tenant insert', '{}')$sql$,
    $sql$insert into effects (owner_id, name, data) values ('11111111-1111-1111-1111-111111111111', 'Cross-tenant insert', '{}')$sql$,
    $sql$insert into encounters (owner_id, state) values ('11111111-1111-1111-1111-111111111111', '{}')$sql$,
    $sql$insert into players (owner_id, name, data) values ('11111111-1111-1111-1111-111111111111', 'Cross-tenant insert', '{}')$sql$,
    $sql$insert into shares (owner_id, code, kind, data) values ('11111111-1111-1111-1111-111111111111', 'cb1cross', 'encounter', '{}')$sql$,
    $sql$insert into spells (owner_id, name, data) values ('11111111-1111-1111-1111-111111111111', 'Cross-tenant insert', '{}')$sql$
  ] loop
    begin
      execute insert_statement;
      raise exception 'CB-1: another tenant inserted an owner row' using errcode = 'OF001';
    exception
      when insufficient_privilege or check_violation then null;
    end;
  end loop;
  if live_view_topic_owned('player:' || repeat('a', 64) || ':lobby') then
    raise exception 'CB-3: an authenticated non-owner could publish';
  end if;
  begin
    perform start_live_view(live_encounter, 'cb3-owner', repeat('b', 64));
    raise exception 'CB-3: a non-owner rotated another encounter' using errcode = 'OF006';
  exception
    when raise_exception then
      if sqlerrm not like '%owned live encounter%' then raise; end if;
  end;
  perform set_config('realtime.topic', 'player:' || repeat('a', 64) || ':lobby', false);
  foreach owner_table in array array['broadcast', 'presence'] loop
    begin
      insert into realtime.messages (topic, extension, event, private)
        values ('player:' || repeat('a', 64) || ':lobby', owner_table, 'cb3-fixture', true);
      raise exception 'CB-3: a non-owner published through Realtime' using errcode = 'OF007';
    exception
      when insufficient_privilege then null;
    end;
  end loop;
  insert into encounters (state, player_code)
    values ('{}'::jsonb, 'cb3-other') returning id into other_live_encounter;
  if start_live_view(other_live_encounter, 'cb3-other', repeat('c', 64)) <> 1 then
    raise exception 'CB-3: another owner could not start an independent live view';
  end if;
  if live_view_topic_active('player:' || repeat('c', 64) || ':arbitrary') then
    raise exception 'CB-3: an unsupported channel shape became active';
  end if;
  perform set_config('realtime.topic', 'player:' || repeat('c', 64) || ':lobby', false);
  begin
    insert into realtime.messages (topic, extension, event, private)
      values ('player:' || repeat('a', 64) || ':lobby', 'broadcast', 'cb3-cross-fixture', true);
    raise exception 'CB-3: an owner published to a channel other than the requested topic'
      using errcode = 'OF009';
  exception
    when insufficient_privilege then null;
  end;
  insert into realtime.messages (topic, extension, event, private)
    values ('player:' || repeat('c', 64) || ':lobby', 'broadcast', 'cb3-other-fixture', true);
  execute 'reset role';

  execute 'set local role anon';
  if has_function_privilege('anon', 'public.start_live_view(uuid,text,text)', 'execute')
    or has_function_privilege('anon', 'public.stop_live_view(text)', 'execute')
    or has_function_privilege('anon', 'public.stop_all_live_views()', 'execute')
    or has_function_privilege('anon', 'public.live_view_topic_owned(text)', 'execute')
  then raise exception 'CB-3: an anonymous caller gained publication authority';
  end if;
  if not live_view_topic_active('player:' || repeat('a', 64) || ':lobby') then
    raise exception 'CB-3: a capability holder could not receive live traffic';
  end if;
  perform set_config('realtime.topic', 'player:' || repeat('a', 64) || ':lobby', false);
  select count(*) into affected from realtime.messages where event = 'cb3-fixture';
  if affected <> 2 then
    raise exception 'CB-3: a viewer could not read the active channel';
  end if;
  select count(*) into affected from realtime.messages where event = 'cb3-other-fixture';
  if affected <> 0 then
    raise exception 'CB-3: a viewer read another active channel';
  end if;
  perform set_config('realtime.topic', 'player:' || repeat('c', 64) || ':lobby', false);
  select count(*) into affected from realtime.messages where event = 'cb3-other-fixture';
  if affected <> 1 then
    raise exception 'CB-3: another viewer could not read its active channel';
  end if;
  select count(*) into affected from realtime.messages where event = 'cb3-fixture';
  if affected <> 0 then
    raise exception 'CB-3: another viewer read the owner channel';
  end if;
  perform set_config('realtime.topic', 'player:' || repeat('a', 64) || ':lobby', false);
  begin
    insert into realtime.messages (topic, extension, event, private)
      values ('player:' || repeat('a', 64) || ':lobby', 'broadcast', 'cb3-fixture', true);
    raise exception 'CB-3: an anonymous viewer broadcast through Realtime' using errcode = 'OF008';
  exception
    when insufficient_privilege then null;
  end;
  perform set_config('realtime.topic', 'player:' || repeat('a', 64) || ':join', false);
  begin
    insert into realtime.messages (topic, extension, event, private)
      values ('player:' || repeat('c', 64) || ':join', 'presence', 'cb3-cross-fixture', true);
    raise exception 'CB-3: a viewer announced presence on another channel'
      using errcode = 'OF010';
  exception
    when insufficient_privilege then null;
  end;
  insert into realtime.messages (topic, extension, event, private)
    values ('player:' || repeat('a', 64) || ':join', 'presence', 'cb3-fixture', true);
  execute 'reset role';

  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  execute 'set local role authenticated';
  if start_live_view(live_encounter, 'cb3-owner', repeat('b', 64)) <> 2 then
    raise exception 'CB-3: rotation did not advance the capability generation';
  end if;
  if live_view_topic_active('player:' || repeat('a', 64) || ':lobby')
    or not live_view_topic_active('player:' || repeat('b', 64) || ':lobby')
  then raise exception 'CB-3: rotation left a stale capability active';
  end if;
  if stop_live_view(repeat('a', 64)) then
    raise exception 'CB-3: a stale stop revoked the rotated capability';
  end if;
  if not stop_live_view(repeat('b', 64)) then
    raise exception 'CB-3: the owner could not revoke the active capability';
  end if;
  if live_view_topic_active('player:' || repeat('b', 64) || ':lobby') then
    raise exception 'CB-3: revocation left the capability active';
  end if;
  foreach owner_table in array array[
    'campaigns', 'creatures', 'effects', 'encounters', 'players', 'shares', 'spells'
  ] loop
    execute format('delete from %I', owner_table);
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'CB-1: the owner could not delete from %', owner_table;
    end if;
  end loop;
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
    or revoke_role('11111111-1111-1111-1111-111111111111', 'gm')
    or deny_capability('11111111-1111-1111-1111-111111111111', 'share.encounter', null)
    or restore_capability('11111111-1111-1111-1111-111111111111', 'share.encounter')
    or answer_reports('cb1owner', 'dismissed') <> 0
    or reports_open() <> 0
    or exists (select 1 from audit_recent())
    or exists (select 1 from accounts())
    or exists (select 1 from capabilities_of('11111111-1111-1111-1111-111111111111'))
    or exists (select 1 from reports_queue())
    or exists (select 1 from reports_for('cb1owner'))
    or exists (select 1 from reported_share('cb1owner'))
    or exists (select 1 from account_overview('11111111-1111-1111-1111-111111111111'))
    or exists (select 1 from account_made('11111111-1111-1111-1111-111111111111'))
    or exists (select 1 from account_libraries())
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

  foreach owner_table in array array(
    select table_name::text
    from information_schema.columns
    where table_schema = 'public' and column_name = 'owner_id'
    order by table_name
  ) loop
    execute format(
      'select count(*) from %I where owner_id = %L',
      owner_table,
      '55555555-5555-5555-5555-555555555555'
    ) into affected;
    if affected <> 0 then
      raise exception 'CB-1: account deletion left an owner link in %', owner_table;
    end if;
  end loop;

  if exists (select 1 from auth.users where id = '55555555-5555-5555-5555-555555555555')
    or exists (select 1 from audit_log where actor_id = '55555555-5555-5555-5555-555555555555')
    or exists (select 1 from takedown_notices where to_address = 'delete@example.test')
    or exists (select 1 from share_reports where reporter_id = '55555555-5555-5555-5555-555555555555')
  then raise exception 'CB-1: account deletion left an active owner link';
  end if;

  delete from share_reports where code = 'cb1delete';
  delete from audit_log where action = 'cb1.fixture';
  delete from realtime.messages where event in ('cb3-fixture', 'cb3-other-fixture');
  delete from auth.users where id in (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '66666666-6666-6666-6666-666666666666'
  );
end
$cb1$;
