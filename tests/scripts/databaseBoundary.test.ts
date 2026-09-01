// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { describe, expect, it } from 'vitest'
// @ts-expect-error The release script is plain JavaScript and has no generated declaration.
import * as boundary from '../../scripts/lib/database-boundary.mjs'

const { buildDatabaseBoundaryAttestation } = boundary
const actors = [
  'anonymous',
  'owner',
  'other-tenant',
  'viewer',
  'stale-writer',
  'restricted-function',
]
const passedChecks = {
  rls: 'passed',
  grants: 'passed',
  definerSearchPaths: 'passed',
  deprecatedOverloads: 'passed',
  restrictedExecution: 'passed',
  realtime: 'passed',
  accountDeletion: 'passed',
}

describe('database boundary evidence', () => {
  it('passes only with the complete lineage, hostile actors, and checks', () => {
    const attestation = buildDatabaseBoundaryAttestation({
      consoleCommit: 'a'.repeat(40),
      environmentKind: 'staging',
      environmentIdentity: 'abcdefghijklmnopqrst',
      expectedMigrationVersions: ['20260901000000', '20260901000600'],
      observedMigrationVersions: ['20260901000000', '20260901000600'],
      boundary: { version: 1, actors, checks: passedChecks },
      workflow: 'Database authority:123',
      approver: 'maintainer',
      timestamp: '2026-09-01T00:00:00.000Z',
    })

    expect(attestation.result).toBe('passed')
    expect(attestation.migration.result).toBe('passed')
    expect(attestation.actors).toEqual(actors)
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
        actors,
        checks: { ...passedChecks, realtime: 'missing' },
      },
      workflow: 'Database authority:123',
      approver: 'maintainer',
      timestamp: '2026-09-01T00:00:00.000Z',
    })

    expect(attestation.result).toBe('failed')
    expect(attestation.migration.result).toBe('failed')
    expect(attestation.checks.realtime).toBe('missing')
    expect(attestation).not.toHaveProperty('databaseUrl')
  })
})
