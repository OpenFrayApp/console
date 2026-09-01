// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const defaultCatalog = 'tests/fixtures/hardening/catalog.json'
const requiredClasses = new Set([
  'hostile',
  'malformed',
  'legacy',
  'recovery',
  'publication',
  'performance',
  'tenant-isolation',
])
const requiredCases = {
  hostile: ['unknown-keys', 'future-version', 'oversized-input', 'prototype-pollution'],
  malformed: ['malformed-children', 'truncated-json', 'wrong-aggregate-kind'],
  legacy: ['session-envelope-v1', 'encounter-with-legacy-effect'],
  recovery: ['current-and-previous', 'divergent-copies', 'quarantined-copy'],
  publication: ['published-encounter', 'published-creature', 'private-fields', 'unsupported-kind'],
  'tenant-isolation': [
    'owner-read',
    'cross-tenant-read',
    'cross-tenant-write',
    'anonymous-read',
    'owner-delete',
  ],
}
const fixtureIdentity =
  /^hardening\.(?:(?:hostile|malformed|legacy|recovery|publication|tenant-isolation)|performance\.(?:20|100))\.v[1-9]\d*$/
const forbiddenPrivacyKeys = new Set([
  'accesskey',
  'apikey',
  'authorization',
  'capability',
  'capabilities',
  'clientsecret',
  'credential',
  'credentials',
  'email',
  'password',
  'refreshtoken',
  'secret',
  'token',
])
const forbiddenPrivacyValues = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  /\bBearer\s+\S+/i,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
  /\b(?:AKIA|ghp_|github_pat_|glpat-|sbp_|sk-|sk_|xox[baprs]-)[A-Za-z0-9_-]{8,}\b/,
]

/** Return a SHA-256 fingerprint for exact fixture bytes. */
function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

/** Return whether a fixture path stays inside its catalog directory. */
function isLocalFixturePath(catalogDirectory, fixturePath) {
  if (typeof fixturePath !== 'string' || fixturePath.trim() === '') return false
  const local = relative(catalogDirectory, resolve(catalogDirectory, fixturePath))
  return local !== '' && local !== '..' && !local.startsWith(`..${sep}`) && !isAbsolute(local)
}

/** Walk fixture data and report values that could disclose private production data. */
function validatePrivacy(value, fixtureId, errors, path = '$') {
  if (typeof value === 'string') {
    if (forbiddenPrivacyValues.some((pattern) => pattern.test(value))) {
      errors.push(`${fixtureId}: privacy-sensitive value at ${path}`)
    }
    return
  }
  if (value === null || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = key.replace(/[_-]/g, '').toLowerCase()
    if (forbiddenPrivacyKeys.has(normalizedKey)) {
      errors.push(`${fixtureId}: privacy-sensitive key ${path}.${key}`)
    }
    validatePrivacy(child, fixtureId, errors, `${path}.${key}`)
  }
}

/** Return the case identifiers from a fixture case list. */
function caseIds(fixture, fixtureId, errors) {
  if (!Array.isArray(fixture.cases)) {
    errors.push(`${fixtureId}: cases must be an array`)
    return new Set()
  }
  const ids = fixture.cases.map((entry) => entry?.id).filter((id) => typeof id === 'string')
  if (ids.length !== new Set(ids).size) errors.push(`${fixtureId}: case identifiers must be unique`)
  return new Set(ids)
}

/** Return whether an object tree owns a named key. */
function hasKey(value, wanted) {
  if (value === null || typeof value !== 'object') return false
  return Object.entries(value).some(([key, child]) => key === wanted || hasKey(child, wanted))
}

/** Require the documented canonical cases for one fixture class. */
function validateRequiredCases(fixture, fixtureId, fixtureClass, errors) {
  const ids = caseIds(fixture, fixtureId, errors)
  for (const required of requiredCases[fixtureClass] ?? []) {
    if (!ids.has(required)) errors.push(`${fixtureId}: missing ${fixtureClass} case ${required}`)
  }
  return ids
}

/** Validate the hostile input classes later codecs must reject or normalize. */
function validateHostileFixture(fixture, fixtureId, errors) {
  validateRequiredCases(fixture, fixtureId, 'hostile', errors)
  const unknown = fixture.cases?.find((entry) => entry?.id === 'unknown-keys')
  if (!hasKey(unknown?.input, 'unknownEnvelope') || !hasKey(unknown?.input, 'unknownRoot')) {
    errors.push(`${fixtureId}: unknown-keys must contain envelope and payload unknown keys`)
  }
  const future = fixture.cases?.find((entry) => entry?.id === 'future-version')
  if (!Number.isInteger(future?.input?.schemaVersion) || future.input.schemaVersion <= 1) {
    errors.push(`${fixtureId}: future-version must use a future integer schema version`)
  }
  const oversized = fixture.cases?.find((entry) => entry?.id === 'oversized-input')
  if (
    !Number.isInteger(oversized?.limitBytes) ||
    oversized?.materialize?.kind !== 'repeated-string' ||
    typeof oversized?.materialize?.character !== 'string' ||
    new TextEncoder().encode(oversized.materialize.character).length !== 1 ||
    !Number.isInteger(oversized?.materialize?.byteLength) ||
    oversized.materialize.byteLength <= oversized.limitBytes
  ) {
    errors.push(`${fixtureId}: oversized-input must exceed its byte limit`)
  }
  const pollution = fixture.cases?.find((entry) => entry?.id === 'prototype-pollution')
  if (!hasKey(pollution?.input, '__proto__') || !hasKey(pollution?.input, 'constructor')) {
    errors.push(`${fixtureId}: prototype-pollution must carry __proto__ and constructor keys`)
  }
}

/** Validate malformed fixtures include every documented invalid shape. */
function validateMalformedFixture(fixture, fixtureId, errors) {
  validateRequiredCases(fixture, fixtureId, 'malformed', errors)
  const children = fixture.cases?.find((entry) => entry?.id === 'malformed-children')
  if (!Array.isArray(children?.input?.payload?.combatants)) {
    errors.push(`${fixtureId}: malformed-children must contain malformed combatants`)
  }
}

/** Validate legacy fixtures preserve both supported historical shapes. */
function validateLegacyFixture(fixture, fixtureId, errors) {
  validateRequiredCases(fixture, fixtureId, 'legacy', errors)
  const session = fixture.cases?.find((entry) => entry?.id === 'session-envelope-v1')
  if (session?.input?.version !== 1 || !session?.input?.snapshot?.encounter) {
    errors.push(`${fixtureId}: session-envelope-v1 must contain a version 1 session`)
  }
  const effect = fixture.cases?.find((entry) => entry?.id === 'encounter-with-legacy-effect')
  const hasLegacyDuration = effect?.input?.combatants?.some((combatant) =>
    combatant?.effects?.some((entry) => entry?.duration?.type === 'consumeOnRoll'),
  )
  if (!hasLegacyDuration) errors.push(`${fixtureId}: expected a consumeOnRoll effect`)
}

/** Validate recovery fixtures preserve revision and quarantine relationships. */
function validateRecoveryFixture(fixture, fixtureId, errors) {
  validateRequiredCases(fixture, fixtureId, 'recovery', errors)
  const retained = fixture.cases?.find((entry) => entry?.id === 'current-and-previous')
  if (
    !Number.isInteger(retained?.current?.revision) ||
    !Number.isInteger(retained?.previous?.revision) ||
    retained.current.revision <= retained.previous.revision
  ) {
    errors.push(`${fixtureId}: current recovery revision must follow the previous revision`)
  }
  const divergent = fixture.cases?.find((entry) => entry?.id === 'divergent-copies')
  if (
    !Number.isInteger(divergent?.device?.parentRevision) ||
    !Number.isInteger(divergent?.device?.revision) ||
    !Number.isInteger(divergent?.cloud?.revision) ||
    divergent.device.parentRevision !== divergent?.cloud?.parentRevision ||
    divergent.device.revision === divergent.cloud.revision
  ) {
    errors.push(`${fixtureId}: divergent copies must share a parent and have distinct revisions`)
  }
  const quarantined = fixture.cases?.find((entry) => entry?.id === 'quarantined-copy')
  if (
    typeof quarantined?.serialized !== 'string' ||
    quarantined?.expected !== 'quarantine-without-overwrite'
  ) {
    errors.push(`${fixtureId}: quarantined-copy must preserve rejected serialized input`)
  }
}

/** Validate publication fixtures use current successful template shapes. */
function validatePublicationFixture(fixture, fixtureId, errors) {
  validateRequiredCases(fixture, fixtureId, 'publication', errors)
  const encounter = fixture.cases?.find((entry) => entry?.id === 'published-encounter')
  if (
    encounter?.kind !== 'encounter' ||
    encounter?.input?.v !== 1 ||
    !Array.isArray(encounter?.input?.entries)
  ) {
    errors.push(`${fixtureId}: published-encounter must use the current encounter template`)
  }
  const creature = fixture.cases?.find((entry) => entry?.id === 'published-creature')
  if (
    creature?.kind !== 'creature' ||
    creature?.input?.v !== 1 ||
    typeof creature?.input?.name !== 'string' ||
    (!creature?.input?.ref && !creature?.input?.creature)
  ) {
    errors.push(`${fixtureId}: published-creature must use the current creature template`)
  }
  const privateFields = fixture.cases?.find((entry) => entry?.id === 'private-fields')
  if (privateFields?.expected !== 'allowlist-only' || !hasKey(privateFields?.input, 'dmNotes')) {
    errors.push(`${fixtureId}: private-fields must exercise publication allowlisting`)
  }
}

/** Validate tenant fixtures resolve every synthetic principal and row reference. */
function validateTenantFixture(fixture, fixtureId, errors) {
  validateRequiredCases(fixture, fixtureId, 'tenant-isolation', errors)
  const principals = new Set(fixture?.principals?.map((entry) => entry?.ref))
  const rows = new Set(fixture?.rows?.map((entry) => entry?.ref))
  if (!principals.has('anonymous')) errors.push(`${fixtureId}: expected an anonymous principal`)
  for (const row of fixture?.rows ?? []) {
    if (!principals.has(row?.ownerRef) || row.ownerRef === 'anonymous') {
      errors.push(`${fixtureId}: ${String(row?.ref)} must reference an authenticated owner`)
    }
  }
  const expectedAccess = {
    'owner-read': true,
    'cross-tenant-read': false,
    'cross-tenant-write': false,
    'anonymous-read': false,
    'owner-delete': true,
  }
  for (const entry of fixture?.cases ?? []) {
    if (!principals.has(entry?.principalRef)) {
      errors.push(`${fixtureId}: unknown principal reference ${String(entry?.principalRef)}`)
    }
    if (!rows.has(entry?.rowRef)) {
      errors.push(`${fixtureId}: unknown row reference ${String(entry?.rowRef)}`)
    }
    if (typeof entry?.allowed !== 'boolean') {
      errors.push(`${fixtureId}: ${String(entry?.id)} must declare allowed`)
    } else if (entry.allowed !== expectedAccess[entry.id]) {
      errors.push(`${fixtureId}: ${String(entry.id)} has the wrong access outcome`)
    }
  }
}

/** Validate one agreed encounter-size performance profile. */
function validatePerformanceFixture(fixture, fixtureId, expectedCombatants, errors) {
  const combatants = fixture?.encounter?.combatants
  const log = fixture?.encounter?.log
  if (!Array.isArray(combatants) || combatants.length !== expectedCombatants) {
    errors.push(`${fixtureId}: expected ${expectedCombatants} combatants`)
  }
  if (!Array.isArray(log) || log.length < 200) {
    errors.push(`${fixtureId}: expected at least 200 log entries`)
  }
  if (
    fixture?.profile?.combatants !== expectedCombatants ||
    fixture?.profile?.logEntries !== log?.length
  ) {
    errors.push(`${fixtureId}: profile counts must match the encounter`)
  }
  const complexity = new Set(fixture?.profile?.complexity)
  for (const required of ['effects', 'resources', 'damage-relations', 'initiative-ties']) {
    if (!complexity.has(required)) errors.push(`${fixtureId}: missing complexity ${required}`)
  }
  if (Array.isArray(combatants)) {
    const initiatives = combatants.map((combatant) => combatant?.initiative)
    if (new Set(initiatives).size === initiatives.length) {
      errors.push(`${fixtureId}: expected initiative ties`)
    }
    if (!combatants.some((combatant) => combatant?.effects?.length > 0)) {
      errors.push(`${fixtureId}: expected effects`)
    }
    if (!combatants.some((combatant) => Object.keys(combatant?.limitedUseState ?? {}).length > 0)) {
      errors.push(`${fixtureId}: expected resource state`)
    }
    if (
      !combatants.some(
        (combatant) =>
          (combatant?.creature?.resistances?.length ?? 0) > 0 ||
          (combatant?.creature?.immunities?.length ?? 0) > 0 ||
          (combatant?.creature?.vulnerabilities?.length ?? 0) > 0,
      )
    ) {
      errors.push(`${fixtureId}: expected damage relations`)
    }
  }
}

/** Validate the catalog and every referenced hardening fixture as one immutable corpus. */
export function validateFixtureCorpus(catalogPath = defaultCatalog) {
  const errors = []
  let catalog
  let catalogDirectory
  try {
    const absoluteCatalog = resolve(catalogPath)
    catalogDirectory = dirname(absoluteCatalog)
    catalog = JSON.parse(readFileSync(absoluteCatalog, 'utf8'))
  } catch (error) {
    return [`fixture catalog could not be read: ${error.message}`]
  }

  if (catalog?.catalogVersion !== 1) errors.push('catalogVersion must be 1')
  if (!Array.isArray(catalog?.fixtures)) return [...errors, 'fixtures must be an array']

  const seenIds = new Set()
  const seenPaths = new Set()
  const classes = new Set()
  const performanceSizes = new Set()
  for (const entry of catalog.fixtures) {
    const fixtureId = typeof entry?.id === 'string' ? entry.id : '<missing fixture id>'
    if (!fixtureIdentity.test(fixtureId)) {
      errors.push(`${fixtureId}: identity must be a canonical versioned hardening fixture ID`)
    }
    if (seenIds.has(fixtureId)) errors.push(`duplicate fixture identity ${fixtureId}`)
    seenIds.add(fixtureId)
    if (typeof entry?.fixtureClass !== 'string') {
      errors.push(`${fixtureId}: fixtureClass must be a string`)
    } else if (!requiredClasses.has(entry.fixtureClass)) {
      errors.push(`${fixtureId}: fixtureClass must be canonical`)
    } else {
      classes.add(entry.fixtureClass)
    }
    if (entry?.provenance !== 'synthetic') errors.push(`${fixtureId}: provenance must be synthetic`)
    if (typeof entry?.description !== 'string' || entry.description.trim() === '') {
      errors.push(`${fixtureId}: description must be a non-empty string`)
    }
    if (!isLocalFixturePath(catalogDirectory, entry?.path)) {
      errors.push(`${fixtureId}: path must stay inside the fixture directory`)
      continue
    }
    if (seenPaths.has(entry.path)) errors.push(`duplicate fixture path ${entry.path}`)
    seenPaths.add(entry.path)

    let raw
    let fixture
    try {
      raw = readFileSync(join(catalogDirectory, entry.path))
      fixture = JSON.parse(raw.toString('utf8'))
    } catch (error) {
      errors.push(`${fixtureId}: fixture could not be read: ${error.message}`)
      continue
    }
    const actualHash = sha256(raw)
    if (!/^[0-9a-f]{64}$/.test(entry.sha256 ?? '') || entry.sha256 !== actualHash) {
      errors.push(
        `${fixtureId}: SHA-256 mismatch; expected ${entry.sha256}, received ${actualHash}`,
      )
    }
    if (fixture?.provenance !== 'synthetic') {
      errors.push(`${fixtureId}: fixture provenance must be synthetic`)
    }
    validatePrivacy(fixture, fixtureId, errors)

    if (entry.fixtureClass === 'hostile') validateHostileFixture(fixture, fixtureId, errors)
    if (entry.fixtureClass === 'malformed') validateMalformedFixture(fixture, fixtureId, errors)
    if (entry.fixtureClass === 'legacy') validateLegacyFixture(fixture, fixtureId, errors)
    if (entry.fixtureClass === 'recovery') validateRecoveryFixture(fixture, fixtureId, errors)
    if (entry.fixtureClass === 'publication') validatePublicationFixture(fixture, fixtureId, errors)
    if (entry.fixtureClass === 'tenant-isolation') validateTenantFixture(fixture, fixtureId, errors)
    if (entry.fixtureClass === 'performance') {
      const expectedCombatants = fixture?.profile?.combatants
      if (expectedCombatants === 20 || expectedCombatants === 100) {
        performanceSizes.add(expectedCombatants)
        validatePerformanceFixture(fixture, fixtureId, expectedCombatants, errors)
      } else {
        errors.push(`${fixtureId}: performance profile must contain 20 or 100 combatants`)
      }
    }
  }

  for (const fixtureClass of requiredClasses) {
    if (!classes.has(fixtureClass)) errors.push(`missing fixture class ${fixtureClass}`)
  }
  for (const size of [20, 100]) {
    if (!performanceSizes.has(size)) errors.push(`missing ${size}-combatant performance fixture`)
  }
  return errors
}

/** Return the validated, privacy-safe fixture fields accepted by release evidence. */
export function releaseFixtureEvidence(catalogPath = defaultCatalog) {
  const errors = validateFixtureCorpus(catalogPath)
  if (errors.length > 0) return { errors, fixtures: [] }
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'))
  return {
    errors: [],
    fixtures: catalog.fixtures.map((fixture) => ({
      id: fixture.id,
      fixtureClass: fixture.fixtureClass,
      sha256: fixture.sha256,
    })),
  }
}

/** Read, validate, and report the fixture catalog selected by the command line. */
function main() {
  const arguments_ = process.argv.slice(2)
  const evidenceRequested = arguments_.includes('--evidence')
  const catalogPath = arguments_.find((argument) => argument !== '--evidence') ?? defaultCatalog
  const evidence = releaseFixtureEvidence(catalogPath)
  if (evidence.errors.length > 0) {
    for (const error of evidence.errors) console.error(error)
    process.exitCode = 1
    return
  }
  if (evidenceRequested) {
    console.log(JSON.stringify({ fixtures: evidence.fixtures }))
    return
  }
  console.log(`Validated ${evidence.fixtures.length} canonical hardening fixtures.`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
