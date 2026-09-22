// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const workflow = readFileSync(
  new URL('../../.github/workflows/staging-keepalive.yml', import.meta.url),
  'utf8',
)
const script = workflow.split('        run: |\n')[1].replace(/^ {10}/gm, '')
const ref = 'abcdefghijklmnopqrst'

/** Execute the workflow shell with an isolated database client. */
function ping(url: string, fails = false) {
  const directory = mkdtempSync(join(tmpdir(), 'staging-keepalive-'))
  const marker = join(directory, 'query')
  writeFileSync(
    join(directory, 'psql'),
    `#!/bin/sh\nprintf '%s\\n' "$*" > '${marker}'\nexit ${fails ? 1 : 0}\n`,
  )
  writeFileSync(join(directory, 'sleep'), '#!/bin/sh\nexit 0\n')
  chmodSync(join(directory, 'psql'), 0o755)
  chmodSync(join(directory, 'sleep'), 0o755)
  const result = spawnSync('bash', ['-c', script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${directory}:${process.env.PATH}`,
      PGDATABASE: url,
      PROJECT_REF: ref,
    },
  })
  return { ...result, marker }
}

describe('staging keep-alive', () => {
  it('runs weekly and manually with existing staging credentials and read-only queries', () => {
    expect(workflow).toContain("cron: '37 6 * * 3'")
    expect(workflow).toContain('workflow_dispatch: {}')
    expect(workflow).toContain('environment: staging')
    expect(workflow).toContain('secrets.SUPABASE_DB_URL')
    expect(workflow).toContain('default_transaction_read_only=on')
    expect(workflow).toContain('permissions: {}')
  })

  it.each([
    `postgresql://postgres:secret@db.${ref}.supabase.co:5432/postgres`,
    `postgres://postgres.${ref}:secret@aws-0-eu.pooler.supabase.com:5432/postgres`,
  ])('queries the identified staging project: %s', (url) => {
    const result = ping(url)
    expect(result.status, result.stderr).toBe(0)
    expect(readFileSync(result.marker, 'utf8')).toContain('--command=SELECT 1')
  })

  it.each([
    '',
    'secret-invalid-url',
    'postgres://postgres:secret@db.production.supabase.co/postgres',
  ])('rejects a missing, invalid, or other-project URL without leaking it', (url) => {
    const result = ping(url)
    expect(result.status).toBe(1)
    expect(() => readFileSync(result.marker)).toThrow()
    expect(result.stderr).not.toContain('secret')
  })

  it('fails visibly when staging remains unreachable', () => {
    const result = ping(
      `postgres://postgres:private-test-password@db.${ref}.supabase.co/postgres`,
      true,
    )
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('resume the project if paused')
    expect(result.stderr).not.toContain('private-test-password')
  })
})
