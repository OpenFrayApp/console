// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'

/** Return a lowercase SHA-256 digest for bytes or text. */
export function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

/** Return CLI arguments for one credentialed hosted database URL. */
export function hostedDatabaseArgs(databaseUrl) {
  let parsed
  try {
    parsed = new URL(databaseUrl)
  } catch {
    throw new Error('SUPABASE_DB_URL must be a valid PostgreSQL URL.')
  }
  if (
    !['postgres:', 'postgresql:'].includes(parsed.protocol) ||
    !parsed.hostname ||
    !parsed.username ||
    !parsed.password
  ) {
    throw new Error('SUPABASE_DB_URL must be a credentialed PostgreSQL URL.')
  }
  return ['--db-url', databaseUrl]
}

/** Return the ordered migration files that define the database authority. */
export function migrationLineage(directory) {
  const files = readdirSync(directory)
    .filter((file) => /^\d{14}_[a-z0-9_]+\.sql$/.test(file))
    .sort()
  if (files.length === 0) throw new Error('No tracked Supabase migrations were found.')
  return files.map((file) => ({
    file,
    hash: sha256(readFileSync(join(directory, file))),
  }))
}

/** Hash the ordered migration names and contents as one reviewed schema identity. */
export function schemaHash(lineage) {
  return sha256(lineage.map(({ file, hash }) => `${file}:${hash}`).join('\n'))
}

/** Select and normalize the generated public schema while ignoring generator scaffolding. */
export function canonicalGeneratedTypes(value) {
  const marker = 'public: {'
  const start = value.indexOf(marker)
  if (start < 0) throw new Error('Generated database types do not contain the public schema.')
  const opening = value.indexOf('{', start)
  let depth = 0
  for (let index = opening; index < value.length; index += 1) {
    if (value[index] === '{') depth += 1
    if (value[index] === '}') depth -= 1
    if (depth === 0) {
      return value
        .slice(start, index + 1)
        .replace(/["']/g, '"')
        .replace(/\s+/g, ' ')
        .trim()
    }
  }
  throw new Error('Generated database types contain an incomplete public schema.')
}

/** Sort standalone pg_dump column declarations while retaining SQL literals and function bodies. */
function canonicalTableColumns(value) {
  const literals = []
  const protectedSql = value.replace(
    /'(?:''|\\.|[^'\\])*'|(\$(?:[A-Za-z_]\w*)?\$)[\s\S]*?\1/g,
    (literal) => {
      literals.push(literal)
      return `\0${literals.length - 1}\0`
    },
  )
  return protectedSql
    .replace(
      /^(CREATE TABLE (?:IF NOT EXISTS )?"public"\."(?:[^"]|"")*" \(\n)([\s\S]*?)(\n\);)/gm,
      (statement, opening, body, closing) => {
        const definitions = body.split('\n').map((line) => line.replace(/,$/, ''))
        if (!definitions.every((line) => /^ {4}(?:"|CONSTRAINT )/.test(line))) return statement
        const columns = definitions.filter((line) => line.startsWith('    "')).sort()
        const constraints = definitions.filter((line) => !line.startsWith('    "'))
        return opening + [...columns, ...constraints].join(',\n') + closing
      },
    )
    .replace(/\0(\d+)\0/g, (_, index) => literals[Number(index)])
}

/** Compare named schema definitions while excluding environment-owned webhook triggers. */
export function canonicalSchemaDump(value) {
  return canonicalTableColumns(value)
    .replace(
      /^\s*CREATE (?:OR REPLACE )?TRIGGER "(?:share-reports|takedown-notices)"[^\n]*\n/gm,
      '',
    )
    .replace(/^\s*--.*$/gm, '')
    .replace(/^\s*\\(?:un)?restrict.*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Parse the exact remote migration versions from CLI JSON or its legacy table. */
export function remoteMigrationVersions(value) {
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed?.migrations)) {
      return parsed.migrations
        .map(({ remote }) => remote)
        .filter((version) => /^\d{14}$/.test(version))
    }
  } catch {
    // Older CLI releases emit a table, which remains supported during tool upgrades.
  }

  return value
    .split('\n')
    .map((line) => line.split('|'))
    .filter((columns) => columns.length >= 2)
    .map((columns) => columns[1].replace(/[`\s]/g, ''))
    .filter((version) => /^\d{14}$/.test(version))
}

/** Select the expected non-secret provider values from an observed config. */
export function compareHostedConfig(expected, observed) {
  const drift = []
  const selected = {}

  /** Compare one expected subtree while building a privacy-safe selected result. */
  function walk(want, got, path, output) {
    for (const [key, value] of Object.entries(want)) {
      const nextPath = path ? `${path}.${key}` : key
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        output[key] = {}
        walk(value, got?.[key], nextPath, output[key])
      } else {
        output[key] = got?.[key] ?? null
        if (got?.[key] !== value)
          drift.push({ path: nextPath, expected: value, actual: got?.[key] ?? null })
      }
    }
  }

  walk(expected, observed, '', selected)
  return { drift, selected }
}

/** Validate explicit evidence for provider settings that cannot be inspected automatically. */
export function compareManualEvidence(expectations, evidence) {
  const byId = new Map((evidence?.checks ?? []).map((check) => [check.id, check]))
  return expectations.map(({ id }) => {
    const check = byId.get(id)
    const safeReference =
      check?.result === 'passed' &&
      typeof check.evidence === 'string' &&
      /^(?:release|github:issue)\/[A-Za-z0-9][A-Za-z0-9._:/#-]{0,180}$/.test(check.evidence)
    return {
      id,
      result: safeReference ? 'passed' : 'missing',
      evidence: safeReference ? check.evidence : null,
    }
  })
}

/** Refuse untracked histories and missing provider references before hosted migrations. */
export function assertDatabasePromotion(expected, remote, environment, expectations, evidence) {
  if (!['staging', 'production'].includes(environment)) {
    throw new Error('A named hosted environment is required.')
  }
  if (
    !Array.isArray(expected) ||
    expected.length === 0 ||
    !Array.isArray(remote) ||
    [...expected, ...remote].some((version) => !/^\d{14}$/.test(version)) ||
    new Set(expected).size !== expected.length ||
    new Set(remote).size !== remote.length ||
    remote.some((version, index) => version !== expected[index]) ||
    (environment === 'production' && remote.length === 0)
  ) {
    throw new Error(
      'Hosted migration history needs reviewed baseline reconciliation before promotion.',
    )
  }
  if (compareManualEvidence(expectations, evidence).some(({ result }) => result !== 'passed')) {
    throw new Error('Required provider evidence is missing or invalid. No migrations were applied.')
  }
}

/** Build the immutable, privacy-safe deployment attestation for AC-1. */
export function buildDatabaseAttestation(input) {
  const checks = {
    freshReset: input.freshReset,
    generatedTypes: input.generatedTypes,
    migrationLineage: input.migrationHead === input.expectedMigrationHead ? 'passed' : 'failed',
    schema: input.schema,
    configuration: input.configuration,
  }
  const passed = Object.values(checks).every((result) => result === 'passed')

  return {
    version: 1,
    requirementIds: ['AC-1'],
    consoleCommit: input.consoleCommit,
    environment: {
      kind: input.environmentKind,
      identity: input.environmentIdentity,
    },
    migration: {
      head: input.migrationHead,
      schemaHash: input.schemaHash,
      lineageHash: input.lineageHash,
      result:
        checks.migrationLineage === 'passed' && checks.schema === 'passed' ? 'passed' : 'failed',
      files: input.lineage.map(({ file, hash }) => ({ file: basename(file), hash })),
    },
    configuration: {
      expectationHash: input.configurationExpectationHash,
      observedHash: input.configurationObservedHash,
      result: input.configuration,
      manualEvidence: input.manualEvidence,
    },
    generatedTypes: {
      hash: input.generatedTypeHash,
      result: input.generatedTypes,
    },
    freshReset: input.freshReset,
    checks,
    result: passed ? 'passed' : 'failed',
    workflow: input.workflow,
    approver: input.approver,
    timestamp: input.timestamp,
  }
}
