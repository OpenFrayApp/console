// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { describe, expect, it } from 'vitest'
import {
  LIBRARIES,
  DEFAULT_ENABLED_LIBRARIES,
  editionBadgeClass,
  inEnabledLibrary,
  librarySource,
  librarySettingsLabel,
  libraryReferenceOnly,
  librarySourceBadgeClass,
  libraryTag,
  sanitizeEnabledLibraries,
} from '../../src/compendium/libraries.ts'

describe('libraries', () => {
  it('shows custom (homebrew) content per the show-homebrew flag; defaults to showing it', () => {
    // Default (flag omitted / true): custom shows whatever's enabled.
    expect(inEnabledLibrary({ id: 'custom:x', source: 'Homebrew' }, [])).toBe(true)
    expect(inEnabledLibrary({ id: 'custom:x', source: 'srd-5.1' }, ['srd-5.2'], true)).toBe(true)
    // Flag off: custom is hidden, even though it's never a "library".
    expect(inEnabledLibrary({ id: 'custom:x', source: 'Homebrew' }, [], false)).toBe(false)
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
    expect(librarySource('kobold-press-ccdx')).toBe('CCdx')
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

  it('ships content from every library — a registry entry is a claim there is something there', () => {
    for (const lib of LIBRARIES) {
      expect(lib.creaturesFile ?? lib.spellsFile, `${lib.id} declares no content file`).toBeTruthy()
    }
  })

  it('carries a book of spells and presets with no bestiary', () => {
    const sw = LIBRARIES.find((l) => l.id === 'openfray-strong-waters')!
    expect(sw.creaturesFile).toBeUndefined()
    expect(sw.spellsFile).toBe('strong-waters-spells.json')
    expect(sw.bookUrl).toBe('/strong-waters/')
    expect(librarySource('openfray-strong-waters')).toBe('SW&PS')
    expect(libraryTag('openfray-strong-waters')).toBe('5.5')
  })

  it('keeps third-party reference collections independent, opt-in, and on their verified 5e baseline', () => {
    const sources = [
      'kobold-press-toh',
      'kobold-press-deepm',
      'kibblestasty-casting-compendium-v2.3',
      'somanyrobots-spells-that-dont-suck',
      'somanyrobots-so-many-spells',
    ]
    for (const source of sources) {
      const library = LIBRARIES.find((entry) => entry.id === source)!
      expect(library.group).toBe('other')
      expect(library.spellsFile).toBeTruthy()
      expect(library.creaturesFile).toBeUndefined()
      expect(libraryReferenceOnly(source)).toBe(true)
      expect(libraryTag(source)).toBe('5.0')
      expect(DEFAULT_ENABLED_LIBRARIES).not.toContain(source)
      expect(sanitizeEnabledLibraries([source])).toEqual([source])
    }
    expect(LIBRARIES.find((library) => library.id === 'kobold-press-toh')?.license).toBe('ogl-1.0a')
    expect(librarySource('kobold-press-toh')).toBe('ToH')
    expect(librarySourceBadgeClass('kobold-press-toh')).toBe(
      librarySourceBadgeClass('kobold-press-tob3'),
    )
    expect(libraryReferenceOnly('srd-5.2')).toBe(false)
    expect(libraryReferenceOnly('custom')).toBe(false)
  })

  it('gives Kibbles its own color and shares the somanyrobots color across STDS and SMS', () => {
    const kibbles = librarySourceBadgeClass('kibblestasty-casting-compendium-v2.3')
    const stds = librarySourceBadgeClass('somanyrobots-spells-that-dont-suck')
    expect(kibbles).toContain('orange')
    expect(stds).toContain('cyan')
    expect(librarySourceBadgeClass('somanyrobots-so-many-spells')).toBe(stds)
    expect(kibbles).not.toBe(stds)
    for (const source of ['srd-5.2', 'kobold-press-tob', 'openfray-brood-and-bloom', 'custom']) {
      expect(kibbles).not.toBe(librarySourceBadgeClass(source))
      expect(stds).not.toBe(librarySourceBadgeClass(source))
    }
  })

  it('shortens Settings titles without modifying source attribution', () => {
    for (const library of LIBRARIES) {
      expect(librarySettingsLabel(library)).not.toMatch(/[()]/)
    }
    const library = LIBRARIES.find((entry) => entry.id === 'kibblestasty-casting-compendium-v2.3')!
    expect(librarySettingsLabel(library)).toBe('Kibbles’ Casting Compendium')
    expect(library.label).toBe('Kibbles’ Casting Compendium (KibblesTasty)')
    expect(library.spellsFile).toBe('kibbles-casting-v23-spells.json')
    expect(librarySettingsLabel({ label: 'Example (Author) collection (Publisher)' })).toBe(
      'Example collection',
    )
  })

  it('sanitizes a stored list: drops unknown ids, falls back when empty/invalid', () => {
    expect(sanitizeEnabledLibraries(['srd-5.1', 'bogus'])).toEqual(['srd-5.1'])
    expect(sanitizeEnabledLibraries(['bogus'])).toEqual(DEFAULT_ENABLED_LIBRARIES)
    expect(sanitizeEnabledLibraries(undefined)).toEqual(DEFAULT_ENABLED_LIBRARIES)
    expect(sanitizeEnabledLibraries('nope')).toEqual(DEFAULT_ENABLED_LIBRARIES)
  })
})
