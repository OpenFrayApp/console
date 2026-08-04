// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import type { Effect, EffectApplies, EffectMode } from '../../src/schema/effect.ts'
import {
  EXHAUSTION_MAX,
  clampLevel,
  describeExhaustion,
  exhaustionAnchor,
  exhaustionEffects,
  exhaustionLevel,
  isExhaustion,
  withExhaustion,
} from '../../src/combat/exhaustion.ts'
import { condition, counterOf, reminder, survivesLongRest } from '../../src/combat/effects.ts'

/** The modifier parts of a built level, as `applies: mode: value` triples to assert on. */
const mods = (effects: Effect[]): { applies: EffectApplies; mode: EffectMode; value: unknown }[] =>
  effects.flatMap((e) =>
    e.modifier
      ? [{ applies: e.modifier.applies, mode: e.modifier.mode, value: e.modifier.value }]
      : [],
  )

describe('exhaustionEffects', () => {
  it('lands nothing at level 0 — the condition ends when the level reaches 0', () => {
    expect(exhaustionEffects(0, '5.5')).toEqual([])
    expect(exhaustionEffects(0, '5.0')).toEqual([])
  })

  it('anchors the level on a condition carrying it as a tally', () => {
    const built = exhaustionEffects(3, '5.5')
    const anchor = exhaustionAnchor(built)
    expect(anchor).toBeDefined()
    expect(anchor?.icon).toBe('condition')
    expect(anchor?.name).toBe('Exhaustion')
    expect(counterOf(anchor as Effect)).toBe(3)
  })

  it('bundles every part under one badge naming the level', () => {
    const built = exhaustionEffects(2, '5.5')
    const names = new Set(built.map((e) => e.bundle?.name))
    const ids = new Set(built.map((e) => e.bundle?.id))
    expect(names).toEqual(new Set(['Exhaustion 2']))
    expect(ids.size).toBe(1)
  })

  it('mints a fresh bundle each time, so two creatures hold two of them', () => {
    const a = exhaustionEffects(1, '5.5')[0].bundle?.id
    const b = exhaustionEffects(1, '5.5')[0].bundle?.id
    expect(a).not.toBe(b)
  })

  it('2024: reduces every d20 roll by 2 per level and Speed by 5 feet per level', () => {
    expect(mods(exhaustionEffects(3, '5.5'))).toEqual([
      { applies: 'all', mode: 'flatBonus', value: -6 },
      { applies: 'speed', mode: 'flatBonus', value: -15 },
    ])
  })

  it('2024: scales with the level rather than adding rows', () => {
    expect(mods(exhaustionEffects(1, '5.5'))).toEqual([
      { applies: 'all', mode: 'flatBonus', value: -2 },
      { applies: 'speed', mode: 'flatBonus', value: -5 },
    ])
  })

  it('2014: level 1 is Disadvantage on ability checks and nothing else', () => {
    expect(mods(exhaustionEffects(1, '5.0'))).toEqual([
      { applies: 'abilityChecks', mode: 'disadvantage', value: null },
    ])
  })

  it('2014: stacks the table’s rows, halving Speed at 2', () => {
    expect(mods(exhaustionEffects(2, '5.0'))).toEqual([
      { applies: 'abilityChecks', mode: 'disadvantage', value: null },
      { applies: 'speed', mode: 'flatBonus', value: 'half' },
    ])
  })

  it('2014: adds Disadvantage on attacks and saves at 3', () => {
    expect(mods(exhaustionEffects(3, '5.0'))).toEqual([
      { applies: 'abilityChecks', mode: 'disadvantage', value: null },
      { applies: 'speed', mode: 'flatBonus', value: 'half' },
      { applies: 'attackRolls', mode: 'disadvantage', value: null },
      { applies: 'savingThrows', mode: 'disadvantage', value: null },
    ])
  })

  it('2014: halves the hit point maximum at 4', () => {
    expect(mods(exhaustionEffects(4, '5.0'))).toContainEqual({
      applies: 'maxHp',
      mode: 'flatBonus',
      value: 'half',
    })
  })

  it('2014: level 5 pins Speed at 0, superseding the halving level 2 laid down', () => {
    const speed = mods(exhaustionEffects(5, '5.0')).filter((m) => m.applies === 'speed')
    expect(speed).toEqual([{ applies: 'speed', mode: 'flatBonus', value: 'zero' }])
  })

  it('leaves death at 6 as a reminder, in both editions', () => {
    for (const edition of ['5.5', '5.0'] as const) {
      const notes = exhaustionEffects(EXHAUSTION_MAX, edition).filter((e) => e.icon === 'reminder')
      expect(notes).toHaveLength(1)
      expect(notes[0].note).toMatch(/dies/)
      // Nothing kills: no part of the bundle touches status or hit points directly.
      expect(notes[0].modifier).toBeNull()
    }
    expect(exhaustionEffects(5, '5.5').some((e) => e.icon === 'reminder')).toBe(false)
  })

  it('survives a long rest, so the level is the GM’s to lower', () => {
    expect(exhaustionEffects(4, '5.0').every(survivesLongRest)).toBe(true)
  })
})

describe('clampLevel', () => {
  it('holds the level between 0 and 6, whole', () => {
    expect(clampLevel(-3)).toBe(0)
    expect(clampLevel(2.7)).toBe(2)
    expect(clampLevel(99)).toBe(EXHAUSTION_MAX)
    expect(clampLevel(Number.NaN)).toBe(0)
  })

  it('never builds past 6, whatever it is handed', () => {
    expect(exhaustionEffects(12, '5.5')[0].bundle?.name).toBe('Exhaustion 6')
  })
})

describe('exhaustionLevel', () => {
  it('reads 0 off a creature that carries none', () => {
    expect(exhaustionLevel([])).toBe(0)
    expect(exhaustionLevel([condition('Prone')])).toBe(0)
  })

  it('reads the level off the anchor, ignoring the parts around it', () => {
    expect(exhaustionLevel([condition('Poisoned'), ...exhaustionEffects(5, '5.0')])).toBe(5)
  })

  it('only counts the condition, not a reminder that happens to be named for it', () => {
    expect(isExhaustion(reminder('Exhaustion', 'a note'))).toBe(false)
  })
})

describe('withExhaustion', () => {
  it('replaces the whole bundle, leaving everything else where it was', () => {
    const prone = condition('Prone')
    const before = [prone, ...exhaustionEffects(2, '5.0')]
    const after = withExhaustion(before, 4, '5.0')
    expect(after).toContain(prone)
    expect(exhaustionLevel(after)).toBe(4)
    // One bundle, not the old one alongside the new.
    expect(new Set(after.flatMap((e) => (e.bundle ? [e.bundle.id] : []))).size).toBe(1)
  })

  it('clears the condition entirely at level 0', () => {
    const prone = condition('Prone')
    const after = withExhaustion([prone, ...exhaustionEffects(3, '5.5')], 0, '5.5')
    expect(after).toEqual([prone])
  })

  it('rebuilds for the edition it is given, not the one that built it', () => {
    const built2014 = exhaustionEffects(3, '5.0')
    const after = withExhaustion(built2014, 3, '5.5')
    expect(mods(after)).toEqual([
      { applies: 'all', mode: 'flatBonus', value: -6 },
      { applies: 'speed', mode: 'flatBonus', value: -15 },
    ])
  })

  it('adds the condition to a creature that had none', () => {
    expect(exhaustionLevel(withExhaustion([], 1, '5.5'))).toBe(1)
  })
})

describe('describeExhaustion', () => {
  it('spells out the 2024 numbers for the level chosen', () => {
    expect(describeExhaustion(3, '5.5')).toBe('Level 3: -6 to every d20 roll, Speed -15 ft.')
  })

  it('lists the 2014 rows the level has reached', () => {
    expect(describeExhaustion(2, '5.0')).toBe(
      'Level 2: Disadvantage on ability checks, Speed halved.',
    )
  })

  it('says death is the GM’s to apply, at 6', () => {
    expect(describeExhaustion(6, '5.5')).toMatch(/dies — you apply that\.$/)
    expect(describeExhaustion(6, '5.0')).toMatch(/dies — you apply that\.$/)
  })

  it('reads as nothing at 0', () => {
    expect(describeExhaustion(0, '5.5')).toBe('No Exhaustion.')
  })
})
