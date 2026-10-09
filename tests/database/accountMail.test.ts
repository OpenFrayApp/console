// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, expect, it } from 'vitest'

let db: PGlite
const account = '11111111-1111-4111-8111-111111111111'

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users (id uuid primary key, email text, last_sign_in_at timestamptz,
      raw_app_meta_data jsonb default '{}'::jsonb, created_at timestamptz default now());
    insert into auth.users (id,email) values ('22222222-2222-4222-8222-222222222222', 'old@example.test');
  `)
  await db.exec(readFileSync('supabase/migrations/20261008062712_account_mail.sql', 'utf8'))
})

afterEach(async () => {
  await db.close()
})

/** Claim the next job with the worker's restricted API role. */
async function claim() {
  await db.exec('set role service_role')
  try {
    return (
      await db.query<{ id: string; claim: string; recipient: string; template: string }>(
        'select * from public.claim_account_mail()',
      )
    ).rows[0]
  } finally {
    await db.exec('reset role')
  }
}

it('leases one job, persists provider acceptance, and erases both records with the account', async () => {
  await db.exec(`insert into auth.users (id,email) values ('${account}','new@example.test')`)
  const job = await claim()
  expect(job).toMatchObject({ recipient: 'new@example.test', template: 'openfray-welcome-v1' })
  expect(await claim()).toBeUndefined()
  await db.exec('set role service_role')
  expect(
    (
      await db.query('select public.prepare_account_mail($1,$2,$3) ready', [
        job.id,
        job.claim,
        'a'.repeat(64),
      ])
    ).rows,
  ).toEqual([{ ready: true }])
  await db.query('select public.finish_account_mail($1,$2,$3,$4)', [
    job.id,
    job.claim,
    'accepted',
    '33333333-3333-4333-8333-333333333333',
  ])
  await db.exec('reset role')
  expect(await claim()).toBeUndefined()
  expect((await db.query('select state, attempts from account_mail.ledger')).rows).toEqual([
    { state: 'accepted', attempts: 1 },
  ])
  await db.exec(`delete from auth.users where id='${account}'`)
  expect((await db.query('select * from account_mail.ledger')).rows).toEqual([])
  expect((await db.query('select * from account_mail.queue')).rows).toEqual([])
})

it.each(['anon', 'authenticated', 'service_role'])(
  'denies %s direct queue access and arbitrary enqueue',
  async (role) => {
    await db.exec(`set role ${role}`)
    await expect(db.query('select * from account_mail.queue')).rejects.toThrow(/permission denied/)
    await expect(
      db.query('insert into account_mail.ledger(owner_id,event,template) values ($1,$2,$3)', [
        account,
        'welcome',
        'openfray-welcome-v1',
      ]),
    ).rejects.toThrow(/permission denied/)
    if (role !== 'service_role') {
      await expect(db.query('select * from public.claim_account_mail()')).rejects.toThrow(
        /permission denied/,
      )
      await expect(
        db.query('select public.prepare_account_mail($1,$2,$3)', [
          account,
          account,
          'a'.repeat(64),
        ]),
      ).rejects.toThrow(/permission denied/)
      await expect(
        db.query('select public.finish_account_mail($1,$2,$3)', [account, account, 'accepted']),
      ).rejects.toThrow(/permission denied/)
    }
  },
)

it('keeps the durable event identity after acceptance and drops recipient-derived hashes', async () => {
  await db.exec(`insert into auth.users (id,email) values ('${account}','new@example.test')`)
  const job = await claim()
  await db.query('select public.prepare_account_mail($1,$2,$3)', [
    job.id,
    job.claim,
    'a'.repeat(64),
  ])
  await db.query('select public.finish_account_mail($1,$2,$3,$4)', [
    job.id,
    job.claim,
    'accepted',
    account,
  ])
  await expect(
    db.query('insert into account_mail.ledger(owner_id,event,template) values ($1,$2,$3)', [
      account,
      'welcome',
      'openfray-welcome-v1',
    ]),
  ).rejects.toThrow(/unique constraint/)
  expect((await db.query('select request_hash from account_mail.ledger')).rows).toEqual([
    { request_hash: null },
  ])
})

it.each(['ambiguous', 'transient'])(
  'reclaims an expired lease with a stable request after %s, fencing stale workers',
  async (outcome) => {
    await db.exec(`insert into auth.users (id,email) values ('${account}','new@example.test')`)
    const first = await claim()
    await db.query('select public.prepare_account_mail($1,$2,$3)', [
      first.id,
      first.claim,
      'a'.repeat(64),
    ])
    await db.query('select public.finish_account_mail($1,$2,$3)', [first.id, first.claim, outcome])
    expect(await claim()).toBeUndefined()
    await db.exec(
      `update account_mail.queue set due_at=now()-interval '1 second'; update auth.users set email='changed@example.test'`,
    )
    const retry = await claim()
    expect(retry.recipient).toBe('new@example.test')
    expect(retry.id).toBe(first.id)
    expect(retry.claim).not.toBe(first.claim)
    expect(
      (
        await db.query('select public.prepare_account_mail($1,$2,$3) ready', [
          retry.id,
          first.claim,
          'a'.repeat(64),
        ])
      ).rows,
    ).toEqual([{ ready: false }])
    expect(
      (
        await db.query('select public.finish_account_mail($1,$2,$3,$4) ready', [
          first.id,
          first.claim,
          'accepted',
          account,
        ])
      ).rows,
    ).toEqual([{ ready: false }])
    expect(
      (
        await db.query('select public.prepare_account_mail($1,$2,$3) ready', [
          retry.id,
          retry.claim,
          'a'.repeat(64),
        ])
      ).rows,
    ).toEqual([{ ready: true }])
  },
)

it('requires reconciliation when an uncertain attempt outlives the provider window', async () => {
  await db.exec(`insert into auth.users (id,email) values ('${account}','new@example.test')`)
  const first = await claim()
  await db.query('select public.prepare_account_mail($1,$2,$3)', [
    first.id,
    first.claim,
    'a'.repeat(64),
  ])
  await db.exec(
    `update account_mail.ledger set first_attempt_at=now()-interval '25 hours'; update account_mail.queue set lease_until=now()-interval '1 second'`,
  )
  expect(await claim()).toBeUndefined()
  expect(
    (await db.query('select state,failure,request_hash from account_mail.ledger')).rows,
  ).toEqual([{ state: 'reconcile', failure: 'window_expired', request_hash: null }])
  expect((await db.query('select * from account_mail.queue')).rows).toEqual([])
})

it('stops after six ambiguous attempts and never sends a changed retry payload', async () => {
  await db.exec(`insert into auth.users (id,email) values ('${account}','new@example.test')`)
  for (let attempt = 0; attempt < 6; attempt++) {
    const job = await claim()
    expect(job).toBeDefined()
    await db.query('select public.prepare_account_mail($1,$2,$3)', [
      job.id,
      job.claim,
      'a'.repeat(64),
    ])
    await db.query('select public.finish_account_mail($1,$2,$3)', [job.id, job.claim, 'ambiguous'])
    await db.exec(`update account_mail.queue set due_at=now()-interval '1 second'`)
  }
  expect(await claim()).toBeUndefined()
  expect((await db.query('select state,attempts from account_mail.ledger')).rows).toEqual([
    { state: 'reconcile', attempts: 6 },
  ])
})

it('preserves unresolved uncertainty when later retries receive definitive rate limits', async () => {
  await db.exec(`insert into auth.users(id,email) values ('${account}','new@example.test')`)
  for (let attempt = 0; attempt < 6; attempt++) {
    const job = await claim()
    await db.query('select public.prepare_account_mail($1,$2,$3)', [
      job.id,
      job.claim,
      'a'.repeat(64),
    ])
    await db.query('select public.finish_account_mail($1,$2,$3)', [
      job.id,
      job.claim,
      attempt === 0 ? 'ambiguous' : 'transient',
    ])
    await db.exec(`update account_mail.queue set due_at=now()-interval '1 second'`)
  }
  expect((await db.query('select state from account_mail.ledger')).rows).toEqual([
    { state: 'reconcile' },
  ])
})

it.each(['ambiguous', 'crashed'])(
  'keeps %s uncertainty after a later rate limit and safe-window expiry',
  async (initial) => {
    await db.exec(`insert into auth.users(id,email) values ('${account}','new@example.test')`)
    const first = await claim()
    await db.query('select public.prepare_account_mail($1,$2,$3)', [
      first.id,
      first.claim,
      'a'.repeat(64),
    ])
    if (initial === 'ambiguous')
      await db.query('select public.finish_account_mail($1,$2,$3)', [
        first.id,
        first.claim,
        'ambiguous',
      ])
    await db.exec(
      `update account_mail.queue set due_at=now()-interval '1 second',lease_until=now()-interval '1 second'`,
    )
    const retry = await claim()
    await db.query('select public.prepare_account_mail($1,$2,$3)', [
      retry.id,
      retry.claim,
      'a'.repeat(64),
    ])
    await db.query('select public.finish_account_mail($1,$2,$3)', [
      retry.id,
      retry.claim,
      'transient',
    ])
    await db.exec(
      `update account_mail.queue set due_at=now()-interval '1 second'; update account_mail.ledger set first_attempt_at=now()-interval '25 hours'`,
    )
    expect(await claim()).toBeUndefined()
    expect((await db.query('select state,uncertain from account_mail.ledger')).rows).toEqual([
      { state: 'reconcile', uncertain: true },
    ])
  },
)

it('does not classify six definitive rate-limit rejections as uncertain', async () => {
  await db.exec(`insert into auth.users(id,email) values ('${account}','new@example.test')`)
  for (let attempt = 0; attempt < 6; attempt++) {
    const job = await claim()
    await db.query('select public.prepare_account_mail($1,$2,$3)', [
      job.id,
      job.claim,
      'a'.repeat(64),
    ])
    await db.query('select public.finish_account_mail($1,$2,$3)', [job.id, job.claim, 'transient'])
    await db.exec(`update account_mail.queue set due_at=now()-interval '1 second'`)
  }
  expect((await db.query('select state,uncertain from account_mail.ledger')).rows).toEqual([
    { state: 'failed', uncertain: false },
  ])
})

it('quarantines pending restored work, including jobs accepted after the backup snapshot', async () => {
  await db.exec(`insert into auth.users(id,email) values ('${account}','new@example.test')`)
  const before = (await db.query('select * from account_mail.ledger')).rows[0]
  const queue = (await db.query('select * from account_mail.queue')).rows[0]
  const job = await claim()
  await db.query('select public.prepare_account_mail($1,$2,$3)', [
    job.id,
    job.claim,
    'a'.repeat(64),
  ])
  await db.query('select public.finish_account_mail($1,$2,$3,$4)', [
    job.id,
    job.claim,
    'accepted',
    account,
  ])
  await db.exec(`delete from account_mail.ledger;`)
  await db.query(
    'insert into account_mail.ledger select * from jsonb_populate_record(null::account_mail.ledger,$1)',
    [JSON.stringify(before)],
  )
  await db.query(
    'insert into account_mail.queue select * from jsonb_populate_record(null::account_mail.queue,$1)',
    [JSON.stringify(queue)],
  )
  await db.exec(readFileSync('supabase/snippets/quarantine-account-mail-recovery.sql', 'utf8'))
  expect(await claim()).toBeUndefined()
  expect((await db.query('select state,failure from account_mail.ledger')).rows).toEqual([
    { state: 'reconcile', failure: 'recovery' },
  ])
  expect((await db.query('select * from account_mail.queue')).rows).toEqual([])
})

it('quarantines changed routing instead of reusing a key for a different payload', async () => {
  await db.exec(`insert into auth.users (id,email) values ('${account}','new@example.test')`)
  const job = await claim()
  await db.query('select public.prepare_account_mail($1,$2,$3)', [
    job.id,
    job.claim,
    'a'.repeat(64),
  ])
  await db.exec(`update account_mail.queue set lease_until=now()-interval '1 second'`)
  const retry = await claim()
  expect(
    (
      await db.query('select public.prepare_account_mail($1,$2,$3) ready', [
        retry.id,
        retry.claim,
        'b'.repeat(64),
      ])
    ).rows,
  ).toEqual([{ ready: false }])
  expect((await db.query('select state,failure from account_mail.ledger')).rows).toEqual([
    { state: 'reconcile', failure: 'payload_changed' },
  ])
})

it('rechecks unusable addresses and deletion before preparing an external send', async () => {
  await db.exec(
    `insert into auth.users (id,email) values ('${account}','new@example.test'); update auth.users set email=null`,
  )
  expect(await claim()).toBeUndefined()
  expect((await db.query('select state from account_mail.ledger')).rows).toEqual([
    { state: 'skipped' },
  ])
  await db.exec(
    `delete from auth.users; insert into auth.users (id,email) values ('${account}','new@example.test')`,
  )
  const job = await claim()
  await db.exec('delete from auth.users')
  expect(
    (
      await db.query('select public.prepare_account_mail($1,$2,$3) ready', [
        job.id,
        job.claim,
        'a'.repeat(64),
      ])
    ).rows,
  ).toEqual([{ ready: false }])
})

it('ignores historical account records replayed after migration installation', async () => {
  await db.exec(
    `insert into auth.users(id,email,created_at) values ('${account}','restored@example.test',now()-interval '1 year')`,
  )
  expect((await db.query('select * from account_mail.ledger')).rows).toEqual([])
})

it('queues only new accounts once, ignoring sign-ins, provider linking, and unusable addresses', async () => {
  await db.exec(`
    insert into auth.users (id,email) values ('${account}', 'new@example.test');
    update auth.users set last_sign_in_at=now(),raw_app_meta_data='{"providers":["google","discord"]}';
    insert into auth.users (id,email) values (gen_random_uuid(), null), (gen_random_uuid(), 'bad,address@example.test');
  `)
  const queued = await db.query('select event, owner_id, template from account_mail.ledger')
  expect(queued.rows).toEqual([
    { event: 'welcome', owner_id: account, template: 'openfray-welcome-v1' },
  ])
})
