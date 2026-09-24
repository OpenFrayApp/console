// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { expect, it } from 'vitest'
import { searchReferences } from '../../src/compendium/search.ts'
import { creature, spell } from '../fixtures.ts'

it('ranks exact names before prefixes and substrings, respecting libraries and homebrew', () => {
  const result = searchReferences(' fire ', {
    creatures: [
      creature({ name: 'Wild fire spirit' }),
      creature({ id: 'custom:fire', name: 'Fire' }),
    ],
    spells: [
      spell({ name: 'Fireball' }),
      spell({ id: 'old:fire', source: 'srd-5.1', name: 'Fire' }),
    ],
    characters: [{ id: 'pc:fire', name: 'Fire', ac: 12, maxHp: 20 }],
    enabledLibraries: ['srd-5.2'],
    showHomebrew: false,
  })
  expect(result.matches.map((r) => [r.kind, r.entry.name])).toEqual([
    ['character', 'Fire'],
    ['spell', 'Fireball'],
    ['creature', 'Wild fire spirit'],
  ])
  expect(result.total).toBe(3)
})

it('offers conditions, preserves every match, and leaves a blank query empty', () => {
  const data = {
    creatures: Array.from({ length: 12 }, (_, i) =>
      creature({ id: `g:${i}`, name: `Goblin ${i}` }),
    ),
    spells: [],
    characters: [],
    enabledLibraries: ['srd-5.2'],
    showHomebrew: true,
  }
  expect(searchReferences('goblin', data).matches).toHaveLength(12)
  expect(searchReferences('goblin', data).total).toBe(12)
  expect(searchReferences('prone', data).matches.map((r) => r.kind)).toEqual(['condition'])
  expect(searchReferences('  ', data)).toEqual({ matches: [], total: 0 })
})
