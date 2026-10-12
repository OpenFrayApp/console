// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, expect, it } from 'vitest'

let db: PGlite
const owner = '11111111-1111-4111-8111-111111111111'
const other = '22222222-2222-4222-8222-222222222222'
const proof = 'a'.repeat(64)
const proofHash = createHash('sha256').update(proof).digest('hex')

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create role report_ingress;
    create schema auth;
    create table auth.users(id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $$;
    insert into auth.users values ('${owner}','Original@Example.test'),('${other}','other@example.test');
    grant usage on schema public to anon,authenticated,service_role,report_ingress;
  `)
  await db.exec(readFileSync('supabase/migrations/20261012112006_newsletter_signup.sql', 'utf8'))
})

afterEach(async () => {
  await db.close()
})

/** Execute the real RPC as its intended database actor. */
async function rpc(name: string, args: unknown[] = [], actor = 'service_role', uid = owner) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid])
  await db.exec(`set role ${actor}`)
  try {
    return (
      await db.query<Record<string, unknown>>(
        `select * from public.${name}(${args.map((_, i) => `$${i + 1}`).join(',')})`,
        args,
      )
    ).rows[0]
  } finally {
    await db.exec('reset role')
  }
}

/** Issue the one-use server capability for an explicit browser attempt. */
async function issue() {
  return rpc('issue_newsletter_signup_intent', [proofHash])
}

/** Consume an originating checked intent as the authenticated account. */
async function consume(intent: Record<string, unknown> | undefined, uid = owner) {
  return rpc('consume_newsletter_signup_intent', [intent?.capability, proof], 'authenticated', uid)
}

it('consumes only a matching attempt once and derives owner and email from Auth', async () => {
  const intent = await issue()
  expect(intent?.capability).toMatch(/^[a-f0-9]{64}$/)
  const result = await consume(intent)
  expect(result).toMatchObject({ status: 'ready' })
  expect(await consume(intent)).toEqual(result)
  expect(await consume(intent, other)).toMatchObject({ status: 'invalid', lifecycle: null })
  expect(
    (await db.query('select owner_id,email,source,wording_version from newsletter.subscriptions'))
      .rows,
  ).toEqual([
    {
      owner_id: owner,
      email: 'original@example.test',
      source: 'signup',
      wording_version: 'newsletter-signup-v1',
    },
  ])
  expect((await db.query('select count(*)::int count from newsletter.workflows')).rows).toEqual([
    { count: 1 },
  ])
})

it('requires an ineligible create then exact-id activation and never resets an accepted subscriber', async () => {
  const intent = await issue()
  const signup = await consume(intent)
  const create = await rpc('prepare_newsletter_signup', [signup?.lifecycle])
  expect(create).toMatchObject({
    action: 'create',
    recipient: 'original@example.test',
    attempt: 1,
    provider_id: null,
  })
  expect(await rpc('prepare_newsletter_signup', [signup?.lifecycle])).toBeUndefined()
  const provider = '33333333-3333-4333-8333-333333333333'
  expect(
    await rpc('finish_newsletter_signup', [
      create?.operation,
      create?.generation,
      'accepted',
      provider,
    ]),
  ).toMatchObject({ finish_newsletter_signup: true })
  expect(await consume(intent)).toMatchObject({ status: 'activate_ready' })
  const activate = await rpc('prepare_newsletter_signup', [signup?.lifecycle])
  expect(activate).toMatchObject({ action: 'activate', attempt: 1, provider_id: provider })
  expect(
    await rpc('finish_newsletter_signup', [
      activate?.operation,
      activate?.generation,
      'accepted',
      provider,
    ]),
  ).toMatchObject({ finish_newsletter_signup: true })
  expect(await consume(intent)).toMatchObject({ status: 'subscribed' })
  expect(await consume(await issue())).toEqual({
    lifecycle: signup?.lifecycle,
    status: 'subscribed',
  })
  expect(await rpc('prepare_newsletter_signup', [signup?.lifecycle])).toBeUndefined()
})

it('fences old callbacks and retains unknown creates across erasure until a post-settlement deletion', async () => {
  const intent = await issue()
  const unused = await issue()
  const signup = await consume(intent)
  const create = await rpc('prepare_newsletter_signup', [signup?.lifecycle])
  await rpc('finish_newsletter_signup', [create?.operation, create?.generation, 'unknown', null])
  await rpc('cancel_newsletter_signup', [signup?.lifecycle])
  expect(
    (await db.query('select authorization_expires_at,attempts from newsletter.workflows')).rows,
  ).toEqual([{ authorization_expires_at: null, attempts: 0 }])
  expect(await consume(intent)).toMatchObject({ status: 'invalid' })
  expect(await consume(unused)).toMatchObject({ status: 'invalid' })
  expect(await rpc('prepare_newsletter_signup', [signup?.lifecycle])).toBeUndefined()
  expect(await rpc('prepare_newsletter_cleanup', [signup?.lifecycle])).toBeUndefined()
  expect(await consume(await issue())).toMatchObject({ status: 'unavailable' })
  await db.query('delete from auth.users where id=$1', [owner])
  expect((await db.query('select * from newsletter.subscriptions')).rows).toEqual([])
  const provider = '33333333-3333-4333-8333-333333333333'
  await rpc('finish_newsletter_signup', [
    create?.operation,
    create?.generation,
    'accepted',
    provider,
  ])
  const deletion = await rpc('prepare_newsletter_cleanup', [signup?.lifecycle])
  expect(deletion).toMatchObject({ provider_id: provider })
  expect(
    await rpc('finish_newsletter_cleanup', [
      deletion?.operation,
      deletion?.generation,
      provider,
      'removed',
    ]),
  ).toMatchObject({ finish_newsletter_cleanup: true })
  expect((await db.query('select * from newsletter.workflows')).rows).toEqual([])
  expect((await db.query('select * from newsletter.operations')).rows).toEqual([])
  await db.query('insert into auth.users values ($1,$2)', [owner, 'original@example.test'])
  expect(await consume(unused)).toMatchObject({ status: 'invalid' })
  expect(await consume(await issue())).toMatchObject({ status: 'ready' })
})

it('caps attempts at two, removes exhausted consent, and never lets a receipt replenish the budget', async () => {
  const intent = await issue()
  const signup = await consume(intent)
  for (const attempt of [1, 2]) {
    const job = await rpc('prepare_newsletter_signup', [signup?.lifecycle])
    expect(job?.attempt).toBe(attempt)
    await rpc('finish_newsletter_signup', [job?.operation, job?.generation, 'rejected', null])
  }
  expect(await rpc('prepare_newsletter_signup', [signup?.lifecycle])).toBeUndefined()
  expect(await consume(intent)).toMatchObject({ status: 'failed', lifecycle: null })
  expect((await db.query('select * from newsletter.subscriptions')).rows).toEqual([])
  expect(await rpc('prepare_newsletter_cleanup', [signup?.lifecycle])).toMatchObject({
    action: 'complete',
  })
  expect(await consume(intent)).toMatchObject({ status: 'failed', lifecycle: null })
})

it('ends signup authorization at its original expiry even when a create settles late', async () => {
  const intent = await issue()
  const signup = await consume(intent)
  const job = await rpc('prepare_newsletter_signup', [signup?.lifecycle])
  await db.query(
    'update newsletter.workflows set authorization_expires_at=clock_timestamp() where id=$1',
    [signup?.lifecycle],
  )
  const provider = '33333333-3333-4333-8333-333333333333'
  await rpc('finish_newsletter_signup', [job?.operation, job?.generation, 'accepted', provider])
  expect(await rpc('prepare_newsletter_signup', [signup?.lifecycle])).toBeUndefined()
  expect(await consume(intent)).toMatchObject({ status: 'failed', lifecycle: null })
  expect((await db.query('select * from newsletter.subscriptions')).rows).toEqual([])
  expect(await rpc('prepare_newsletter_cleanup', [signup?.lifecycle])).toMatchObject({
    provider_id: provider,
  })
})

it('rejects tampering, canceled attempts, expired attempts, and absent Auth identities', async () => {
  const intent = await issue()
  expect(
    await rpc(
      'consume_newsletter_signup_intent',
      [intent?.capability, 'b'.repeat(64)],
      'authenticated',
    ),
  ).toMatchObject({ status: 'invalid' })
  await rpc('discard_newsletter_signup_intent', [intent?.capability, proof])
  expect(await consume(intent)).toMatchObject({ status: 'invalid' })
  const expired = await issue()
  await db.exec(
    "update newsletter.signup_intents set issued_at=now()-interval '10 minutes',expires_at=now()",
  )
  expect(await consume(expired)).toMatchObject({ status: 'invalid' })
  expect(await consume(await issue(), '33333333-3333-4333-8333-333333333333')).toMatchObject({
    status: 'invalid',
  })
})

it('retains consumed receipts despite discard and prunes only their original expiry', async () => {
  const intent = await issue()
  const signup = await consume(intent)
  await rpc('discard_newsletter_signup_intent', [intent?.capability, proof])
  expect(await consume(intent)).toEqual(signup)
  await db.exec(
    "update newsletter.signup_intents set issued_at='2020-01-01 00:00:00+00',expires_at='2020-01-01 00:10:00+00'",
  )
  await rpc('prune_newsletter_signup_intents')
  expect((await db.query('select * from newsletter.signup_intents')).rows).toEqual([])
  expect(await consume(intent)).toMatchObject({ status: 'invalid' })
})

it('preserves the old address association and cancels unbound intents for both trusted addresses', async () => {
  const signup = await consume(await issue())
  const oldIntent = await issue()
  await db.query('update auth.users set email=$1 where id=$2', ['new@example.test', owner])
  const newIntent = await issue()
  expect((await db.query('select email from newsletter.subscriptions')).rows).toEqual([
    { email: 'original@example.test' },
  ])
  await expect(db.query('delete from auth.users where id=$1', [owner])).rejects.toThrow(
    /foreign key/,
  )
  await rpc('cancel_newsletter_signup', [signup?.lifecycle])
  expect(await consume(newIntent)).toMatchObject({ status: 'invalid' })
  await db.query('update auth.users set email=$1 where id=$2', ['original@example.test', owner])
  expect(await consume(oldIntent)).toMatchObject({ status: 'invalid' })
  expect(
    (await db.query('select count(*)::int count from newsletter.cancellation_fences')).rows,
  ).toEqual([{ count: 2 }])
  await db.exec(
    "update newsletter.cancellation_fences set cutoff='2020-01-01 00:00:00+00',expires_at='2020-01-01 00:10:00+00'",
  )
  await rpc('prune_newsletter_signup_intents')
  expect((await db.query('select * from newsletter.cancellation_fences')).rows).toEqual([])
})

it('rejects a deletion acknowledgement begun before late activation settlement', async () => {
  const signup = await consume(await issue())
  const create = await rpc('prepare_newsletter_signup', [signup?.lifecycle])
  const provider = '33333333-3333-4333-8333-333333333333'
  await rpc('finish_newsletter_signup', [
    create?.operation,
    create?.generation,
    'accepted',
    provider,
  ])
  const activate = await rpc('prepare_newsletter_signup', [signup?.lifecycle])
  await rpc('cancel_newsletter_signup', [signup?.lifecycle])
  const before = await rpc('prepare_newsletter_cleanup', [signup?.lifecycle])
  expect(
    await rpc('finish_newsletter_cleanup', [
      before?.operation,
      before?.generation,
      provider,
      'removed',
    ]),
  ).toMatchObject({ finish_newsletter_cleanup: false })
  await rpc('finish_newsletter_signup', [
    activate?.operation,
    activate?.generation,
    'accepted',
    provider,
  ])
  expect(
    await rpc('finish_newsletter_cleanup', [
      before?.operation,
      before?.generation,
      provider,
      'removed',
    ]),
  ).toMatchObject({ finish_newsletter_cleanup: false })
  const after = await rpc('prepare_newsletter_cleanup', [signup?.lifecycle])
  expect(
    await rpc('finish_newsletter_cleanup', [
      after?.operation,
      after?.generation,
      provider,
      'unknown',
    ]),
  ).toMatchObject({ finish_newsletter_cleanup: false })
  const retry = await rpc('prepare_newsletter_cleanup', [signup?.lifecycle])
  expect(
    await rpc('finish_newsletter_cleanup', [
      after?.operation,
      after?.generation,
      provider,
      'removed',
    ]),
  ).toMatchObject({ finish_newsletter_cleanup: false })
  expect(
    await rpc('finish_newsletter_cleanup', [
      retry?.operation,
      create?.generation,
      provider,
      'removed',
    ]),
  ).toMatchObject({ finish_newsletter_cleanup: false })
  expect(
    await rpc('finish_newsletter_cleanup', [retry?.operation, retry?.generation, owner, 'removed']),
  ).toMatchObject({ finish_newsletter_cleanup: false })
  expect(
    await rpc('finish_newsletter_cleanup', [
      retry?.operation,
      retry?.generation,
      provider,
      'removed',
    ]),
  ).toMatchObject({ finish_newsletter_cleanup: true })
})

it('never treats age, pruning, or a missing provider lookup as settlement of an unknown create', async () => {
  const signup = await consume(await issue())
  const create = await rpc('prepare_newsletter_signup', [signup?.lifecycle])
  expect(
    await rpc('finish_newsletter_signup', [create?.operation, owner, 'accepted', owner]),
  ).toMatchObject({ finish_newsletter_signup: false })
  await rpc('finish_newsletter_signup', [create?.operation, create?.generation, 'unknown', null])
  expect(await rpc('prepare_newsletter_signup', [signup?.lifecycle])).toBeUndefined()
  await db.query(
    "update newsletter.workflows set authorization_expires_at='2020-01-01' where id=$1",
    [signup?.lifecycle],
  )
  await rpc('prune_newsletter_signup_intents')
  expect(await rpc('prepare_newsletter_cleanup', [signup?.lifecycle])).toBeUndefined()
  expect(await consume(await issue())).toMatchObject({ status: 'unavailable' })
  expect((await db.query('select state from newsletter.operations')).rows).toEqual([
    { state: 'unknown' },
  ])
})

it.each(['anon', 'authenticated', 'service_role', 'report_ingress'])(
  'denies %s private persistence and every unapproved execution grant',
  async (role) => {
    await db.exec(`set role ${role}`)
    for (const table of [
      'subscriptions',
      'workflows',
      'signup_intents',
      'cancellation_fences',
      'operations',
    ]) {
      await expect(db.query(`select * from newsletter.${table}`)).rejects.toThrow(
        /permission denied/,
      )
    }
    await expect(
      db.query("select newsletter.cancel_address('other@example.test')"),
    ).rejects.toThrow(/permission denied/)
    await db.exec('reset role')
    const allowed =
      role === 'service_role'
        ? [
            'cancel_newsletter_signup',
            'discard_newsletter_signup_intent',
            'finish_newsletter_cleanup',
            'finish_newsletter_signup',
            'issue_newsletter_signup_intent',
            'pending_newsletter_cleanup',
            'prepare_newsletter_cleanup',
            'prepare_newsletter_signup',
            'prune_newsletter_signup_intents',
          ]
        : role === 'authenticated'
          ? ['consume_newsletter_signup_intent']
          : []
    const grants = await db.query<{ name: string }>(
      `select p.proname name from pg_proc p
      join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like '%newsletter%'
      and has_function_privilege($1,p.oid,'execute') order by p.proname`,
      [role],
    )
    expect(grants.rows.map(({ name }) => name)).toEqual(allowed)
    if (role !== 'service_role') {
      await expect(rpc('issue_newsletter_signup_intent', [proofHash], role)).rejects.toThrow(
        /permission denied/,
      )
      await expect(rpc('prepare_newsletter_signup', [owner], role)).rejects.toThrow(
        /permission denied/,
      )
      await expect(rpc('cancel_newsletter_signup', [owner], role)).rejects.toThrow(
        /permission denied/,
      )
      await expect(rpc('pending_newsletter_cleanup', [], role)).rejects.toThrow(/permission denied/)
    }
    if (role !== 'authenticated')
      await expect(
        rpc('consume_newsletter_signup_intent', ['a'.repeat(64), proof], role),
      ).rejects.toThrow(/permission denied/)
  },
)

it('rediscovers cleanup after erasure and pages past a hundred unresolved operations without mutation', async () => {
  const signup = await consume(await issue())
  await rpc('prepare_newsletter_signup', [signup?.lifecycle])
  await rpc('cancel_newsletter_signup', [signup?.lifecycle])
  await db.query('delete from auth.users where id=$1', [owner])
  expect(await rpc('pending_newsletter_cleanup')).toEqual({ lifecycle: signup?.lifecycle })
  await db.exec(`insert into newsletter.workflows(id,email,authorization_expires_at,state)
    select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
      'cleanup-'||n||'@example.test',now(),'cleanup' from generate_series(1,101) n;
    insert into newsletter.operations(lifecycle,generation,kind,state,revision)
    select id,generation,'create','unknown',revision from newsletter.workflows where email like 'cleanup-%';`)
  await db.exec('set role service_role')
  const first = (
    await db.query<{ lifecycle: string }>('select * from public.pending_newsletter_cleanup()')
  ).rows
  const again = (await db.query('select * from public.pending_newsletter_cleanup()')).rows
  expect(first).toHaveLength(100)
  expect(again).toEqual(first)
  expect(Object.keys(first[0])).toEqual(['lifecycle'])
  const next = (
    await db.query<{ lifecycle: string }>('select * from public.pending_newsletter_cleanup($1)', [
      first[99].lifecycle,
    ])
  ).rows
  expect(next).toHaveLength(2)
  expect(
    (await db.query('select * from public.pending_newsletter_cleanup($1)', [next[1].lifecycle]))
      .rows,
  ).toEqual([])
  await db.exec('reset role')
  expect(
    (
      await db.query(
        "select count(*)::int count from newsletter.operations where state in ('unknown','in_flight')",
      )
    ).rows,
  ).toEqual([{ count: 102 }])
  expect((await db.query('select max(attempts) attempts from newsletter.workflows')).rows).toEqual([
    { attempts: 0 },
  ])
})

it('rejects an intent exactly at the cancellation cutoff and accepts only a fresh later lifecycle', async () => {
  const signup = await consume(await issue())
  const stale = await issue()
  await rpc('cancel_newsletter_signup', [signup?.lifecycle])
  await rpc('prepare_newsletter_cleanup', [signup?.lifecycle])
  await db.query(
    `update newsletter.cancellation_fences set cutoff=i.issued_at,expires_at=i.expires_at
    from newsletter.signup_intents i where i.capability_hash=newsletter.hash($1)`,
    [stale?.capability],
  )
  expect(await consume(stale)).toMatchObject({ status: 'invalid' })
  expect(await consume(await issue())).toMatchObject({ status: 'ready' })
})

it('uses the second activation attempt without creating another contact and closes terminal failure', async () => {
  const intent = await issue()
  const signup = await consume(intent)
  const create = await rpc('prepare_newsletter_signup', [signup?.lifecycle])
  const provider = '33333333-3333-4333-8333-333333333333'
  await rpc('finish_newsletter_signup', [
    create?.operation,
    create?.generation,
    'accepted',
    provider,
  ])
  for (const attempt of [1, 2]) {
    const activate = await rpc('prepare_newsletter_signup', [signup?.lifecycle])
    expect(activate).toMatchObject({ action: 'activate', provider_id: provider, attempt })
    expect(
      await rpc('finish_newsletter_signup', [
        activate?.operation,
        activate?.generation,
        'accepted',
        owner,
      ]),
    ).toMatchObject({ finish_newsletter_signup: false })
    await rpc('finish_newsletter_signup', [
      activate?.operation,
      activate?.generation,
      'rejected',
      provider,
    ])
  }
  expect(await rpc('prepare_newsletter_signup', [signup?.lifecycle])).toBeUndefined()
  expect(await consume(intent)).toMatchObject({ status: 'failed', lifecycle: null })
  expect(await rpc('prepare_newsletter_cleanup', [signup?.lifecycle])).toMatchObject({
    provider_id: provider,
  })
})
