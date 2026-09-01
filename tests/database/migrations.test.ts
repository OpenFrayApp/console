// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url))
const migrationsDirectory = here('../../supabase/migrations')
const migrationFiles = readdirSync(migrationsDirectory).sort()

const SUPABASE_STUB = `
  create schema if not exists auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    created_at timestamptz not null default now(),
    last_sign_in_at timestamptz,
    raw_user_meta_data jsonb not null default '{}'::jsonb
  );
  create table auth.identities (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users on delete cascade,
    provider text not null,
    last_sign_in_at timestamptz
  );
  create or replace function auth.uid() returns uuid language sql stable as $fn$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $fn$;
  do $do$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then
      create role authenticated;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then
      create role service_role;
    end if;
  end $do$;
  grant usage on schema public to anon, authenticated, service_role;
  create schema realtime;
  create table realtime.messages (
    topic text not null,
    extension text not null,
    event text not null,
    private boolean not null default true
  );
  alter table realtime.messages enable row level security;
  create or replace function realtime.topic() returns text language sql stable as $fn$
    select current_setting('realtime.topic', true)
  $fn$;
  grant usage on schema realtime to anon, authenticated;
  grant select, insert on table realtime.messages to anon, authenticated;
`

let db: PGlite

/** Read one scalar value from the migration database. */
async function value<T>(query: string): Promise<T> {
  const result = await db.query<Record<string, T>>(query)
  return Object.values(result.rows[0])[0]
}

/** Ask the next query as one authenticated account. */
async function as(uid: string): Promise<void> {
  await db.exec('reset role')
  await db.exec(`select set_config('request.jwt.claim.sub', '${uid}', false)`)
  await db.exec('set role authenticated')
}

/** Restore migration-owner access for fixture setup and catalog inspection. */
async function asOwner(): Promise<void> {
  await db.exec('reset role')
  await db.exec(`select set_config('request.jwt.claim.sub', '', false)`)
}

beforeAll(async () => {
  db = await new PGlite()
  await db.exec(SUPABASE_STUB)
  for (const migration of migrationFiles) {
    await db.exec(readFileSync(`${migrationsDirectory}/${migration}`, 'utf8'))
  }
}, 60_000)

describe('the tracked migration lineage', () => {
  it('rebuilds every reviewed public table from a fresh database', async () => {
    const result = await db.query<{ tablename: string }>(`
      select tablename from pg_tables
      where schemaname = 'public'
      order by tablename
    `)

    expect(result.rows.map(({ tablename }) => tablename)).toEqual([
      'audit_log',
      'byline_grants',
      'campaigns',
      'capabilities',
      'capability_denials',
      'creatures',
      'effects',
      'encounter_revisions',
      'encounter_writer_leases',
      'encounters',
      'live_view_sessions',
      'players',
      'role_capabilities',
      'role_inherits',
      'share_reports',
      'share_tombstones',
      'shares',
      'spells',
      'takedown_notices',
      'user_roles',
    ])
  })

  it('enables RLS on every application table', async () => {
    expect(
      await value<number>(`
        select count(*)::int from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
      `),
    ).toBe(0)
  })

  it('gives owner tables owner-scoped policies and exact client grants', async () => {
    const owners = [
      'campaigns',
      'creatures',
      'effects',
      'encounters',
      'players',
      'shares',
      'spells',
    ]
    for (const table of owners) {
      expect(
        await value<number>(`
          select count(*)::int from pg_policies
          where schemaname = 'public' and tablename = '${table}'
        `),
      ).toBeGreaterThan(0)
      expect(await value<boolean>(`select has_table_privilege('anon', '${table}', 'select')`)).toBe(
        false,
      )
      expect(
        await value<boolean>(`select has_table_privilege('authenticated', '${table}', 'truncate')`),
      ).toBe(false)
      expect(
        await value<boolean>(
          `select has_table_privilege('authenticated', '${table}', 'references')`,
        ),
      ).toBe(false)
    }
  })

  it('allows owner CRUD and denies the same operations across owners', async () => {
    const first = '11111111-1111-1111-1111-111111111110'
    const second = '22222222-2222-2222-2222-222222222220'
    await db.exec(`insert into auth.users (id) values ('${first}'), ('${second}')`)

    await as(first)
    await db.exec(`insert into campaigns (name, data) values ('First', '{}'::jsonb)`)
    expect(await value<number>(`select count(*)::int from campaigns`)).toBe(1)

    await as(second)
    expect(await value<number>(`select count(*)::int from campaigns`)).toBe(0)
    expect(
      await value<number>(`
        with changed as (update campaigns set name = 'Stolen' returning *)
        select count(*)::int from changed
      `),
    ).toBe(0)
    expect(
      await value<number>(`
        with removed as (delete from campaigns returning *)
        select count(*)::int from removed
      `),
    ).toBe(0)

    await as(first)
    expect(await value<string>(`select name from campaigns`)).toBe('First')
    await asOwner()
  })

  it('fixes every security-definer search path and grants only the reviewed execution set', async () => {
    const result = await db.query<{ name: string; settings: string[] | null }>(`
      select p.proname as name, p.proconfig as settings
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prosecdef
      order by p.proname
    `)

    expect(result.rows.length).toBeGreaterThan(10)
    for (const routine of result.rows) {
      expect(routine.settings).toContain('search_path=public')
    }

    const grants = await db.query<{ signature: string; grantee: string }>(`
      select p.oid::regprocedure::text as signature, r.rolname as grantee
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
      join pg_roles r on r.oid = acl.grantee
      where n.nspname = 'public'
        and p.prosecdef
        and acl.privilege_type = 'EXECUTE'
        and r.rolname in ('anon', 'authenticated')
      order by signature, grantee
    `)
    expect(grants.rows.map(({ signature, grantee }) => `${signature}:${grantee}`)).toEqual([
      'account_libraries():authenticated',
      'account_made(uuid,integer):authenticated',
      'account_overview(uuid):authenticated',
      'accounts(integer):authenticated',
      'answer_reports(text,text):authenticated',
      'audit_recent(integer):authenticated',
      'capabilities_of(uuid):authenticated',
      'claim_encounter_writer(uuid,uuid):authenticated',
      'delete_account():authenticated',
      'deny_capability(uuid,text,text):authenticated',
      'grant_role(uuid,text,text):authenticated',
      'live_view_topic_active(text):anon',
      'live_view_topic_active(text):authenticated',
      'live_view_topic_owned(text):authenticated',
      'may(text):authenticated',
      'may_publish_more():authenticated',
      'may_use_reserved_byline():authenticated',
      'my_capabilities():authenticated',
      'report_share(text,text,text,text):anon',
      'report_share(text,text,text,text):authenticated',
      'reported_share(text):authenticated',
      'reports_for(text):authenticated',
      'reports_open():authenticated',
      'reports_queue(integer):authenticated',
      'restore_capability(uuid,text):authenticated',
      'revoke_role(uuid,text):authenticated',
      'save_encounter_revision(uuid,uuid,bigint,uuid,jsonb,timestamp with time zone):authenticated',
      'share(text):anon',
      'share(text):authenticated',
      'start_live_view(uuid,text,text):authenticated',
      'stop_all_live_views():authenticated',
      'stop_live_view(text):authenticated',
      'takeover_encounter_writer(uuid,uuid):authenticated',
    ])
  })

  it('fences stale and displaced writers while retaining takeover history', async () => {
    const owner = '11111111-1111-1111-1111-111111111115'
    const other = '22222222-2222-2222-2222-222222222225'
    const encounter = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaad'
    const firstWriter = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
    const secondWriter = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb'
    await asOwner()
    await db.exec(`
      insert into auth.users (id) values ('${owner}'), ('${other}');
      insert into encounters (id, owner_id, state)
        values ('${encounter}', '${owner}', '{"board":"initial"}'::jsonb);
    `)

    await as(owner)
    expect(
      await value<{ status: string; revision: number }>(
        `select claim_encounter_writer('${encounter}', '${firstWriter}')`,
      ),
    ).toMatchObject({ status: 'acquired', revision: 0 })
    await expect(
      db.exec(`
        select save_encounter_revision(
          '${other}', null, 0, '${firstWriter}', '{"board":"cross-account"}'::jsonb, now()
        )
      `),
    ).rejects.toThrow(/identity changed/)
    await expect(
      db.exec(`
        select save_encounter_revision(
          '${owner}', '${encounter}', null, '${firstWriter}', '{"board":"without-cas"}'::jsonb, now()
        )
      `),
    ).rejects.toThrow(/expected revision/)
    expect(
      await value<{ status: string; revision: number }>(`
        select save_encounter_revision(
          '${owner}', '${encounter}', 0, '${firstWriter}', '{"board":"first"}'::jsonb, now()
        )
      `),
    ).toMatchObject({ status: 'saved', revision: 1 })
    expect(
      await value<{ status: string; revision: number }>(`
        select save_encounter_revision(
          '${owner}', '${encounter}', 0, '${firstWriter}', '{"board":"duplicate"}'::jsonb, now()
        )
      `),
    ).toEqual({ status: 'stale', revision: 1 })
    expect(
      await value<{ status: string; revision: number }>(
        `select claim_encounter_writer('${encounter}', '${secondWriter}')`,
      ),
    ).toEqual({ status: 'read-only', revision: 1 })

    await as(other)
    await expect(
      db.exec(`select takeover_encounter_writer('${encounter}', '${secondWriter}')`),
    ).rejects.toThrow(/owned live encounter/)

    await as(owner)
    expect(
      await value<{ status: string; revision: number }>(
        `select takeover_encounter_writer('${encounter}', '${secondWriter}')`,
      ),
    ).toMatchObject({ status: 'acquired', revision: 1 })
    expect(
      await value<{ status: string; revision: number }>(`
        select save_encounter_revision(
          '${owner}', '${encounter}', 1, '${firstWriter}', '{"board":"delayed"}'::jsonb, now()
        )
      `),
    ).toEqual({ status: 'lease-lost', revision: 1 })
    expect(
      await value<{ status: string; revision: number }>(`
        select save_encounter_revision(
          '${owner}', '${encounter}', 1, '${secondWriter}', '{"board":"newer"}'::jsonb, now()
        )
      `),
    ).toMatchObject({ status: 'saved', revision: 2 })

    expect(
      await value<string>(`select state->>'board' from encounters where id = '${encounter}'`),
    ).toBe('newer')
    await asOwner()
    await db.exec(`
      update encounter_writer_leases set expires_at = now() - interval '1 second'
      where encounter_id = '${encounter}'
    `)
    await as(owner)
    expect(
      await value<{ status: string; revision: number }>(`
        select save_encounter_revision(
          '${owner}', '${encounter}', 2, '${secondWriter}', '{"board":"expired-self-renewal"}'::jsonb, now()
        )
      `),
    ).toEqual({ status: 'lease-lost', revision: 2 })
    expect(
      await value<{ status: string; revision: number }>(
        `select claim_encounter_writer('${encounter}', '${firstWriter}')`,
      ),
    ).toMatchObject({ status: 'acquired', revision: 2 })
    expect(
      await value<{ status: string; revision: number }>(`
        select save_encounter_revision(
          '${owner}', '${encounter}', 2, '${secondWriter}', '{"board":"expired-lease"}'::jsonb, now()
        )
      `),
    ).toEqual({ status: 'lease-lost', revision: 2 })
    await asOwner()
    expect(
      await value<boolean>(`
        select checkpoint from encounter_revisions
        where encounter_id = '${encounter}' and revision = 1
      `),
    ).toBe(true)
  })

  it('keeps the latest ten revisions and every revision from the previous seven days', async () => {
    const owner = '11111111-1111-1111-1111-111111111116'
    const encounter = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaae'
    const writer = 'cccccccc-3333-4333-8333-cccccccccccc'
    await asOwner()
    await db.exec(`
      insert into auth.users (id) values ('${owner}');
      insert into encounters (id, owner_id, state)
        values ('${encounter}', '${owner}', '{}'::jsonb);
    `)
    await as(owner)
    await db.exec(`select claim_encounter_writer('${encounter}', '${writer}')`)
    for (let revision = 0; revision < 19; revision += 1) {
      const outcome = await value<{ status: string; revision: number }>(`
        select save_encounter_revision(
          '${owner}', '${encounter}', ${revision}, '${writer}', '{"revision":${revision + 1}}'::jsonb, now()
        )
      `)
      expect(outcome).toMatchObject({ status: 'saved', revision: revision + 1 })
    }

    await asOwner()
    await db.exec(`
      update encounter_revisions set created_at = now() - interval '10 days'
      where encounter_id = '${encounter}' and revision not in (3, 18, 19)
    `)
    await as(owner)
    await db.exec(`
      select save_encounter_revision(
        '${owner}', '${encounter}', 19, '${writer}', '{"revision":20}'::jsonb, now()
      )
    `)
    await asOwner()
    const revisions = await db.query<{ revision: number }>(`
      select revision from encounter_revisions
      where encounter_id = '${encounter}' order by revision
    `)
    expect(revisions.rows.map(({ revision }) => Number(revision))).toEqual([
      3, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    ])
  })

  it('keeps revision authority out of direct client table grants', async () => {
    expect(
      await value<boolean>(
        `select has_column_privilege('authenticated', 'encounters', 'state', 'update')`,
      ),
    ).toBe(false)
    expect(
      await value<boolean>(
        `select has_column_privilege('authenticated', 'encounters', 'player_code', 'update')`,
      ),
    ).toBe(true)
    expect(
      await value<boolean>(
        `select has_table_privilege('authenticated', 'encounter_revisions', 'select')`,
      ),
    ).toBe(false)
    expect(
      await value<boolean>(
        `select has_table_privilege('authenticated', 'encounter_writer_leases', 'select')`,
      ),
    ).toBe(false)
  })

  it('keeps one live encounter per owner and share ownership required', async () => {
    expect(
      await value<boolean>(`
        select indisunique from pg_index
        where indexrelid = 'encounters_one_live_per_owner'::regclass
      `),
    ).toBe(true)
    expect(
      await value<boolean>(`
        select attnotnull from pg_attribute
        where attrelid = 'shares'::regclass and attname = 'owner_id'
      `),
    ).toBe(true)
  })

  it('rotates and revokes only an encounter owner’s live-view capability', async () => {
    const first = '11111111-1111-1111-1111-111111111113'
    const second = '22222222-2222-2222-2222-222222222223'
    const encounter = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    await asOwner()
    await db.exec(`
      insert into auth.users (id) values ('${first}'), ('${second}');
      insert into encounters (id, owner_id, state, player_code)
        values ('${encounter}', '${first}', '{}'::jsonb, 'tuesday-game');
    `)

    await as(first)
    expect(
      await value<number>(
        `select start_live_view('${encounter}', 'tuesday-game', '${'a'.repeat(64)}')`,
      ),
    ).toBe(1)
    expect(
      await value<number>(
        `select start_live_view('${encounter}', 'tuesday-game', '${'b'.repeat(64)}')`,
      ),
    ).toBe(2)
    expect(await value<boolean>(`select stop_live_view('${'a'.repeat(64)}')`)).toBe(false)

    await as(second)
    await expect(
      db.exec(`select start_live_view('${encounter}', 'stolen', '${'c'.repeat(64)}')`),
    ).rejects.toThrow(/owned live encounter/)

    await as(first)
    expect(await value<boolean>(`select stop_live_view('${'b'.repeat(64)}')`)).toBe(true)
    expect(
      await value<number>(
        `select start_live_view('${encounter}', 'tuesday-game', '${'c'.repeat(64)}')`,
      ),
    ).toBe(1)
    expect(
      await value<boolean>(`select live_view_topic_active('player:${'c'.repeat(64)}:arbitrary')`),
    ).toBe(false)
    expect(
      await value<boolean>(`select live_view_topic_owned('player:${'c'.repeat(64)}:arbitrary')`),
    ).toBe(false)
    expect(await value<boolean>(`select stop_all_live_views()`)).toBe(true)
    expect(
      await value<boolean>(`select live_view_topic_active('player:${'c'.repeat(64)}:lobby')`),
    ).toBe(false)
    await asOwner()
  })

  it('separates viewer reads and presence from owner-only broadcasts', async () => {
    const policies = await db.query<{ policyname: string; roles: string[]; cmd: string }>(`
      select policyname, roles, cmd from pg_policies
      where schemaname = 'realtime' and tablename = 'messages'
      order by policyname
    `)

    expect(policies.rows.map(({ policyname, cmd }) => [policyname, cmd])).toEqual([
      ['live viewers announce presence', 'INSERT'],
      ['live viewers receive traffic', 'SELECT'],
      ['owners publish live traffic', 'INSERT'],
    ])

    const owner = '11111111-1111-1111-1111-111111111114'
    const otherOwner = '22222222-2222-2222-2222-222222222224'
    const encounter = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab'
    const otherEncounter = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac'
    const active = 'e'.repeat(64)
    const other = 'f'.repeat(64)
    await asOwner()
    await db.exec(`
      insert into auth.users (id) values ('${owner}'), ('${otherOwner}');
      insert into encounters (id, owner_id, state, player_code) values
        ('${encounter}', '${owner}', '{}'::jsonb, 'viewer-test'),
        ('${otherEncounter}', '${otherOwner}', '{}'::jsonb, 'other-viewer-test');
    `)
    await as(owner)
    await db.exec(`select start_live_view('${encounter}', 'viewer-test', '${active}')`)
    await db.exec(`select set_config('realtime.topic', 'player:${active}:lobby', false)`)
    await db.exec(`
      insert into realtime.messages (topic, extension, event)
      values ('player:${active}:lobby', 'broadcast', 'visible')
    `)
    await as(otherOwner)
    await db.exec(`select start_live_view('${otherEncounter}', 'other-viewer-test', '${other}')`)
    await db.exec(`select set_config('realtime.topic', 'player:${other}:lobby', false)`)
    await expect(
      db.exec(`
        insert into realtime.messages (topic, extension, event)
        values ('player:${active}:lobby', 'broadcast', 'cross-topic-owner')
      `),
    ).rejects.toThrow()
    await db.exec(`
      insert into realtime.messages (topic, extension, event)
      values ('player:${other}:lobby', 'broadcast', 'other-visible')
    `)

    await db.exec('set role anon')
    await db.exec(`select set_config('realtime.topic', 'player:${active}:join', false)`)
    await expect(
      db.exec(`
        insert into realtime.messages (topic, extension, event)
        values ('player:${other}:join', 'presence', 'cross-topic-viewer')
      `),
    ).rejects.toThrow()
    await db.exec(`select set_config('realtime.topic', 'player:${active}:lobby', false)`)
    expect(await value<string>(`select event from realtime.messages`)).toBe('visible')
    await db.exec(`select set_config('realtime.topic', 'player:${other}:lobby', false)`)
    expect(await value<string>(`select event from realtime.messages`)).toBe('other-visible')
    await asOwner()
  })

  it('removes an account and every owner-linked row through the public function', async () => {
    const owner = '11111111-1111-1111-1111-111111111111'
    await asOwner()
    await db.exec(`
      insert into auth.users (id, email) values ('${owner}', 'owner@example.test');
      insert into campaigns (owner_id, data) values ('${owner}', '{}'::jsonb);
      insert into creatures (owner_id, name, data) values ('${owner}', 'Fixture', '{}'::jsonb);
      insert into encounters (id, owner_id, state, player_code)
        values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '${owner}', '{}'::jsonb, 'delete-live');
      insert into live_view_sessions (owner_id, encounter_id, code, capability_hash)
        values ('${owner}', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'delete-live', '${'d'.repeat(64)}');
      insert into shares (owner_id, code, kind, data)
        values ('${owner}', 'fixture001', 'encounter', '{}'::jsonb);
      select set_config('request.jwt.claim.sub', '${owner}', false);
      select delete_account();
    `)

    expect(await value<number>(`select count(*)::int from auth.users where id = '${owner}'`)).toBe(
      0,
    )
    expect(
      await value<number>(`select count(*)::int from shares where owner_id = '${owner}'`),
    ).toBe(0)
    expect(
      await value<number>(
        `select count(*)::int from live_view_sessions where owner_id = '${owner}'`,
      ),
    ).toBe(0)
  })
})

describe('forward revision migration', () => {
  it('checkpoints every existing live cloud copy as revision zero', async () => {
    const recovery = await new PGlite()
    await recovery.exec(SUPABASE_STUB)
    for (const migration of migrationFiles.slice(0, -1)) {
      await recovery.exec(readFileSync(`${migrationsDirectory}/${migration}`, 'utf8'))
    }
    const owner = '11111111-1111-1111-1111-111111111117'
    const encounter = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaf'
    await recovery.exec(`
      insert into auth.users (id) values ('${owner}');
      insert into encounters (id, owner_id, state, updated_at)
        values (
          '${encounter}',
          '${owner}',
          '{"board":"before-migration"}'::jsonb,
          '2026-08-31T12:00:00.000Z'
        );
    `)
    await recovery.exec(readFileSync(`${migrationsDirectory}/${migrationFiles.at(-1)}`, 'utf8'))

    const result = await recovery.query<{
      revision: number
      state: { board: string }
      checkpoint: boolean
      created_at: string
    }>(`
      select revision, state, checkpoint, created_at
      from encounter_revisions where encounter_id = '${encounter}'
    `)
    expect(result.rows).toMatchObject([
      {
        revision: 0,
        state: { board: 'before-migration' },
        checkpoint: true,
      },
    ])
    expect(new Date(result.rows[0].created_at).toISOString()).toBe('2026-08-31T12:00:00.000Z')
  })
})

describe('break-glass reconciliation', () => {
  it('blocks the cutover until ownerless rows are reviewed, then applies forward', async () => {
    const recovery = await new PGlite()
    await recovery.exec(SUPABASE_STUB)
    for (const migration of migrationFiles.slice(0, -1)) {
      await recovery.exec(readFileSync(`${migrationsDirectory}/${migration}`, 'utf8'))
    }

    await recovery.exec(`alter table shares alter column owner_id drop not null`)
    await recovery.exec(
      `insert into shares (code, kind, data) values ('legacy001', 'encounter', '{}')`,
    )
    const cutover = readFileSync(
      `${migrationsDirectory}/20260901000600_authority_cutover.sql`,
      'utf8',
    )

    await expect(recovery.exec(cutover)).rejects.toThrow(/Ownerless shares must be reviewed/)
    await recovery.exec(`delete from shares where code = 'legacy001'`)
    await expect(recovery.exec(cutover)).resolves.toBeDefined()
    const ownerRequired = await recovery.query<{ attnotnull: boolean }>(`
      select attnotnull from pg_attribute
      where attrelid = 'shares'::regclass and attname = 'owner_id'
    `)
    expect(ownerRequired.rows[0].attnotnull).toBe(true)
  })
})
