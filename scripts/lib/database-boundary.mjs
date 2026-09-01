// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { sha256 } from './supabase-authority.mjs'

export const DATABASE_BOUNDARY_ACTORS = [
  'anonymous',
  'owner',
  'other-tenant',
  'viewer',
  'stale-writer',
  'restricted-function',
]
export const DATABASE_BOUNDARY_CHECKS = [
  'rls',
  'grants',
  'definerSearchPaths',
  'deprecatedOverloads',
  'restrictedExecution',
  'realtime',
  'accountDeletion',
]
/** Build immutable tenant and live-authority evidence without retaining fixture identities. */
export function buildDatabaseBoundaryAttestation(input) {
  const migrationMatches =
    JSON.stringify(input.observedMigrationVersions) ===
    JSON.stringify(input.expectedMigrationVersions)
  const checksPassed = DATABASE_BOUNDARY_CHECKS.every(
    (check) => input.boundary.checks[check] === 'passed',
  )
  const actorsMatch =
    JSON.stringify(input.boundary.actors) === JSON.stringify(DATABASE_BOUNDARY_ACTORS) &&
    input.boundary.version === 1
  const suiteIdentified = /^[a-f0-9]{64}$/.test(input.hostileSuiteHash)

  return {
    version: 1,
    requirementIds: ['CB-1', 'CB-3'],
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
    hostileSuiteHash: input.hostileSuiteHash,
    result:
      migrationMatches && checksPassed && actorsMatch && suiteIdentified ? 'passed' : 'failed',
    workflow: input.workflow,
    approver: input.approver,
    timestamp: input.timestamp,
  }
}

/** Reject staging evidence that cannot authorize this exact production candidate. */
export function verifyStagingBoundaryEvidence(attestation, expected) {
  const valid =
    attestation?.version === 1 &&
    attestation?.requirementIds?.includes('CB-1') &&
    attestation?.requirementIds?.includes('CB-3') &&
    attestation?.environment?.kind === 'staging' &&
    attestation?.consoleCommit === expected.consoleCommit &&
    attestation?.migration?.expectedHead === expected.migrationHead &&
    attestation?.migration?.observedHead === expected.migrationHead &&
    attestation?.migration?.result === 'passed' &&
    attestation?.result === 'passed' &&
    typeof attestation?.hostileSuiteHash === 'string' &&
    attestation.hostileSuiteHash === expected.hostileSuiteHash
  if (!valid) throw new Error('Staging boundary evidence does not match this production candidate.')
  return true
}
