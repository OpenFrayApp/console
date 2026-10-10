// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { readFileSync } from 'node:fs'
import { afterEach, expect, it, vi } from 'vitest'
import type { Creature } from '../../src/schema/creature.ts'
import type { Spell } from '../../src/schema/spell.ts'
import { projectCreature } from '../../src/schema/creatureInput.ts'
import { licenseOfSource } from '../../src/schema/license.ts'
import {
  DEFAULT_ENABLED_LIBRARIES,
  LIBRARIES,
  inEnabledLibrary,
  librarySource,
  libraryTag,
  sanitizeEnabledLibraries,
} from '../../src/compendium/libraries.ts'

const creatures: Creature[] = JSON.parse(
  readFileSync(new URL('../../public/compendium/khyberia-creatures.json', import.meta.url), 'utf8'),
)
const spells: Spell[] = JSON.parse(
  readFileSync(new URL('../../public/compendium/srd-2014-spells.json', import.meta.url), 'utf8'),
)

afterEach(() => vi.unstubAllGlobals())

it('registers Khyberia as an opt-in CC-BY 5e creature-only library', () => {
  const library = LIBRARIES.find((entry) => entry.id === 'khyberia-srd')!
  expect(library.creaturesFile).toBe('khyberia-creatures.json')
  expect(library.spellsFile).toBeUndefined()
  expect(library.group).toBe('other')
  expect(licenseOfSource(library.id)).toBe('cc-by-4.0')
  expect(libraryTag(library.id)).toBe('5.0')
  expect(librarySource(library.id)).toBe('KHYBERIA')
  expect(DEFAULT_ENABLED_LIBRARIES).not.toContain(library.id)
  expect(sanitizeEnabledLibraries([library.id])).toEqual([library.id])
  expect(inEnabledLibrary(creatures[0], DEFAULT_ENABLED_LIBRARIES)).toBe(false)
  expect(inEnabledLibrary(creatures[0], [library.id])).toBe(true)
})

it('ships all 21 blocks with stable source ids and valid creature projections', () => {
  expect(creatures).toHaveLength(21)
  expect(new Set(creatures.map((entry) => entry.id)).size).toBe(21)
  for (const creature of creatures) {
    expect(creature.id).toMatch(/^khyberia-srd:/)
    expect(creature.source).toBe('khyberia-srd')
    expect(creature.edition).toBe('5.0')
    expect(creature.sourcePage).toBeGreaterThanOrEqual(2)
    expect(creature.sourcePage).toBeLessThanOrEqual(14)
    expect(projectCreature(creature), creature.name).not.toBeNull()
    for (const group of creature.spellcasting?.groups ?? []) {
      for (const spell of group.spells)
        expect(
          spells.some((entry) => entry.id === spell.ref),
          `${creature.name}: ${spell.ref}`,
        ).toBe(true)
    }
  }
})

it('loads the actual shipped dataset without fetching a separate spell library', async () => {
  vi.resetModules()
  const fetch = vi.fn(async () => ({ json: async () => creatures }))
  vi.stubGlobal('fetch', fetch)
  const { loadLibraries } = await import('../../src/compendium/srd.ts')
  const result = await loadLibraries(['khyberia-srd'], { strict: true })
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(fetch).toHaveBeenCalledWith('/console/compendium/khyberia-creatures.json')
  expect(result.creatures).toEqual(creatures)
  expect(result.spells).toEqual([])
})

it('keeps conditional rules and published inconsistencies visible without invented statistics', () => {
  const warSnail = creatures.find((entry) => entry.name === 'War Snail')!
  expect(warSnail.ac).toBe(16)
  const colors = warSnail.actions!.find((entry) => entry.name.startsWith('Scintillating Colors'))!
  expect(colors.name).toContain('Short or Long Rest')
  expect(colors.recharge).toBeUndefined()
  const wodyanoi = creatures.find((entry) => entry.name === 'Wodyanoi')!
  expect(wodyanoi.actions!.find((entry) => entry.name === 'Gyre')!.save).toBeUndefined()
  expect(wodyanoi.actions!.find((entry) => entry.name === 'Tusk')!.text).toContain('7 (2d6 + 4)')
  const xanthos = creatures.find((entry) => entry.name === 'Xanthos B’lot')!
  expect(xanthos.traits!.find((entry) => entry.name === 'Chaos Swell table')!.text).toContain(
    'flesh to stone',
  )
})

it('credits the author and both upstream SRDs, links the license, and discloses adaptations', () => {
  const credits = readFileSync(new URL('../../CREDITS.md', import.meta.url), 'utf8').replace(
    /\s+/g,
    ' ',
  )
  expect(credits).toContain(
    'This work includes material taken from the Khyberia SRD by Nick Stefanski, available at www.khyberia.com.',
  )
  expect(credits).toContain(
    'This work includes material taken from the A5E System Reference Document (A5ESRD) by EN Publishing',
  )
  expect(credits).toContain(
    'This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC',
  )
  expect(credits).toContain('https://creativecommons.org/licenses/by/4.0/legalcode')
  expect(credits).toContain('Published statistics were not corrected.')
  expect(credits).toContain('OpenFray is not affiliated with or endorsed by Nick Stefanski')
})
