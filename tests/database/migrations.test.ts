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
      'encounters',
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

  it('fixes every security-definer search path and restricts execution', async () => {
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
    expect(
      await value<boolean>(`select has_function_privilege('anon', 'delete_account()', 'execute')`),
    ).toBe(false)
    expect(
      await value<boolean>(`select has_function_privilege('anon', 'share(text)', 'execute')`),
    ).toBe(true)
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

  it('removes an account and every owner-linked row through the public function', async () => {
    const owner = '11111111-1111-1111-1111-111111111111'
    await asOwner()
    await db.exec(`
      insert into auth.users (id, email) values ('${owner}', 'owner@example.test');
      insert into campaigns (owner_id, data) values ('${owner}', '{}'::jsonb);
      insert into creatures (owner_id, name, data) values ('${owner}', 'Fixture', '{}'::jsonb);
      insert into encounters (owner_id, state) values ('${owner}', '{}'::jsonb);
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
