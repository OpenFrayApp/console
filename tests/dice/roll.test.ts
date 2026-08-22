// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { describe, expect, it } from 'vitest'
import { canRoll, d20Group, roll } from '../../src/dice/roll.ts'
import type { RandomSource } from 'opendice'

/** Deterministic source: yields the given die faces in order (face f -> f-1 raw). */
function faceSeq(...faces: number[]): RandomSource {
  let i = 0
  return () => {
    if (i >= faces.length) throw new Error('faceSeq exhausted')
    return faces[i++] - 1
  }
}

describe('roll', () => {
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
    const r = roll('2d20adv', { crit: 'double-dice', rand: faceSeq(4, 18) })
    expect(r.dice[0].results).toHaveLength(2) // advantage's two dice, not doubled
    expect(r.total).toBe(18)
  })

  it('carries the damage type tag', () => {
    const r = roll('2d6 fire', { rand: faceSeq(2, 2) })
    expect(r.damageType).toBe('fire')
    expect(r.total).toBe(4)
  })

  it('does not flag crit/fumble on multi-die or non-d20 rolls', () => {
    expect(roll('2d20', { rand: faceSeq(20, 20) }).crit).toBe(false)
    expect(roll('1d6', { rand: faceSeq(1) }).fumble).toBe(false)
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
describe('d20Group', () => {
  it('finds the one d20 group behind a roll', () => {
    const r = roll('1d20+5', { rand: faceSeq(11) })
    expect(d20Group(r)?.results).toEqual([11])
  })

  it('gives nothing when the roll has no single d20 to show', () => {
    expect(d20Group(roll('2d6+3', { rand: faceSeq(2, 4) }))).toBeUndefined()
  })
})

// The guard a caller asks before handing a stat block's formula to the resolver, where
// opendice would answer by throwing.
describe('canRoll', () => {
  it('takes what roll takes, dice or a flat number, damage tag and all', () => {
    expect(canRoll('2d6+3')).toBe(true)
    expect(canRoll('1')).toBe(true)
    expect(canRoll('2+3')).toBe(true)
    expect(canRoll('2d6 fire')).toBe(true)
    expect(canRoll('  1d20+5  ')).toBe(true)
  })

  it('refuses what roll would throw on, and anything empty', () => {
    expect(canRoll('not dice')).toBe(false)
    expect(canRoll('')).toBe(false)
    expect(canRoll('   ')).toBe(false)
  })

  it('bounds the length before the parser ever reads it', () => {
    expect(canRoll('1d6', 2)).toBe(false)
    expect(canRoll(`1d6+${'1'.repeat(300)}`)).toBe(false)
  })
})
