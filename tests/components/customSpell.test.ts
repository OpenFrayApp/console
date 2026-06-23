// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import {
  buildSpell,
  emptySpellDamageDraft,
  emptySpellDraft,
  scaleAndMerge,
  spellToDraft,
  spellVariantPreview,
  type SpellDraft,
} from '../../src/components/customSpell.ts'

function draft(overrides: Partial<SpellDraft> = {}): SpellDraft {
  return { ...emptySpellDraft(), ...overrides }
}

const dmg = (formula: string, type: SpellDraft['damage'][number]['type'] = 'fire') => ({
  ...emptySpellDamageDraft(),
  formula,
  type,
})

describe('buildSpell', () => {
  it('builds a utility spell with no mechanics', () => {
    const spell = buildSpell(draft({ name: 'Mage Hand', level: '0', resolution: 'none', damage: [] }))
    expect(spell.id).toMatch(/^custom:/)
    expect(spell.level).toBe(0)
    expect(spell.mechanics).toBeUndefined()
    expect(spell.source).toBe('custom')
  })

  it('captures an attack-roll spell with damage', () => {
    const spell = buildSpell(draft({ name: 'Fire Bolt', level: '0', resolution: 'attack', damage: [dmg('1d10')] }))
    expect(spell.mechanics?.attackRoll).toBe(true)
    expect(spell.mechanics?.damage).toEqual([{ formula: '1d10', type: 'fire' }])
    expect(spell.mechanics?.save).toBeUndefined()
  })

  it('captures a save spell without a DC (the caster owns it)', () => {
    const spell = buildSpell(
      draft({ name: 'Fireball', level: '3', resolution: 'save', saveAbility: 'dex', saveOutcome: 'half', damage: [dmg('8d6')] }),
    )
    expect(spell.mechanics?.save).toEqual({ ability: 'dex', onSave: 'half' })
    expect(Object.keys(spell.mechanics!.save!)).toEqual(['ability', 'onSave'])
  })

  it('uses a free-text source label as the source', () => {
    expect(buildSpell(draft({ name: 'X', sourceName: "Wyrd's Tome" })).source).toBe("Wyrd's Tome")
  })

  it('omits mechanics when scaling has no base damage', () => {
    const spell = buildSpell(draft({ name: 'X', resolution: 'none', damage: [], scalingIncrement: [dmg('1d6')] }))
    expect(spell.mechanics).toBeUndefined()
  })
})

describe('scaling (increment mode)', () => {
  it('expands a leveled spell to merged per-slot variants', () => {
    const spell = buildSpell(
      draft({ name: 'Fireball', level: '3', resolution: 'save', damage: [dmg('8d6')], scalingIncrement: [dmg('1d6')] }),
    )
    const scaling = spell.mechanics!.scaling!
    expect(scaling.map((s) => s.level)).toEqual([4, 5, 6, 7, 8, 9])
    expect(scaling.every((s) => s.by === 'slot')).toBe(true)
    expect(scaling[0].damage).toEqual([{ formula: '9d6', type: 'fire' }]) // slot 4 = 8d6 + 1d6
    expect(scaling[5].damage).toEqual([{ formula: '14d6', type: 'fire' }]) // slot 9 = +6d6
  })

  it('expands a cantrip across the character tiers', () => {
    const spell = buildSpell(
      draft({ name: 'Fire Bolt', level: '0', resolution: 'attack', damage: [dmg('1d10')], scalingIncrement: [dmg('1d10')] }),
    )
    const scaling = spell.mechanics!.scaling!
    expect(scaling.map((s) => s.level)).toEqual([5, 11, 17])
    expect(scaling.every((s) => s.by === 'character')).toBe(true)
    expect(scaling.map((s) => s.damage[0].formula)).toEqual(['2d10', '3d10', '4d10'])
  })

  it('appends a different damage type as its own component', () => {
    expect(scaleAndMerge([{ formula: '2d6', type: 'fire' }], [{ formula: '1d6', type: 'cold' }], 2)).toEqual([
      { formula: '2d6', type: 'fire' },
      { formula: '2d6', type: 'cold' },
    ])
  })
})

describe('scaling (manual mode)', () => {
  it('maps explicit per-level rows to scaling entries', () => {
    const spell = buildSpell(
      draft({
        name: 'Weird Spell',
        level: '1',
        resolution: 'save',
        damage: [dmg('1d4')],
        scalingMode: 'manual',
        scalingRows: [
          { id: 'a', level: '3', damage: [dmg('3d4')] },
          { id: 'b', level: '5', damage: [dmg('9d4')] },
        ],
      }),
    )
    expect(spell.mechanics!.scaling).toEqual([
      { level: 3, by: 'slot', damage: [{ formula: '3d4', type: 'fire' }] },
      { level: 5, by: 'slot', damage: [{ formula: '9d4', type: 'fire' }] },
    ])
  })
})

describe('spellVariantPreview', () => {
  it('lists the base and each higher-level formula', () => {
    const preview = spellVariantPreview(
      draft({ level: '3', damage: [dmg('8d6')], scalingIncrement: [dmg('1d6')] }),
    )
    expect(preview[0]).toEqual({ label: 'Level 3', formula: '8d6' })
    expect(preview[1]).toEqual({ label: 'Slot 4', formula: '9d6' })
  })

  it('is empty for a non-damaging spell', () => {
    expect(spellVariantPreview(draft({ damage: [] }))).toEqual([])
  })
})

describe('spellToDraft round-trip', () => {
  it('round-trips a regular leveled spell into increment mode', () => {
    const built = buildSpell(
      draft({ name: 'Fireball', level: '3', resolution: 'save', saveAbility: 'dex', damage: [dmg('8d6')], scalingIncrement: [dmg('1d6')] }),
    )
    const back = spellToDraft(built)
    expect(back.scalingMode).toBe('increment')
    expect(back.resolution).toBe('save')
    expect(back.damage.map((d) => d.formula)).toEqual(['8d6'])
    expect(back.scalingIncrement.map((d) => d.formula)).toEqual(['1d6'])
    // Rebuilding from the reversed draft reproduces the same spell mechanics.
    expect(buildSpell(back).mechanics!.scaling).toEqual(built.mechanics!.scaling)
  })

  it('falls back to manual mode for irregular scaling', () => {
    const built = buildSpell(
      draft({
        name: 'Odd',
        level: '1',
        resolution: 'save',
        damage: [dmg('1d4')],
        scalingMode: 'manual',
        scalingRows: [{ id: 'a', level: '4', damage: [dmg('5d4')] }],
      }),
    )
    const back = spellToDraft(built)
    expect(back.scalingMode).toBe('manual')
    expect(back.scalingRows.map((r) => r.level)).toEqual(['4'])
  })
})
