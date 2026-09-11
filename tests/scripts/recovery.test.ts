// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
// @ts-expect-error The operator module is plain JavaScript and has no generated declaration.
import { buildRecoveryAttestation } from '../../scripts/lib/recovery.mjs'

const passedChecks = {
  rowCounts: 'passed',
  deletionReplay: 'passed',
  tenantIsolation: 'passed',
  authentication: 'passed',
  criticalFunctions: 'passed',
  encounterIntegrity: 'passed',
  policies: 'passed',
  grants: 'passed',
}

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
