// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, expect, it } from 'vitest'

let db: PGlite
const existing = '11111111-1111-4111-8111-111111111111'
const publishedAt = new Date(Date.now() - 1000).toISOString()

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key,email text,created_at timestamptz default now());
    insert into auth.users values ('${existing}','existing@example.test',now()-interval '1 year');
  `)
  for (const file of readdirSync('supabase/migrations')
    .filter((file) => /_(account_mail|legal_publications)\.sql$/.test(file))
    .sort())
    await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'))
})
afterEach(async () => {
  await db.close()
})

/** Register a synthetic verified publication through the restricted server RPC. */
async function publish(
  terms = '2026-10-08',
  privacy = '2026-10-08',
  baseline = false,
  revision = 'b'.repeat(40),
) {
  await db.exec('set role service_role')
  try {
    return (
      await db.query<{ result: string }>(
        'select public.register_legal_publication($1,$2,$3,$4,$5) result',
        [revision, publishedAt, terms, privacy, baseline],
      )
    ).rows[0].result
  } finally {
    await db.exec('reset role')
  }
}

it.each([
  ['2026-10-08', '2026-10-07', 'terms', 'openfray-terms-v1'],
  ['2026-10-07', '2026-10-08', 'privacy', 'openfray-privacy-v1'],
  ['2026-10-08', '2026-10-08', 'combined', 'openfray-legal-v1'],
])(
  'snapshots one %s / %s notice per existing eligible account',
  async (terms, privacy, result, template) => {
    await publish('2026-10-07', '2026-10-07', true, 'a'.repeat(40))
    expect(await publish(terms, privacy)).toBe(result)
    const jobs = (await db.query('select * from public.claim_account_mail()')).rows
    expect(jobs).toHaveLength(1)
    expect(jobs[0]).toMatchObject({
      recipient: 'existing@example.test',
      template,
      terms_date: result === 'privacy' ? null : terms,
      privacy_date: result === 'terms' ? null : privacy,
    })
    await db.exec(`insert into auth.users values(gen_random_uuid(),'later@example.test',now())`)
    expect(
      (
        await db.query(
          "select count(*)::integer total from account_mail.ledger where event <> 'welcome'",
        )
      ).rows,
    ).toEqual([{ total: 1 }])
  },
)

it('suppresses content edits, repeated deployments, same-date edits, and already-notified rollbacks independently', async () => {
  await publish('2026-10-07', '2026-10-07', true, 'a'.repeat(40))
  expect(await publish('2026-10-07', '2026-10-07')).toBe('unchanged')
  expect(await publish('2026-10-08', '2026-10-07', false, 'c'.repeat(40))).toBe('terms')
  expect(await publish('2026-10-08', '2026-10-07', false, 'c'.repeat(40))).toBe('terms')
  expect(await publish('2026-10-08', '2026-10-07', false, 'd'.repeat(40))).toBe('unchanged')
  expect(await publish('2026-10-07', '2026-10-08', false, 'e'.repeat(40))).toBe('privacy')
  expect(await publish('2026-10-07', '2026-10-07', false, 'f'.repeat(40))).toBe('unchanged')
  expect((await db.query('select count(*)::integer total from account_mail.ledger')).rows).toEqual([
    { total: 2 },
  ])
  await expect(publish('2026-10-08', '2026-10-08', false, 'c'.repeat(40))).rejects.toThrow(
    /identity changed/,
  )
  await expect(publish('2026-10-08', '2026-10-08', true, '0'.repeat(40))).rejects.toThrow(
    /already initialized/,
  )
})

it('skips later accounts and unusable addresses, then erases queued notices when an account is deleted', async () => {
  await publish('2026-10-07', '2026-10-07', true, 'a'.repeat(40))
  await db.exec(`insert into auth.users values
    (gen_random_uuid(),'late@example.test',now()),
    (gen_random_uuid(),'bad,address@example.test',now()-interval '1 year')`)
  await publish()
  const jobs = [
    ...(
      await db.query<{ id: string; claim: string; recipient: string }>(
        'select * from public.claim_account_mail()',
      )
    ).rows,
    ...(
      await db.query<{ id: string; claim: string; recipient: string }>(
        'select * from public.claim_account_mail()',
      )
    ).rows,
  ]
  const job = jobs.find((row) => row.recipient === 'existing@example.test')!
  await db.exec(`delete from auth.users where id='${existing}'`)
  expect(
    (
      await db.query('select public.prepare_account_mail($1,$2,$3) ready', [
        job.id,
        job.claim,
        'a'.repeat(64),
      ])
    ).rows,
  ).toEqual([{ ready: false }])
  expect((await db.query("select * from account_mail.ledger where event<>'welcome'")).rows).toEqual(
    [],
  )
  expect(
    (await db.query('select count(*)::integer total from account_mail.legal_history')).rows,
  ).toEqual([{ total: 4 }])
})

it.each(['anon', 'authenticated', 'service_role'])(
  'denies %s direct publication history access and unauthorized registration',
  async (role) => {
    await db.exec(`set role ${role}`)
    for (const table of ['legal_state', 'legal_history', 'legal_publications'])
      await expect(db.query(`select * from account_mail.${table}`)).rejects.toThrow(
        /permission denied/,
      )
    if (role !== 'service_role')
      await expect(
        db.query('select public.register_legal_publication($1,$2,$3,$4,true)', [
          'a'.repeat(40),
          publishedAt,
          '2026-10-07',
          '2026-10-07',
        ]),
      ).rejects.toThrow(/permission denied/)
  },
)

it('pauses new registration after recovery until missing publication history is reconciled', async () => {
  await publish('2026-10-07', '2026-10-07', true, 'a'.repeat(40))
  await db.exec(readFileSync('supabase/snippets/quarantine-account-mail-recovery.sql', 'utf8'))
  await expect(publish()).rejects.toThrow(/recovery reconciliation/)
  expect((await db.query('select * from public.claim_account_mail()')).rows).toEqual([])
})

it('requires an explicit first baseline and queues no historical notices', async () => {
  await expect(publish()).rejects.toThrow(/baseline/i)
  expect(await publish('2026-10-07', '2026-10-07', true, 'a'.repeat(40))).toBe('baseline')
  expect((await db.query('select * from public.claim_account_mail()')).rows).toEqual([])
})
