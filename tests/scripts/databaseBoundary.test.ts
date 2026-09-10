// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
  it('runs the hosted proof through the protected database URL', () => {
    const directory = mkdtempSync(join(tmpdir(), 'boundary-cli-'))
    try {
      const versions = readdirSync('supabase/migrations')
        .filter((file) => /^\d{14}_.*\.sql$/.test(file))
        .sort()
        .map((file) => file.slice(0, 14))
      const cli = join(directory, 'supabase')
      writeFileSync(
        cli,
        `#!/usr/bin/env node
const args = process.argv.slice(2)
if (args[0] === 'migration') {
  console.log(JSON.stringify({ migrations: ${JSON.stringify(versions)}.map(remote => ({ remote })) }))
} else if (args[0] === 'db' && args[1] === 'query' &&
  args[args.indexOf('--db-url') + 1] === 'postgresql://user:secret@staging.example/test') {
  console.log('{}')
} else {
  console.error('Expected a protected database URL')
  process.exitCode = 1
}
`,
      )
      chmodSync(cli, 0o700)
      const output = join(directory, 'attestation.json')
      const result = spawnSync(
        process.execPath,
        [
          'scripts/verify-database-boundary.mjs',
          '--environment',
          'staging',
          '--project-ref',
          'abcdefghijklmnopqrst',
          '--approver',
          'maintainer',
          '--output',
          output,
        ],
        {
          encoding: 'utf8',
          env: {
            ...process.env,
            PATH: `${directory}:${process.env.PATH}`,
            SUPABASE_DB_URL: 'postgresql://user:secret@staging.example/test',
          },
        },
      )
      expect(result.status, result.stderr).toBe(0)
      expect(JSON.parse(readFileSync(output, 'utf8')).result).toBe('passed')
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

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
    expect(attestation.actors).toContain('report-ingress')
    expect(attestation.actors).toContain('service-role')
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
      requirementIds: ['CB-1', 'CB-3', 'CB-4', 'DC-3'],
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
      {
        ...evidence,
        actors: DATABASE_BOUNDARY_ACTORS.filter((actor: string) => actor !== 'report-ingress'),
      },
      {
        ...evidence,
        actors: DATABASE_BOUNDARY_ACTORS.filter((actor: string) => actor !== 'service-role'),
      },
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
