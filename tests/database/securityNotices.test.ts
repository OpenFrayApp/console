// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, expect, it } from 'vitest'

let db: PGlite
const operator = '11111111-1111-4111-8111-111111111111'
const affected = '22222222-2222-4222-8222-222222222222'
const other = '33333333-3333-4333-8333-333333333333'
const incident = '44444444-4444-4444-8444-444444444444'
const digest = 'a'.repeat(64)

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key,email text,created_at timestamptz default now());
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
    create table public.capabilities(capability text primary key,description text);
    create table public.role_capabilities(role text,capability text,primary key(role,capability));
    create function public.may(text) returns boolean language sql as $$ select auth.uid()='${operator}' $$;
  `)
  for (const file of [
    '20261008062712_account_mail.sql',
    '20261008074324_legal_publications.sql',
    '20261008092503_security_notices.sql',
  ])
    await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'))
  await db.exec(
    `insert into auth.users(id,email) values ('${operator}','operator@example.test'),('${affected}','affected@example.test'),('${other}','other@example.test'); delete from account_mail.ledger; set role authenticated; set test.uid='${operator}'`,
  )
})
afterEach(async () => {
  await db.close()
})

/** Preview one immutable incident against an explicit selected account set. */
async function preview(accounts = [affected]) {
  return db.query('select public.preview_security_notice($1,$2,$3,$4,$5) result', [
    incident,
    digest,
    incident,
    other,
    accounts,
  ])
}
/** Confirm precisely the reviewed facts and affected accounts. */
async function confirm(hash = digest, accounts = [affected]) {
  return db.query('select public.confirm_security_notice($1,$2,$3,$4) result', [
    incident,
    hash,
    accounts,
    true,
  ])
}

it('requires preview and confirms only the selected accounts with durable replay protection', async () => {
  await expect(confirm()).rejects.toThrow(/Review required/)
  expect((await preview()).rows).toEqual([{ result: 1 }])
  await expect(confirm('b'.repeat(64))).rejects.toThrow(/Review changed/)
  await expect(confirm(digest, [other])).rejects.toThrow(/Review changed/)
  expect((await confirm()).rows).toEqual([{ result: 'queued' }])
  expect((await confirm()).rows).toEqual([{ result: 'already_confirmed' }])
  await db.exec('reset role; set role service_role')
  const jobs = (await db.query('select * from public.claim_account_mail()')).rows
  expect(jobs).toMatchObject([
    {
      recipient: 'affected@example.test',
      template: `openfray-security-v1-${digest}`,
      template_id: incident,
      template_revision: other,
    },
  ])
  await db.exec('reset role')
  expect((await db.query('select owner_id,event from account_mail.ledger')).rows).toEqual([
    { owner_id: affected, event: `security/${incident}` },
  ])
  await db.exec(`delete from auth.users where id='${affected}'`)
  expect((await db.query('select * from account_mail.queue')).rows).toEqual([])
  expect((await db.query('select * from account_mail.ledger')).rows).toEqual([])
})

it('denies account holders and anonymous callers before resolving recipients', async () => {
  await db.exec(`set test.uid='${other}'`)
  await expect(preview()).rejects.toThrow(/Unauthorized/)
  await expect(confirm()).rejects.toThrow(/Unauthorized/)
  await db.exec('reset role; set role anon')
  await expect(preview()).rejects.toThrow(/permission denied/)
})

it('rejects incomplete, duplicate, unknown, deleted, and expired selections', async () => {
  await expect(preview([])).rejects.toThrow(/Invalid review/)
  await expect(preview([affected, affected])).rejects.toThrow(/Invalid review/)
  await expect(preview([incident])).rejects.toThrow(/Invalid selection/)
  await preview()
  await db.exec(`reset role; delete from auth.users where id='${affected}'; set role authenticated`)
  await expect(confirm()).rejects.toThrow(/Review changed/)
})

it('fences expired previews and refuses changed incident versions', async () => {
  await preview()
  await expect(
    db.query('select public.preview_security_notice($1,$2,$3,$4,$5)', [
      incident,
      'b'.repeat(64),
      incident,
      other,
      [affected],
    ]),
  ).rejects.toThrow(/Review changed/)
  await db.exec(
    "reset role; update account_mail.security_notices set expires_at=now()-interval '1 second'; set role authenticated",
  )
  await expect(confirm()).rejects.toThrow(/Review expired/)
})

it('requires explicit review confirmation and removes drafts when the reviewing account is erased', async () => {
  await preview()
  await expect(
    db.query('select public.confirm_security_notice($1,$2,$3,false)', [
      incident,
      digest,
      [affected],
    ]),
  ).rejects.toThrow(/Review changed/)
  await db.exec(`reset role; delete from auth.users where id='${operator}'`)
  expect((await db.query('select * from account_mail.security_recipients')).rows).toEqual([])
  expect((await db.query('select * from account_mail.security_notices')).rows).toEqual([])
})

it.each(['anon', 'authenticated', 'service_role'])(
  'keeps security review records private from %s',
  async (role) => {
    await db.exec(`reset role; set role ${role}`)
    await expect(db.query('select * from account_mail.security_notices')).rejects.toThrow(
      /permission denied/,
    )
    await expect(db.query('select * from account_mail.security_recipients')).rejects.toThrow(
      /permission denied/,
    )
  },
)
