// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import {
  mapOpen5eSpell,
  mapSource,
  slugFromKey,
  type Open5eSpell,
} from '../../src/compendium/open5e.ts'

// Trimmed from the real Open5e v2 srd-2024 "Acid Arrow" record.
const ACID_ARROW: Open5eSpell = {
  key: 'srd-2024_acid-arrow',
  document: { key: 'srd-2024' },
  name: 'Acid Arrow',
  desc: 'A shimmering green arrow streaks toward a target.',
  higher_level: 'The damage increases by 1d4 for each slot level above 2.',
  level: 2,
  school: { name: 'Evocation' },
  classes: [{ name: 'Wizard' }],
  casting_time: 'action',
  range_text: '90 feet',
  duration: 'instantaneous',
  concentration: false,
  ritual: false,
  verbal: true,
  somatic: true,
  material: true,
  material_specified: 'powdered rhubarb leaf',
}

describe('mapSource', () => {
  it('maps SRD document keys to source + edition', () => {
    expect(mapSource('srd-2024')).toEqual({ source: 'srd-5.2', edition: '5.5' })
    expect(mapSource('srd-2014')).toEqual({ source: 'srd-5.1', edition: '5.0' })
  })

  it('passes through third-party document keys', () => {
    expect(mapSource('tob')).toEqual({ source: 'tob' })
  })
})

describe('slugFromKey', () => {
  it('strips the document prefix', () => {
    expect(slugFromKey('srd-2024_acid-arrow', 'srd-2024')).toBe('acid-arrow')
  })
})

describe('mapOpen5eSpell', () => {
  it('maps an Open5e v2 spell into the schema', () => {
    const spell = mapOpen5eSpell(ACID_ARROW)
    expect(spell.id).toBe('srd-5.2:acid-arrow')
    expect(spell.source).toBe('srd-5.2')
    expect(spell.edition).toBe('5.5')
    expect(spell.name).toBe('Acid Arrow')
    expect(spell.level).toBe(2)
    expect(spell.school).toBe('Evocation')
    expect(spell.range).toBe('90 feet')
    expect(spell.components).toEqual({
      verbal: true,
      somatic: true,
      material: true,
      materials: 'powdered rhubarb leaf',
    })
    expect(spell.classes).toEqual(['Wizard'])
    expect(spell.text).toContain('At Higher Levels:')
  })

  it('omits the higher-level note when absent', () => {
    const spell = mapOpen5eSpell({ ...ACID_ARROW, higher_level: null })
    expect(spell.text).not.toContain('At Higher Levels:')
  })
})
