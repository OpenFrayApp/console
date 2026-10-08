#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { spawn, execFileSync } from 'node:child_process'
import assert from 'node:assert/strict'

const connection = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const fixture = '77777777-7777-4777-8777-777777777777'
const args = [
  connection,
  '--no-psqlrc',
  '--set',
  'ON_ERROR_STOP=on',
  '--tuples-only',
  '--no-align',
  '--quiet',
]

/** Execute fixture setup against only the fixed ephemeral local database. */
function query(sql) {
  return execFileSync('psql', [...args, '--command', sql], { encoding: 'utf8' }).trim()
}

/** Hold the first row lock until a concurrent session has attempted its own claim. */
async function verify() {
  assert.equal(
    query('select count(*) from account_mail.queue'),
    '0',
    'Reset the local database before this check',
  )
  query(
    `insert into auth.users(id,email,created_at) values ('${fixture}','concurrency@example.test',now())`,
  )
  try {
    const first = spawn('psql', args, { stdio: ['pipe', 'pipe', 'pipe'] })
    let output = '',
      error = ''
    let second
    const completion = new Promise((resolve, reject) => {
      first.on('error', reject)
      first.stderr.on('data', (data) => {
        error += data
      })
      first.stdout.on('data', (data) => {
        output += data
        if (output.includes('locked') && !second) {
          try {
            second = query(
              'set role service_role; select count(*) from public.claim_account_mail()',
            )
            first.stdin.end('commit;\n')
          } catch {
            first.kill()
            reject(new Error('Concurrent local session failed'))
          }
        }
      })
      first.on('exit', (code) =>
        code === 0
          ? resolve()
          : reject(new Error(error ? 'Local concurrency session failed' : 'Local psql failed')),
      )
    })
    first.stdin.write(
      'begin; set local role service_role; select id from public.claim_account_mail();\n\\echo locked\n',
    )
    const timeout = setTimeout(() => first.kill(), 10000)
    try {
      await completion
    } finally {
      clearTimeout(timeout)
    }
    assert.match(output, /^[a-f0-9-]{36}\nlocked/m)
    assert.equal(second, '0', 'A second worker claimed the locked delivery')
    assert.equal(
      query('set role service_role; select count(*) from public.claim_account_mail()'),
      '0',
      'The committed lease did not fence another worker',
    )
    console.log('Account mail concurrent claims: passed')
  } finally {
    query(
      `delete from auth.users where id='${fixture}'; delete from public.recovery_deletions where kind='account' and subject='${fixture}'`,
    )
  }
}

/** Prove concurrent registrations group both dates once under the publication-state lock. */
async function verifyLegalRegistration() {
  assert.equal(
    query('select count(*) from account_mail.legal_publications'),
    '0',
    'Reset the local database before checking legal registration',
  )
  const publicationTime = query("select now()-interval '1 second'")
  const today = query("select (now() at time zone 'UTC')::date")
  const yesterday = query("select (now() at time zone 'UTC')::date-1")
  query(
    `insert into auth.users(id,email,created_at) values ('${fixture}','concurrency@example.test',now()-interval '1 year')`,
  )
  query(
    `set role service_role; select public.register_legal_publication('${'a'.repeat(40)}','${publicationTime}','${yesterday}','${yesterday}',true)`,
  )
  const first = spawn('psql', args, { stdio: ['pipe', 'pipe', 'pipe'] })
  const second = spawn('psql', args, { stdio: ['pipe', 'pipe', 'pipe'] })
  let firstOutput = '',
    secondOutput = '',
    started = false
  const timeout = setTimeout(() => {
    first.kill()
    second.kill()
  }, 10000)
  try {
    const firstDone = new Promise((resolve, reject) => {
      first.on('error', reject)
      first.stdout.on('data', (data) => {
        firstOutput += data
        if (firstOutput.includes('locked') && !started) {
          started = true
          second.stdin.end(
            `set role service_role; select public.register_legal_publication('${'c'.repeat(40)}','${publicationTime}','${today}','${today}',false);\n`,
          )
          // Keep the first registration uncommitted while the second session enters its RPC.
          setTimeout(() => first.stdin.end('commit;\n'), 100)
        }
      })
      first.on('exit', (code) =>
        code === 0 ? resolve() : reject(new Error('First registration failed')),
      )
    })
    const secondDone = new Promise((resolve, reject) => {
      second.on('error', reject)
      second.stdout.on('data', (data) => {
        secondOutput += data
      })
      second.on('exit', (code) =>
        code === 0 ? resolve() : reject(new Error('Second registration failed')),
      )
    })
    first.stdin.write(
      `begin; set local role service_role; select public.register_legal_publication('${'b'.repeat(40)}','${publicationTime}','${today}','${today}',false);\n\\echo locked\n`,
    )
    await Promise.all([firstDone, secondDone])
    assert.match(firstOutput, /combined\nlocked/)
    assert.match(secondOutput, /unchanged/)
    assert.equal(query("select count(*) from account_mail.ledger where event<>'welcome'"), '1')
    assert.equal(query('select count(*) from account_mail.legal_history'), '4')
    console.log('Legal publication concurrent registration: passed')
  } finally {
    clearTimeout(timeout)
    first.kill()
    second.kill()
    query(`delete from auth.users where id='${fixture}'; delete from public.recovery_deletions where kind='account' and subject='${fixture}';
      delete from account_mail.legal_history; delete from account_mail.legal_publications;
      update account_mail.legal_state set initialized=false`)
  }
}

verify()
  .then(verifyLegalRegistration)
  .catch(() => {
    console.error('Account mail concurrency verification failed')
    process.exitCode = 1
  })
