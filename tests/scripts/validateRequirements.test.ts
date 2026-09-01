// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const validator = 'scripts/validate-requirements.mjs'
const specification = 'docs/production-hardening/specification.md'
const registry = 'docs/production-hardening/requirements.json'
const temporaryDirectories: string[] = []

/** Write a changed registry to an isolated temporary directory. */
function writeRegistry(entries: unknown[]): string {
  const directory = mkdtempSync(join(tmpdir(), 'openfray-requirements-'))
  const path = join(directory, 'requirements.json')
  temporaryDirectories.push(directory)
  writeFileSync(path, `${JSON.stringify(entries, null, 2)}\n`)
  return path
}

/** Run the validator against a temporary registry and return its process result. */
function validate(entries: unknown[]) {
  return spawnSync(process.execPath, [validator, specification, writeRegistry(entries)], {
    encoding: 'utf8',
  })
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('production-hardening requirement registry', () => {
  it('validates the reviewed specification and canonical registry', () => {
    expect(() => execFileSync(process.execPath, [validator], { stdio: 'pipe' })).not.toThrow()
  })

  it('rejects duplicate requirement identifiers', () => {
    const entries = JSON.parse(readFileSync(registry, 'utf8')) as unknown[]
    entries.push(entries[0])

    const result = validate(entries)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('duplicate requirement identifier EF-1')
  })

  it('rejects missing requirement identifiers', () => {
    const entries = JSON.parse(readFileSync(registry, 'utf8')) as Array<{ id: string }>
    const missing = entries.pop()!.id

    const result = validate(entries)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain(`missing requirement identifier ${missing}`)
  })

  it('rejects unknown requirement identifiers', () => {
    const entries = JSON.parse(readFileSync(registry, 'utf8')) as Array<{ id: string }>
    entries[0] = { ...entries[0], id: 'UNKNOWN-1' }

    const result = validate(entries)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('unknown requirement identifier UNKNOWN-1')
  })

  it('rejects incomplete delivery metadata', () => {
    const entries = JSON.parse(readFileSync(registry, 'utf8')) as Array<Record<string, unknown>>
    delete entries[0].rollbackCondition

    const result = validate(entries)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('EF-1: rollbackCondition must be a non-empty string')
  })

  it('rejects unknown dependencies', () => {
    const entries = JSON.parse(readFileSync(registry, 'utf8')) as Array<{
      dependencies: string[]
    }>
    entries[0].dependencies = ['UNKNOWN-1']

    const result = validate(entries)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('EF-1: unknown dependency UNKNOWN-1')
  })

  it('rejects incomplete release-blocking status', () => {
    const entries = JSON.parse(readFileSync(registry, 'utf8')) as Array<{
      releaseBlocking: Record<string, unknown>
    }>
    delete entries[0].releaseBlocking.hardenedRelease

    const result = validate(entries)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('EF-1: releaseBlocking.hardenedRelease must be a boolean')
  })
})
