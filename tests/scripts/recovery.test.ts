// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { execFile } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'
// @ts-expect-error The operator module is plain JavaScript and has no generated declaration.
import { buildRecoveryAttestation, RECOVERY_CHECKS } from '../../scripts/lib/recovery.mjs'

const execFileAsync = promisify(execFile)
const passedChecks = Object.fromEntries(RECOVERY_CHECKS.map((check: string) => [check, 'passed']))

/** Return one complete passing recovery drill input. */
function passingInput() {
  return {
    consoleCommit: 'a'.repeat(40),
    backupAgeSeconds: 3600,
    elapsedSeconds: 900,
    checks: passedChecks,
    restoredRows: { encounters: 3, shares: 2, users: 2 },
    replayed: { accounts: 1, shares: 1 },
    monitoring: { backupFreshness: 'passed', restoreFailureSignal: 'passed' },
    environment: 'isolated',
    owner: 'database-operator',
    workflow: 'Recovery drill:123',
    decision: 'abandon',
    timestamp: '2026-09-11T10:00:00.000Z',
  }
}

describe('recovery drill evidence', () => {
  it('records a bounded privacy-safe RC-4 attestation', () => {
    const attestation = buildRecoveryAttestation(passingInput())

    expect(attestation).toMatchObject({
      version: 1,
      requirementIds: ['RC-4'],
      result: 'passed',
      recoveryPoint: { maximumAgeSeconds: 86_400, observedAgeSeconds: 3600 },
      recoveryTime: { maximumSeconds: 28_800, observedSeconds: 900 },
      checks: passedChecks,
      decision: 'abandon',
    })
    expect(JSON.stringify(attestation)).not.toMatch(
      /databaseUrl|objectKey|ciphertext|subject|email|capability|encounterData/,
    )
  })

  it('fails closed on stale backups, slow restores, unsafe targets, or incomplete checks', () => {
    for (const change of [
      { backupAgeSeconds: 86_401 },
      { elapsedSeconds: 28_801 },
      { environment: 'production' },
      { decision: 'promote' },
      { checks: { ...passedChecks, grants: 'failed' } },
      { monitoring: { backupFreshness: 'passed', restoreFailureSignal: 'missing' } },
    ]) {
      expect(buildRecoveryAttestation({ ...passingInput(), ...change }).result).toBe('failed')
    }
  })

  it('records abandonment evidence when restore work fails before checks exist', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'openfray-recovery-evidence-'))
    const output = join(directory, 'attestation.json')
    await expect(
      execFileAsync(
        process.execPath,
        [
          'scripts/attest-recovery-restore.mjs',
          '--checks',
          join(directory, 'missing-checks.json'),
          '--auth-check',
          join(directory, 'missing-auth.json'),
          '--output',
          output,
          '--owner',
          'database-operator',
        ],
        {
          env: {
            ...process.env,
            RECOVERY_RESTORE_OUTCOME: 'failure',
            RECOVERY_AUTH_OUTCOME: 'skipped',
            RECOVERY_MONITOR_OUTCOME: 'skipped',
          },
        },
      ),
    ).rejects.toMatchObject({ code: 1 })
    expect(JSON.parse(readFileSync(output, 'utf8'))).toMatchObject({
      result: 'failed',
      decision: 'abandon',
      failedPhase: 'restore',
      owner: 'database-operator',
    })
  })
})

describe('recovery authentication', () => {
  it('creates, authenticates, and removes a synthetic account through isolated Auth', async () => {
    const requests: Array<{ method?: string; url?: string }> = []
    const server = createServer((request, response) => {
      requests.push({ method: request.method, url: request.url })
      response.setHeader('content-type', 'application/json')
      if (request.method === 'POST' && request.url === '/auth/v1/admin/users') {
        response.end('{"id":"recovery-user"}')
      } else if (request.method === 'GET' && request.url === '/auth/v1/user') {
        response.end('{"id":"recovery-user"}')
      } else if (
        request.method === 'DELETE' &&
        request.url === '/auth/v1/admin/users/recovery-user'
      ) {
        response.end('{}')
      } else {
        response.statusCode = 404
        response.end('{}')
      }
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    try {
      const address = server.address()
      if (!address || typeof address === 'string') throw new Error('Missing test server address.')
      const directory = mkdtempSync(join(tmpdir(), 'openfray-recovery-auth-'))
      const output = join(directory, 'auth.json')
      await execFileAsync(process.execPath, ['scripts/verify-recovery-auth.mjs'], {
        env: {
          ...process.env,
          RECOVERY_API_URL: `http://127.0.0.1:${address.port}`,
          RECOVERY_ANON_KEY: 'anonymous-test-key',
          RECOVERY_SERVICE_ROLE_KEY: 'service-test-key',
          RECOVERY_JWT_SECRET: 'local-test-secret-with-at-least-32-characters',
          RECOVERY_AUTH_CHECK_PATH: output,
        },
      })
      expect(JSON.parse(readFileSync(output, 'utf8'))).toEqual({ authentication: 'passed' })
      expect(requests).toEqual([
        { method: 'POST', url: '/auth/v1/admin/users' },
        { method: 'GET', url: '/auth/v1/user' },
        { method: 'DELETE', url: '/auth/v1/admin/users/recovery-user' },
      ])
    } finally {
      server.close()
    }
  })
})

describe('recovery operator boundary', () => {
  const workflow = readFileSync('.github/workflows/recovery.yml', 'utf8')
  const restore = readFileSync('scripts/restore-supabase.sh', 'utf8')
  const monitor = readFileSync('scripts/notify-recovery-monitor.sh', 'utf8')

  it('pins actions and restores only into the ephemeral local target', () => {
    const references = [...workflow.matchAll(/^\s*- uses:\s*([^\s#]+)/gm)].map(([, value]) => value)
    expect(references.length).toBeGreaterThan(0)
    for (const reference of references) expect(reference).toMatch(/@[a-f0-9]{40}$/)
    expect(workflow).toContain('environment: recovery')
    expect(workflow).toContain('supabase start')
    expect(workflow).not.toContain('RECOVERY_TARGET_DB_URL: ${{ secrets.')
    expect(restore).toContain('RECOVERY_TARGET_DB_URL')
    expect(restore).toContain('RECOVERY_SOURCE_DB_URL')
    expect(restore).toContain('apply_recovery_deletions()')
    expect(restore).toContain('supabase/tests/database-boundary.sql')
  })

  it('sends only allowlisted content-free monitoring events', () => {
    expect(monitor).toMatch(/backup_stale\|restore_failed\|restore_failure_exercise/)
    expect(monitor).not.toMatch(/SUPABASE|DATABASE|BACKUP_OBJECT|AGE_IDENTITY|encounter|email/)
    expect(workflow).toContain('restore_failure_exercise')
    expect(workflow).toContain('restore_failed')
    expect(workflow).toContain('backup_stale')
  })
})
