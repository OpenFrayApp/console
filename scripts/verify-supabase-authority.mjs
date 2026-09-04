#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildDatabaseAttestation,
  canonicalGeneratedTypes,
  canonicalSchemaDump,
  compareHostedConfig,
  compareManualEvidence,
  migrationLineage,
  remoteMigrationVersions,
  schemaHash,
  sha256,
} from './lib/supabase-authority.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const migrationsDirectory = resolve(root, 'supabase/migrations')
const generatedTypesPath = resolve(root, 'src/types/database.ts')
const expectationsPath = resolve(root, 'supabase/hosted-config.expected.json')

/** Parse the bounded deployment metadata accepted by this command. */
function parseArgs(argv) {
  const options = {
    environment: 'local',
    projectRef: null,
    approver: 'pending',
    workflow: process.env.GITHUB_WORKFLOW ?? 'local:db:verify',
    output: resolve(root, '.artifacts/supabase/deployment-attestation.json'),
    manualEvidence: null,
  }
  for (let index = 0; index < argv.length; index += 2) {
    const option = argv[index]
    const value = argv[index + 1]
    if (option === '--environment' && ['local', 'staging', 'production'].includes(value)) {
      options.environment = value
    } else if (option === '--project-ref' && /^[a-z]{20}$/.test(value)) options.projectRef = value
    else if (option === '--approver' && /^[A-Za-z0-9 ._@-]{1,80}$/.test(value))
      options.approver = value
    else if (option === '--workflow' && /^[A-Za-z0-9 ._:/#-]{1,160}$/.test(value))
      options.workflow = value
    else if (option === '--output' && value) options.output = resolve(root, value)
    else if (option === '--manual-evidence' && value) options.manualEvidence = resolve(root, value)
    else throw new Error(`Unknown or invalid option: ${option ?? '(missing)'}`)
  }
  if (options.environment !== 'local' && (!options.projectRef || options.approver === 'pending')) {
    throw new Error('Hosted verification requires --project-ref and an explicit --approver.')
  }
  return options
}

/** Run a command and return stdout without copying rejected output into evidence. */
function run(command, args, environment = process.env) {
  return execFileSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    env: environment,
    stdio: ['ignore', 'pipe', 'inherit'],
    timeout: 10 * 60 * 1000,
  })
}

/** Run a local Supabase command without exposing the hosted database password. */
function runLocal(command, args) {
  const environment = { ...process.env }
  delete environment.SUPABASE_DB_PASSWORD
  return run(command, args, environment)
}

/** Generate database types from one verified Supabase target. */
function generateTypes(args, local = false) {
  const execute = local ? runLocal : run
  return execute('supabase', ['gen', 'types', 'typescript', ...args, '--schema', 'public'])
}

/** Dump and normalize one public schema without retaining provider secrets. */
function dumpSchema(args, local = false) {
  const directory = mkdtempSync(resolve(tmpdir(), 'openfray-schema-'))
  const path = resolve(directory, 'schema.sql')
  try {
    const execute = local ? runLocal : run
    execute('supabase', ['db', 'dump', ...args, '--schema', 'public', '--file', path])
    return canonicalSchemaDump(readFileSync(path, 'utf8'))
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

/** Read a JSON file that contains no credentials or authored content. */
function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

/** Retrieve non-secret hosted settings through the Supabase Management API. */
async function hostedConfiguration(projectRef) {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  if (!token)
    throw new Error('SUPABASE_ACCESS_TOKEN is required for hosted configuration verification.')
  const response = await fetch(`https://api.supabase.com/v2/projects/${projectRef}/config`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok)
    throw new Error(`Supabase configuration request failed with HTTP ${response.status}.`)
  const body = await response.json()
  if (!body?.data?.attributes)
    throw new Error('Supabase returned an unsupported configuration response.')
  return body.data.attributes
}

/** Verify a fresh rebuild, type drift, hosted configuration, and migration identity. */
async function main() {
  const options = parseArgs(process.argv.slice(2))
  const lineage = migrationLineage(migrationsDirectory)
  const expectedVersions = lineage.map(({ file }) => file.slice(0, 14))
  const expectedHead = expectedVersions.at(-1)
  const expectations = readJson(expectationsPath)
  const committedTypes = canonicalGeneratedTypes(readFileSync(generatedTypesPath, 'utf8'))

  runLocal('supabase', ['db', 'reset', '--local'])
  const localTypes = canonicalGeneratedTypes(generateTypes(['--local'], true))
  const localSchema = dumpSchema(['--local'], true)
  let generatedTypesResult = localTypes === committedTypes ? 'passed' : 'failed'
  let schemaResult = 'passed'
  let deployedSchema = localSchema
  let migrationHead = expectedHead
  let configurationResult = 'passed'
  let observedConfigurationHash = null
  let manualEvidence = []

  if (options.environment !== 'local') {
    const migrationList = run('supabase', [
      'migration',
      'list',
      '--project-ref',
      options.projectRef,
    ])
    const remoteVersions = remoteMigrationVersions(migrationList)
    migrationHead = remoteVersions.at(-1) ?? 'missing'
    if (JSON.stringify(remoteVersions) !== JSON.stringify(expectedVersions))
      migrationHead = 'mismatch'

    const remoteTypes = canonicalGeneratedTypes(generateTypes(['--project-id', options.projectRef]))
    if (remoteTypes !== committedTypes) generatedTypesResult = 'failed'

    deployedSchema = dumpSchema(['--project-ref', options.projectRef])
    if (deployedSchema !== localSchema) schemaResult = 'failed'

    const observed = await hostedConfiguration(options.projectRef)
    const comparison = compareHostedConfig(expectations.automatic, observed)
    observedConfigurationHash = sha256(JSON.stringify(comparison.selected))
    if (comparison.drift.length > 0) {
      configurationResult = 'failed'
      for (const item of comparison.drift) console.error(`Configuration drift: ${item.path}`)
    }

    const suppliedEvidence = options.manualEvidence ? readJson(options.manualEvidence) : null
    manualEvidence = compareManualEvidence(expectations.manual, suppliedEvidence)
    if (manualEvidence.some(({ result }) => result !== 'passed')) configurationResult = 'failed'
  }

  const attestation = buildDatabaseAttestation({
    consoleCommit: run('git', ['rev-parse', 'HEAD']).trim(),
    environmentKind: options.environment,
    environmentIdentity: options.projectRef ?? 'local',
    migrationHead,
    expectedMigrationHead: expectedHead,
    schemaHash: sha256(deployedSchema),
    lineageHash: schemaHash(lineage),
    schema: schemaResult,
    lineage,
    configurationExpectationHash: sha256(readFileSync(expectationsPath)),
    configurationObservedHash: observedConfigurationHash,
    configuration: configurationResult,
    manualEvidence,
    generatedTypeHash: sha256(committedTypes),
    generatedTypes: generatedTypesResult,
    freshReset: 'passed',
    workflow: options.workflow,
    approver: options.approver,
    timestamp: new Date().toISOString(),
  })

  mkdirSync(dirname(options.output), { recursive: true })
  writeFileSync(options.output, `${JSON.stringify(attestation, null, 2)}\n`)
  console.log(`Supabase authority: ${attestation.result}. Attestation: ${options.output}`)
  if (attestation.result !== 'passed') process.exitCode = 1
}

main().catch((error) => {
  console.error(`Supabase authority verification failed: ${error.message}`)
  process.exitCode = 1
})
