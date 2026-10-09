// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, expect, it } from 'vitest'

let db: PGlite
const account = '11111111-1111-4111-8111-111111111111'
const migration = 'supabase/migrations/20261008135619_account_mail_v3_cutover.sql'

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key,email text,created_at timestamptz default now());
    create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
    create table public.capabilities(capability text primary key,description text);
    create table public.role_capabilities(role text,capability text,primary key(role,capability));
    create function public.may(text) returns boolean language sql as $$ select false $$;
  `)
  for (const file of [
    '20261008062712_account_mail.sql',
    '20261008074324_legal_publications.sql',
    '20261008092503_security_notices.sql',
  ])
    await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'))
})
afterEach(async () => {
  await db.close()
})

/** Invoke the shared lease as the restricted worker role. */
async function claim() {
  await db.exec('set role service_role')
  try {
    return (
      await db.query<{ id: string; claim: string; template: string }>(
        'select * from public.claim_account_mail()',
      )
    ).rows
  } finally {
    await db.exec('reset role')
  }
}

it('queues v3 for new accounts while retaining the original historical-account cutoff', async () => {
  await db.exec(readFileSync(migration, 'utf8'))
  await db.exec(`insert into auth.users(id,email,created_at) values
    ('${account}','new@example.test',now()),
    (gen_random_uuid(),'restored@example.test',now()-interval '1 year')`)
  expect(await claim()).toMatchObject([{ template: 'openfray-welcome-v3' }])
})

it('quarantines pending legacy identities without rewriting attempts or accepted history', async () => {
  await db.exec(`insert into auth.users(id,email) values ('${account}','new@example.test')`)
  const jobs = await claim()
  const job = jobs[0]
  await db.query('select public.prepare_account_mail($1,$2,$3)', [
    job.id,
    job.claim,
    'a'.repeat(64),
  ])
  await db.exec(`insert into auth.users(id,email) values
    ('22222222-2222-4222-8222-222222222222','accepted@example.test');
    update account_mail.ledger set state='accepted' where id<>'${job.id}';
    delete from account_mail.queue where id<>'${job.id}'`)
  await db.exec(readFileSync(migration, 'utf8'))
  expect(await claim()).toEqual([])
  expect(
    (
      await db.query(
        'select id,template,state,attempts,uncertain,in_flight,failure from account_mail.ledger where id=$1',
        [job.id],
      )
    ).rows,
  ).toEqual([
    {
      id: job.id,
      template: 'openfray-welcome-v1',
      state: 'reconcile',
      attempts: 1,
      uncertain: true,
      in_flight: false,
      failure: 'template_cutover',
    },
  ])
  expect(
    (await db.query("select template,state from account_mail.ledger where state='accepted'")).rows,
  ).toEqual([{ template: 'openfray-welcome-v1', state: 'accepted' }])
  expect((await db.query('select * from account_mail.queue')).rows).toEqual([])
  await db.exec(`delete from auth.users where id='${account}'`)
  expect((await db.query('select id from account_mail.ledger where id=$1', [job.id])).rows).toEqual(
    [],
  )
})

it('registers v3 legal notices without resetting notified dates or replaying historical publications', async () => {
  await db.exec(
    `insert into auth.users(id,email,created_at) values ('${account}','new@example.test',now()-interval '1 day'); set role service_role`,
  )
  await db.query('select public.register_legal_publication($1,now(),$2,$3,true)', [
    'a'.repeat(40),
    '2026-01-01',
    '2026-01-01',
  ])
  await db.exec('reset role')
  await db.exec(readFileSync(migration, 'utf8'))
  await db.exec('set role service_role')
  expect(
    (
      await db.query('select public.register_legal_publication($1,now(),$2,$3,false) result', [
        'b'.repeat(40),
        '2026-01-02',
        '2026-01-01',
      ])
    ).rows,
  ).toEqual([{ result: 'terms' }])
  expect(
    (
      await db.query('select public.register_legal_publication($1,now(),$2,$3,false) result', [
        'b'.repeat(40),
        '2026-01-02',
        '2026-01-01',
      ])
    ).rows,
  ).toEqual([{ result: 'terms' }])
  await db.exec('reset role')
  expect(await claim()).toMatchObject([
    { template: 'openfray-terms-v3', terms_date: '2026-01-02', privacy_date: null },
  ])
  expect((await db.query('select count(*)::integer count from account_mail.ledger')).rows).toEqual([
    { count: 1 },
  ])
})

it.each(['anon', 'authenticated', 'service_role'])(
  'preserves %s denial of private tables and enqueue helpers after cutover',
  async (role) => {
    await db.exec(readFileSync(migration, 'utf8'))
    await db.exec(`set role ${role}`)
    await expect(db.query('select * from account_mail.ledger')).rejects.toThrow(/permission denied/)
    await expect(db.query('select account_mail.on_account_created()')).rejects.toThrow(
      /permission denied/,
    )
    if (role !== 'service_role')
      await expect(db.query('select * from public.claim_account_mail()')).rejects.toThrow(
        /permission denied/,
      )
  },
)
