// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../../', import.meta.url))
const versions = readdirSync(join(root, 'supabase/migrations'))
  .filter((name) => name.endsWith('.sql'))
  .sort()
  .map((name) => name.slice(0, 14))
const expectations = JSON.parse(
  readFileSync(join(root, 'supabase/hosted-config.expected.json'), 'utf8'),
).manual as { id: string }[]
let directory: string

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'openfray-promotion-test-'))
  writeFileSync(
    join(directory, 'evidence.json'),
    JSON.stringify({
      checks: expectations.map(({ id }) => ({
        id,
        result: 'passed',
        evidence: 'release/test/provider-review.md',
      })),
    }),
  )
  writeFileSync(
    join(directory, 'psql'),
    `#!/usr/bin/env node
const fs = require('node:fs');
fs.appendFileSync(process.env.TEST_QUERY_LOG, JSON.stringify({args: process.argv.slice(2), options: process.env.PGOPTIONS}) + '\\n');
if (process.env.TEST_FAIL === 'yes') { console.error('MUST_NOT_APPEAR'); process.exit(1); }
const query = process.argv.at(-1);
if (!query.startsWith('select ')) process.exit(2);
console.log(query.includes('to_regclass') ? process.env.TEST_CATALOG : process.env.TEST_HISTORY);
`,
    { mode: 0o700 },
  )
})

afterEach(() => rmSync(directory, { recursive: true, force: true }))

/** Run the real preflight command with a fake psql and no hosted connection. */
function run(environment = 'production', overrides: Record<string, string> = {}) {
  try {
    const output = execFileSync(
      process.execPath,
      [
        join(root, 'scripts/check-database-promotion.mjs'),
        environment,
        join(directory, 'evidence.json'),
      ],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PATH: `${directory}:${process.env.PATH}`,
          SUPABASE_DB_URL: 'postgresql://user:MUST_NOT_APPEAR@127.0.0.1/postgres',
          TEST_QUERY_LOG: join(directory, 'queries.jsonl'),
          TEST_CATALOG: 't',
          TEST_HISTORY: JSON.stringify(versions),
          ...overrides,
        },
      },
    )
    return { status: 0, output }
  } catch (error) {
    const failure = error as { status: number; stdout: string; stderr: string }
    return { status: failure.status, output: `${failure.stdout}${failure.stderr}` }
  }
}

describe('database promotion command', () => {
  it('uses only bounded read-only catalog queries and does not expose the connection', () => {
    const result = run()
    expect(result.status).toBe(0)
    expect(result.output).toContain('compatibility is not attested')
    const calls = readFileSync(join(directory, 'queries.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as { args: string[]; options: string })
    expect(calls).toHaveLength(2)
    for (const call of calls) {
      expect(call.args).toContain('-X')
      expect(call.args.at(-1)).toMatch(/^select /)
      expect(call.options).toContain('default_transaction_read_only=on')
      expect(call.options).toContain('statement_timeout=10000')
    }
    expect(JSON.stringify(calls)).not.toContain('MUST_NOT_APPEAR')
    expect(result.output).not.toContain('MUST_NOT_APPEAR')
  })

  it('blocks the observed untracked production history', () => {
    const result = run('production', { TEST_HISTORY: '["20260923025303"]' })
    expect(result.status).toBe(1)
    expect(result.output).toContain('baseline reconciliation')
  })

  it('allows an absent migration catalog only for fresh staging', () => {
    expect(run('production', { TEST_CATALOG: 'f' }).status).toBe(1)
    expect(run('staging', { TEST_CATALOG: 'f' }).status).toBe(0)
  })

  it('fails closed on database errors, malformed output, and invalid evidence', () => {
    const cases: Record<string, string>[] = [
      { TEST_FAIL: 'yes' },
      { TEST_CATALOG: 'unexpected' },
      { TEST_HISTORY: 'MUST_NOT_APPEAR' },
      { TEST_HISTORY: '{}' },
    ]
    for (const overrides of cases) {
      const result = run('production', overrides)
      expect(result.status).toBe(1)
      expect(result.output).not.toContain('MUST_NOT_APPEAR')
    }
    writeFileSync(join(directory, 'evidence.json'), '{"checks":[]}')
    expect(run().status).toBe(1)
    writeFileSync(join(directory, 'evidence.json'), 'MUST_NOT_APPEAR')
    expect(run().output).not.toContain('MUST_NOT_APPEAR')
  })
})
