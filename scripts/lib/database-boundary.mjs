// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { sha256 } from './supabase-authority.mjs'

const ACTORS = [
  'anonymous',
  'owner',
  'other-tenant',
  'viewer',
  'stale-writer',
  'restricted-function',
]
const CHECKS = [
  'rls',
  'grants',
  'definerSearchPaths',
  'deprecatedOverloads',
  'restrictedExecution',
  'realtime',
  'accountDeletion',
]
/** Build the immutable CB-1 attestation without retaining fixture identities or query output. */
export function buildDatabaseBoundaryAttestation(input) {
  const migrationMatches =
    JSON.stringify(input.observedMigrationVersions) ===
    JSON.stringify(input.expectedMigrationVersions)
  const checksPassed = CHECKS.every((check) => input.boundary.checks[check] === 'passed')
  const actorsMatch =
    JSON.stringify(input.boundary.actors) === JSON.stringify(ACTORS) && input.boundary.version === 1

  return {
    version: 1,
    requirementIds: ['CB-1'],
    consoleCommit: input.consoleCommit,
    environment: {
      kind: input.environmentKind,
      identity: input.environmentIdentity,
    },
    migration: {
      expectedHead: input.expectedMigrationVersions.at(-1) ?? 'missing',
      observedHead: input.observedMigrationVersions.at(-1) ?? 'missing',
      expectedLineageHash: sha256(input.expectedMigrationVersions.join('\n')),
      observedLineageHash: sha256(input.observedMigrationVersions.join('\n')),
      result: migrationMatches ? 'passed' : 'failed',
    },
    actors: input.boundary.actors,
    checks: input.boundary.checks,
    result: migrationMatches && checksPassed && actorsMatch ? 'passed' : 'failed',
    workflow: input.workflow,
    approver: input.approver,
    timestamp: input.timestamp,
  }
}
