// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'

/** Return a lowercase SHA-256 digest for bytes or text. */
export function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
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

/** Normalize a public-schema dump while excluding environment-owned webhook triggers. */
export function canonicalSchemaDump(value) {
  return value
    .replace(/^\s*CREATE TRIGGER "(?:share-reports|takedown-notices)"[^\n]*\n/gm, '')
    .replace(/^\s*--.*$/gm, '')
    .replace(/^\s*\\(?:un)?restrict.*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Parse the exact remote migration versions from the CLI table. */
export function remoteMigrationVersions(value) {
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

/** Build the immutable, privacy-safe deployment attestation for AC-1. */
export function buildDatabaseAttestation(input) {
  const passed =
    input.freshReset === 'passed' &&
    input.generatedTypes === 'passed' &&
    input.migrationHead === input.expectedMigrationHead &&
    input.schema === 'passed' &&
    input.configuration === 'passed'

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
      result: input.schema,
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
    result: passed ? 'passed' : 'failed',
    workflow: input.workflow,
    approver: input.approver,
    timestamp: input.timestamp,
  }
}
