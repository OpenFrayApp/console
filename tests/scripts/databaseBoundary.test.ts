// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { describe, expect, it } from 'vitest'
// @ts-expect-error The release script is plain JavaScript and has no generated declaration.
import * as boundary from '../../scripts/lib/database-boundary.mjs'

const {
  buildDatabaseBoundaryAttestation,
  DATABASE_BOUNDARY_ACTORS,
  DATABASE_BOUNDARY_CHECKS,
  verifyStagingBoundaryEvidence,
} = boundary
const passedChecks = Object.fromEntries(
  DATABASE_BOUNDARY_CHECKS.map((check: string) => [check, 'passed']),
)

describe('database boundary evidence', () => {
  it('passes only with the complete lineage, hostile actors, and checks', () => {
    const attestation = buildDatabaseBoundaryAttestation({
      consoleCommit: 'a'.repeat(40),
      environmentKind: 'staging',
      environmentIdentity: 'abcdefghijklmnopqrst',
      expectedMigrationVersions: ['20260901000000', '20260901000600'],
      observedMigrationVersions: ['20260901000000', '20260901000600'],
      boundary: { version: 1, actors: DATABASE_BOUNDARY_ACTORS, checks: passedChecks },
      hostileSuiteHash: 'b'.repeat(64),
      workflow: 'Database authority:123',
      approver: 'maintainer',
      timestamp: '2026-09-01T00:00:00.000Z',
    })

    expect(attestation.result).toBe('passed')
    expect(attestation.migration.result).toBe('passed')
    expect(attestation.actors).toEqual(DATABASE_BOUNDARY_ACTORS)
    expect(attestation.hostileSuiteHash).toBe('b'.repeat(64))
  })

  it('fails closed when the deployed lineage is partial or any hostile check is missing', () => {
    const attestation = buildDatabaseBoundaryAttestation({
      consoleCommit: 'a'.repeat(40),
      environmentKind: 'staging',
      environmentIdentity: 'abcdefghijklmnopqrst',
      expectedMigrationVersions: ['20260901000000', '20260901000600'],
      observedMigrationVersions: ['20260901000000'],
      boundary: {
        version: 1,
        actors: DATABASE_BOUNDARY_ACTORS,
        checks: { ...passedChecks, realtime: 'missing' },
      },
      hostileSuiteHash: 'b'.repeat(64),
      workflow: 'Database authority:123',
      approver: 'maintainer',
      timestamp: '2026-09-01T00:00:00.000Z',
    })

    expect(attestation.result).toBe('failed')
    expect(attestation.migration.result).toBe('failed')
    expect(attestation.checks.realtime).toBe('missing')
    expect(attestation).not.toHaveProperty('databaseUrl')
  })

  it('accepts production promotion evidence only from matching authorized staging', () => {
    const expected = {
      consoleCommit: 'a'.repeat(40),
      environmentIdentity: 'abcdefghijklmnopqrst',
      migrationHead: '20260901000600',
      migrationLineageHash: 'c'.repeat(64),
      hostileSuiteHash: 'b'.repeat(64),
      approver: 'maintainer',
      workflow: 'Database authority:123',
    }
    const evidence = {
      version: 1,
      requirementIds: ['CB-1', 'CB-3', 'DC-3'],
      consoleCommit: expected.consoleCommit,
      environment: { kind: 'staging', identity: expected.environmentIdentity },
      migration: {
        expectedHead: expected.migrationHead,
        observedHead: expected.migrationHead,
        expectedLineageHash: expected.migrationLineageHash,
        observedLineageHash: expected.migrationLineageHash,
        result: 'passed',
      },
      actors: DATABASE_BOUNDARY_ACTORS,
      checks: passedChecks,
      hostileSuiteHash: expected.hostileSuiteHash,
      result: 'passed',
      approver: expected.approver,
      workflow: expected.workflow,
    }

    expect(verifyStagingBoundaryEvidence(evidence, expected)).toBe(true)
    for (const partial of [
      { ...evidence, consoleCommit: 'd'.repeat(40) },
      { ...evidence, environment: { kind: 'production', identity: expected.environmentIdentity } },
      { ...evidence, environment: { kind: 'staging', identity: 'wrongprojectrefxxxxx' } },
      { ...evidence, actors: DATABASE_BOUNDARY_ACTORS.slice(0, -1) },
      { ...evidence, checks: { ...passedChecks, realtime: 'missing' } },
      {
        ...evidence,
        migration: { ...evidence.migration, observedLineageHash: 'd'.repeat(64) },
      },
      { ...evidence, approver: 'someone else' },
      { ...evidence, workflow: 'Database authority:456' },
    ]) {
      expect(() => verifyStagingBoundaryEvidence(partial, expected)).toThrow(/does not match/)
    }
  })
})
