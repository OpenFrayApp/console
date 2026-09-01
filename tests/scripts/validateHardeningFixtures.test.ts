// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { createHash } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { parseTemplate } from '../../src/combat/encounterTemplate.ts'
import { parseCreatureTemplate } from '../../src/combat/creatureTemplate.ts'

const validator = 'scripts/validate-hardening-fixtures.mjs'
const canonicalDirectory = 'tests/fixtures/hardening'
const temporaryDirectories: string[] = []

type Catalog = {
  fixtures: Array<{
    id: string
    fixtureClass: string
    path: string
    sha256: string
  }>
}

/** Copy the canonical fixture corpus into an isolated temporary directory. */
function copyCorpus(): { directory: string; catalogPath: string } {
  const directory = mkdtempSync(join(tmpdir(), 'openfray-hardening-fixtures-'))
  temporaryDirectories.push(directory)
  cpSync(canonicalDirectory, directory, { recursive: true })
  return { directory, catalogPath: join(directory, 'catalog.json') }
}

/** Read a copied catalog. */
function readCatalog(catalogPath: string): Catalog {
  return JSON.parse(readFileSync(catalogPath, 'utf8')) as Catalog
}

/** Write a copied catalog with canonical JSON formatting. */
function writeCatalog(catalogPath: string, catalog: Catalog): void {
  writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`)
}

/** Replace one fixture and update its catalog fingerprint. */
function replaceFixture(
  directory: string,
  catalogPath: string,
  fixtureId: string,
  fixture: unknown,
): void {
  const catalog = readCatalog(catalogPath)
  const entry = catalog.fixtures.find((candidate) => candidate.id === fixtureId)!
  const raw = `${JSON.stringify(fixture, null, 2)}\n`
  writeFileSync(join(directory, entry.path), raw)
  entry.sha256 = createHash('sha256').update(raw).digest('hex')
  writeCatalog(catalogPath, catalog)
}

/** Run the fixture validator against one copied catalog. */
function validate(catalogPath: string) {
  return spawnSync(process.execPath, [validator, catalogPath], { encoding: 'utf8' })
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('canonical hardening fixture corpus', () => {
  it('validates every canonical fixture and stable hash', () => {
    expect(() => execFileSync(process.execPath, [validator], { stdio: 'pipe' })).not.toThrow()
  })

  it('rejects a fixture changed without a new catalog hash', () => {
    const { directory, catalogPath } = copyCorpus()
    const path = join(directory, 'legacy.json')
    writeFileSync(path, readFileSync(path, 'utf8').replace('Synthetic legacy roll', 'Changed'))

    const result = validate(catalogPath)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('hardening.legacy.v1: SHA-256 mismatch')
  })

  it('requires every fixture class and both performance profiles', () => {
    const { catalogPath } = copyCorpus()
    const catalog = readCatalog(catalogPath)
    catalog.fixtures = catalog.fixtures.filter(
      (entry) =>
        entry.id !== 'hardening.recovery.v1' && entry.id !== 'hardening.performance.100.v1',
    )
    writeCatalog(catalogPath, catalog)

    const result = validate(catalogPath)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('missing fixture class recovery')
    expect(result.stderr).toContain('missing 100-combatant performance fixture')
  })

  it('requires a non-empty versioned stable identity', () => {
    const { catalogPath } = copyCorpus()
    const catalog = readCatalog(catalogPath)
    catalog.fixtures[0].id = ''
    writeCatalog(catalogPath, catalog)

    const result = validate(catalogPath)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('identity must be a non-empty versioned hardening fixture ID')
  })

  it('requires every documented canonical case', () => {
    const { directory, catalogPath } = copyCorpus()
    const removals = [
      ['hardening.hostile.v1', 'hostile.json', 'prototype-pollution'],
      ['hardening.malformed.v1', 'malformed.json', 'wrong-aggregate-kind'],
      ['hardening.legacy.v1', 'legacy.json', 'encounter-with-legacy-effect'],
      ['hardening.recovery.v1', 'recovery.json', 'divergent-copies'],
      ['hardening.publication.v1', 'publication.json', 'published-creature'],
      ['hardening.tenant-isolation.v1', 'tenant-isolation.json', 'cross-tenant-write'],
    ] as const
    for (const [fixtureId, path, caseId] of removals) {
      const fixture = JSON.parse(readFileSync(join(directory, path), 'utf8')) as {
        cases: Array<{ id: string }>
      }
      fixture.cases = fixture.cases.filter((entry) => entry.id !== caseId)
      replaceFixture(directory, catalogPath, fixtureId, fixture)
    }

    const result = validate(catalogPath)

    expect(result.status).toBe(1)
    for (const [, , caseId] of removals) expect(result.stderr).toContain(caseId)
  })

  it('uses publication fixtures accepted by the current template parsers', () => {
    const publication = JSON.parse(
      readFileSync(join(canonicalDirectory, 'publication.json'), 'utf8'),
    ) as { cases: Array<{ id: string; input: unknown }> }
    const encounter = publication.cases.find((entry) => entry.id === 'published-encounter')!
    const creature = publication.cases.find((entry) => entry.id === 'published-creature')!

    expect(parseTemplate(encounter.input).template).toBeDefined()
    expect(parseCreatureTemplate(creature.input).template).toBeDefined()
  })

  it('validates publication schemas and tenant relationships', () => {
    const { directory, catalogPath } = copyCorpus()
    const publication = JSON.parse(readFileSync(join(directory, 'publication.json'), 'utf8')) as {
      cases: Array<{ id: string; input?: { v?: number } }>
    }
    publication.cases.find((entry) => entry.id === 'published-encounter')!.input!.v = 2
    replaceFixture(directory, catalogPath, 'hardening.publication.v1', publication)

    const tenants = JSON.parse(readFileSync(join(directory, 'tenant-isolation.json'), 'utf8')) as {
      cases: Array<{ id: string; rowRef: string }>
    }
    tenants.cases.find((entry) => entry.id === 'cross-tenant-read')!.rowRef = 'missing-row'
    replaceFixture(directory, catalogPath, 'hardening.tenant-isolation.v1', tenants)

    const result = validate(catalogPath)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('published-encounter must use the current encounter template')
    expect(result.stderr).toContain('unknown row reference missing-row')
  })

  it('rejects privacy-sensitive identifiers and credential fields', () => {
    const { directory, catalogPath } = copyCorpus()
    const publication = JSON.parse(readFileSync(join(directory, 'publication.json'), 'utf8')) as {
      cases: unknown[]
      provenance: string
      fixtureVersion: number
    }
    publication.cases.push({
      id: 'unsafe',
      email: 'person@example.com',
      refresh_token: 'fixture',
      client_secret: 'ghp_1234567890abcdef',
    })
    replaceFixture(directory, catalogPath, 'hardening.publication.v1', publication)

    const result = validate(catalogPath)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('privacy-sensitive key $.cases.4.email')
    expect(result.stderr).toContain('privacy-sensitive value at $.cases.4.email')
    expect(result.stderr).toContain('privacy-sensitive key $.cases.4.refresh_token')
    expect(result.stderr).toContain('privacy-sensitive key $.cases.4.client_secret')
    expect(result.stderr).toContain('privacy-sensitive value at $.cases.4.client_secret')
  })

  it('enforces the agreed performance counts and complexity', () => {
    const { directory, catalogPath } = copyCorpus()
    const performance = JSON.parse(
      readFileSync(join(directory, 'performance-20.json'), 'utf8'),
    ) as {
      profile: { combatants: number; logEntries: number; complexity: string[] }
      encounter: { combatants: unknown[]; log: unknown[] }
    }
    performance.encounter.log = performance.encounter.log.slice(0, 199)
    performance.profile.logEntries = 199
    performance.profile.complexity = performance.profile.complexity.filter(
      (entry) => entry !== 'damage-relations',
    )
    replaceFixture(directory, catalogPath, 'hardening.performance.20.v1', performance)

    const result = validate(catalogPath)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      'hardening.performance.20.v1: expected at least 200 log entries',
    )
    expect(result.stderr).toContain(
      'hardening.performance.20.v1: missing complexity damage-relations',
    )
  })
})
