// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { LIBRARIES } from '../../src/compendium/libraries.ts'
import {
  PUBLICATION_SOURCE_MANIFEST,
  isPublicationShareCode,
  normalizePublication,
} from '../../src/publication/index.ts'

/** The publication entrypoint source as exact deployable bytes. */
const source = readFileSync(new URL('../../src/publication/index.ts', import.meta.url), 'utf8')

describe('publication boundary', () => {
  it('has no runtime dependency outside its Worker-safe module', () => {
    expect(source).not.toMatch(/^import\s/m)
    expect(source).not.toMatch(/\b(window|document|navigator|localStorage|sessionStorage|crypto)\b/)
    expect(source).not.toMatch(/(react|supabase|node:|filesystem|\bfs\b)/i)
  })

  it('describes every creature-bearing library with its source license', () => {
    const shipped = LIBRARIES.filter((library) => library.creaturesFile).map((library) => ({
      id: library.id,
      indexPath: library.creaturesFile!.replace(/-creatures\.json$/, '-creatures.index.json'),
      license: library.group === 'other' ? 'ogl-1.0a' : 'cc-by-4.0',
    }))
    expect(PUBLICATION_SOURCE_MANIFEST.sources).toEqual(shipped)
  })

  it('validates share codes without browser state', () => {
    expect(isPublicationShareCode('k7mqx3rt9p')).toBe(true)
    expect(isPublicationShareCode('not a code')).toBe(false)
    expect(normalizePublication(null)).toEqual({ status: 'invalid', reason: 'shape' })
  })
})
