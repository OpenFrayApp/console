#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildDatabaseBoundaryAttestation } from './lib/database-boundary.mjs'
import { migrationLineage, remoteMigrationVersions } from './lib/supabase-authority.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const migrationsDirectory = resolve(root, 'supabase/migrations')
const hostileQueryPath = resolve(root, 'supabase/tests/database-boundary.sql')
const CHECKS = [
  'rls',
  'grants',
  'definerSearchPaths',
  'deprecatedOverloads',
  'restrictedExecution',
  'realtime',
  'accountDeletion',
]

/** Parse the protected target and evidence metadata accepted by this command. */
function parseArgs(argv) {
  const options = {
    environment: 'local',
    projectRef: null,
    approver: 'local',
    workflow: process.env.GITHUB_WORKFLOW ?? 'local:db:boundary',
    output: resolve(root, '.artifacts/supabase/database-boundary-attestation.json'),
  }
  for (let index = 0; index < argv.length; index += 2) {
    const option = argv[index]
    const value = argv[index + 1]
    if (option === '--environment' && ['local', 'staging'].includes(value)) {
      options.environment = value
    } else if (option === '--project-ref' && /^[a-z]{20}$/.test(value)) {
      options.projectRef = value
    } else if (option === '--approver' && /^[A-Za-z0-9 ._@-]{1,80}$/.test(value)) {
      options.approver = value
    } else if (option === '--workflow' && /^[A-Za-z0-9 ._:/#-]{1,160}$/.test(value)) {
      options.workflow = value
    } else if (option === '--output' && value) {
      options.output = resolve(root, value)
    } else {
      throw new Error(`Unknown or invalid option: ${option ?? '(missing)'}`)
    }
  }
  if (options.environment === 'staging' && (!options.projectRef || options.approver === 'local')) {
    throw new Error(
      'Staging boundary verification requires --project-ref and an explicit --approver.',
    )
  }
  if (options.environment === 'local' && options.projectRef) {
    throw new Error('Local boundary verification cannot target a hosted project.')
  }
  return options
}

/** Run one bounded Supabase or Git command and return stdout. */
function run(command, args) {
  return execFileSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    timeout: 10 * 60 * 1000,
  })
}

/** Persist one privacy-safe boundary attestation. */
function writeAttestation(path, attestation) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(attestation, null, 2)}\n`)
  console.log(`Database boundary: ${attestation.result}. Attestation: ${path}`)
}

/** Return the exact applied lineage for the selected target. */
function observedMigrations(options) {
  const args =
    options.environment === 'local'
      ? ['migration', 'list', '--local']
      : ['migration', 'list', '--project-ref', options.projectRef]
  return remoteMigrationVersions(run('supabase', args))
}

/** Run hostile actors only after proving the target has the complete tracked baseline. */
function main() {
  const options = parseArgs(process.argv.slice(2))
  const expectedMigrationVersions = migrationLineage(migrationsDirectory).map(({ file }) =>
    file.slice(0, 14),
  )

  if (options.environment === 'local') run('supabase', ['db', 'reset', '--local'])
  const observedMigrationVersions = observedMigrations(options)
  const lineageMatches =
    JSON.stringify(observedMigrationVersions) === JSON.stringify(expectedMigrationVersions)
  let boundary = {
    version: 1,
    actors: ['anonymous', 'owner', 'other-tenant', 'viewer', 'stale-writer', 'restricted-function'],
    checks: Object.fromEntries(CHECKS.map((check) => [check, 'missing'])),
  }

  if (lineageMatches) {
    const queryArgs =
      options.environment === 'local'
        ? ['db', 'query', '--local', '--file', hostileQueryPath]
        : ['db', 'query', '--project-ref', options.projectRef, '--file', hostileQueryPath]
    run('supabase', queryArgs)
    boundary = {
      ...boundary,
      checks: Object.fromEntries(CHECKS.map((check) => [check, 'passed'])),
    }
  }

  const attestation = buildDatabaseBoundaryAttestation({
    consoleCommit: run('git', ['rev-parse', 'HEAD']).trim(),
    environmentKind: options.environment,
    environmentIdentity: options.projectRef ?? 'local',
    expectedMigrationVersions,
    observedMigrationVersions,
    boundary,
    workflow: options.workflow,
    approver: options.approver,
    timestamp: new Date().toISOString(),
  })
  writeAttestation(options.output, attestation)
  if (attestation.result !== 'passed') process.exitCode = 1
}

try {
  main()
} catch (error) {
  console.error(`Database boundary verification failed: ${error.message}`)
  process.exitCode = 1
}
