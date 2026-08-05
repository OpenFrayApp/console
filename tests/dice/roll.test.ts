// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import { d20Group, keptFlags, roll } from '../../src/dice/roll.ts'
import type { RandomSource } from '@openfray/dice'

/** Deterministic source: yields the given die faces in order (face f -> f-1 raw). */
function faceSeq(...faces: number[]): RandomSource {
  let i = 0
  return () => {
    if (i >= faces.length) throw new Error('faceSeq exhausted')
    return faces[i++] - 1
  }
}

describe('roll', () => {
  it('sums dice and a flat modifier', () => {
    const r = roll('2d6+4', { rand: faceSeq(3, 5) })
    expect(r.dice[0].results).toEqual([3, 5])
    expect(r.dice[0].kept).toEqual([3, 5])
    expect(r.modifier).toBe(4)
    expect(r.total).toBe(12)
    expect(r.advantageState).toBe('normal')
  })

  it('flags a natural 20 as a crit', () => {
    const r = roll('1d20+7', { kind: 'attack', rand: faceSeq(20) })
    expect(r.total).toBe(27)
    expect(r.crit).toBe(true)
    expect(r.fumble).toBe(false)
  })

  it('flags a natural 1 as a fumble', () => {
    const r = roll('1d20+7', { kind: 'attack', rand: faceSeq(1) })
    expect(r.fumble).toBe(true)
    expect(r.crit).toBe(false)
  })

  it('keeps the highest on advantage', () => {
    const r = roll('1d20adv+5', { rand: faceSeq(4, 18) })
    expect(r.dice[0].results).toEqual([4, 18])
    expect(r.dice[0].kept).toEqual([18])
    expect(r.total).toBe(23)
    expect(r.advantageState).toBe('advantage')
  })

  it('keeps the lowest on disadvantage', () => {
    const r = roll('1d20dis+5', { rand: faceSeq(4, 18) })
    expect(r.dice[0].kept).toEqual([4])
    expect(r.total).toBe(9)
    expect(r.advantageState).toBe('disadvantage')
  })

  it('keeps the highest N (4d6kh3)', () => {
    const r = roll('4d6kh3', { rand: faceSeq(1, 5, 3, 6) })
    expect(r.dice[0].kept).toEqual([6, 5, 3])
    expect(r.total).toBe(14)
  })

  it('doubles dice but not modifiers on a crit (RAW, crit: true)', () => {
    const r = roll('2d10+8', { crit: true, rand: faceSeq(10, 10, 1, 1) })
    expect(r.dice[0].results).toHaveLength(4)
    expect(r.total).toBe(30) // (10+10+1+1) + 8
  })

  it('supports the double-total crit rule', () => {
    const r = roll('2d6+5', { crit: 'double-total', rand: faceSeq(3, 4) })
    expect(r.dice[0].results).toHaveLength(2) // rolled once
    expect(r.dice[0].total).toBe(14) // (3+4) doubled
    expect(r.total).toBe(19) // dice doubled, modifier untouched
  })

  it('supports the max-plus-roll crit rule', () => {
    const r = roll('2d6', { crit: 'max-plus-roll', rand: faceSeq(3, 4) })
    expect(r.dice[0].results).toHaveLength(2)
    expect(r.total).toBe(19) // 2*6 (max) + (3+4)
  })

  it('does not apply crit rules to attack/keep dice', () => {
    const r = roll('1d20adv', { crit: 'double-dice', rand: faceSeq(4, 18) })
    expect(r.dice[0].results).toHaveLength(2) // advantage's two dice, not doubled
    expect(r.total).toBe(18)
  })

  it('carries the damage type tag', () => {
    const r = roll('2d6 fire', { rand: faceSeq(2, 2) })
    expect(r.damageType).toBe('fire')
    expect(r.total).toBe(4)
  })

  it('composes additive sub-rolls into separate dice groups', () => {
    const r = roll('1d8+1d4+3', { rand: faceSeq(5, 2) })
    expect(r.dice).toHaveLength(2)
    expect(r.total).toBe(10)
  })

  it('subtracts negatively-signed dice', () => {
    const r = roll('10-1d4', { rand: faceSeq(2) })
    expect(r.modifier).toBe(10)
    expect(r.total).toBe(8)
  })

  it('does not flag crit/fumble on multi-die or non-d20 rolls', () => {
    expect(roll('2d20', { rand: faceSeq(20, 20) }).crit).toBe(false)
    expect(roll('1d6', { rand: faceSeq(1) }).fumble).toBe(false)
  })

  it('applies advantage from context to a plain d20', () => {
    const r = roll('1d20+5', { advantage: 'advantage', rand: faceSeq(4, 18) })
    expect(r.dice[0].kept).toEqual([18])
    expect(r.total).toBe(23)
    expect(r.advantageState).toBe('advantage')
  })

  it('applies disadvantage from context', () => {
    const r = roll('1d20+5', { advantage: 'disadvantage', rand: faceSeq(4, 18) })
    expect(r.dice[0].kept).toEqual([4])
    expect(r.advantageState).toBe('disadvantage')
  })

  it("treats advantage 'normal' as a no-op", () => {
    const r = roll('1d20+5', { advantage: 'normal', rand: faceSeq(7) })
    expect(r.dice[0].results).toHaveLength(1)
    expect(r.total).toBe(12)
  })

  it('folds in bonus terms (Bless) without touching the modifier', () => {
    const r = roll('1d20+5', { bonuses: ['1d4'], rand: faceSeq(10, 3) })
    expect(r.dice).toHaveLength(2)
    expect(r.modifier).toBe(5)
    expect(r.total).toBe(18) // 10 + 5 + 3
  })

  it('folds in negative numeric bonuses', () => {
    const r = roll('1d20+5', { bonuses: [-2], rand: faceSeq(10) })
    expect(r.total).toBe(13) // 10 + 5 - 2
  })

  it('leaves an exploding group alone, having no fixed count to double', () => {
    const r = roll('2d6!', { crit: 'double-dice', rand: faceSeq(3, 4) })
    expect(r.dice[0].results).toEqual([3, 4])
    expect(r.total).toBe(7)
  })

  it('crits a multiplied group through its multiplier, not around it', () => {
    const r = roll('2d6x3', { crit: 'max-plus-roll', rand: faceSeq(2, 4) })
    expect(r.dice[0].multiplier).toBe(3)
    expect(r.total).toBe(54) // (2+4)x3 rolled, plus a maximised (2*6)x3
  })
})

// A stat block that reads "1 piercing damage" states the number outright. There is
// nothing to roll, so nothing is rolled — the console just has to report it.
describe('roll, on a damage entry with no dice in it', () => {
  it('totals the number', () => {
    const r = roll('1', { kind: 'damage' })
    expect(r.total).toBe(1)
    expect(r.dice).toEqual([])
    expect(r.kind).toBe('damage')
  })

  it('adds the parts of a bare sum', () => {
    expect(roll('1+1').total).toBe(2)
    expect(roll('20').total).toBe(20)
  })

  it('keeps the damage type', () => {
    const r = roll('1 piercing', { kind: 'damage' })
    expect(r.damageType).toBe('piercing')
    expect(r.total).toBe(1)
  })

  it('never draws from the random source', () => {
    const forbidden = () => {
      throw new Error('a formula with no dice must not draw')
    }
    expect(roll('1', { rand: forbidden, crit: 'double-dice' }).total).toBe(1)
  })

  it('still rejects a formula that is neither dice nor a number', () => {
    expect(() => roll('two')).toThrow()
    expect(() => roll('2d6 + x')).toThrow()
  })
})

// The randomness is the package's now, but it is reached through this function, and a
// mis-wiring here would pass every test above — all of which supply their own source.
describe('the dice behind roll()', () => {
  it('stays in range and covers every face over many real draws', () => {
    const seen = new Set<number>()
    for (let i = 0; i < 500; i++) {
      const value = roll('1d6').total
      expect(value).toBeGreaterThanOrEqual(1)
      expect(value).toBeLessThanOrEqual(6)
      seen.add(value)
    }
    expect(seen).toEqual(new Set([1, 2, 3, 4, 5, 6]))
  })
})

describe('keptFlags', () => {
  it('marks the die advantage kept and the one it dropped', () => {
    const r = roll('1d20+5', { advantage: 'advantage', rand: faceSeq(7, 18) })
    expect(r.dice[0].results).toEqual([7, 18])
    expect(keptFlags(r.dice[0])).toEqual([false, true])
  })

  it('drops exactly one of a tied pair', () => {
    const r = roll('1d20', { advantage: 'disadvantage', rand: faceSeq(12, 12) })
    expect(keptFlags(r.dice[0])).toEqual([true, false])
  })

  it('marks every die when none was dropped', () => {
    const r = roll('2d6', { rand: faceSeq(3, 5) })
    expect(keptFlags(r.dice[0])).toEqual([true, true])
  })
})

describe('d20Group', () => {
  it('finds the one d20 group behind a roll', () => {
    const r = roll('1d20+5', { rand: faceSeq(11) })
    expect(d20Group(r)?.results).toEqual([11])
  })

  it('gives nothing when the roll has no single d20 to show', () => {
    expect(d20Group(roll('2d6+3', { rand: faceSeq(2, 4) }))).toBeUndefined()
  })
})
