// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ENABLED_LIBRARIES,
  editionBadgeClass,
  inEnabledLibrary,
  librarySource,
  librarySourceBadgeClass,
  libraryTag,
  sanitizeEnabledLibraries,
} from '../../src/compendium/libraries.ts'

describe('libraries', () => {
  it('always shows custom content, whatever is enabled', () => {
    expect(inEnabledLibrary({ id: 'custom:x', source: 'Homebrew' }, [])).toBe(true)
    expect(inEnabledLibrary({ id: 'custom:x', source: 'srd-5.1' }, ['srd-5.2'])).toBe(true)
  })

  it('shows an SRD entry only when its source is enabled', () => {
    const a = { id: 'srd-5.2:goblin', source: 'srd-5.2' }
    const b = { id: 'srd-5.1:goblin', source: 'srd-5.1' }
    expect(inEnabledLibrary(a, ['srd-5.2'])).toBe(true)
    expect(inEnabledLibrary(b, ['srd-5.2'])).toBe(false)
    expect(inEnabledLibrary(b, ['srd-5.2', 'srd-5.1'])).toBe(true)
  })

  it('tags a source with its edition', () => {
    expect(libraryTag('srd-5.1')).toBe('5.0')
    expect(libraryTag('srd-5.2')).toBe('5.5')
    expect(libraryTag('custom')).toBeUndefined()
  })

  it('labels a source compactly (Core vs ToB3 disambiguates same-edition sources)', () => {
    expect(librarySource('srd-5.2')).toBe('Core')
    expect(librarySource('srd-5.1')).toBe('Core')
    expect(librarySource('kobold-press-tob3')).toBe('ToB3')
    expect(librarySource('custom')).toBeUndefined()
  })

  it('colors source badges by family: siblings match, different families differ', () => {
    // Both SRD "Core" sets share one color; ToB is its own.
    expect(librarySourceBadgeClass('srd-5.2')).toBe(librarySourceBadgeClass('srd-5.1'))
    expect(librarySourceBadgeClass('kobold-press-tob3')).not.toBe(
      librarySourceBadgeClass('srd-5.2'),
    )
    // Unknown sources still get a (fallback) class, never empty.
    expect(librarySourceBadgeClass('whatever')).toBeTruthy()
  })

  it('colors edition badges so 5.5 and 5.0 differ', () => {
    expect(editionBadgeClass('5.5')).not.toBe(editionBadgeClass('5.0'))
    expect(editionBadgeClass(undefined)).toBeTruthy()
  })

  it('sanitizes a stored list: drops unknown ids, falls back when empty/invalid', () => {
    expect(sanitizeEnabledLibraries(['srd-5.1', 'bogus'])).toEqual(['srd-5.1'])
    expect(sanitizeEnabledLibraries(['bogus'])).toEqual(DEFAULT_ENABLED_LIBRARIES)
    expect(sanitizeEnabledLibraries(undefined)).toEqual(DEFAULT_ENABLED_LIBRARIES)
    expect(sanitizeEnabledLibraries('nope')).toEqual(DEFAULT_ENABLED_LIBRARIES)
  })
})
