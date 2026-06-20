// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import { roll } from '../../src/dice/roll.ts'
import type { RandomSource } from '../../src/dice/rng.ts'

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

  it('doubles dice but not modifiers on a crit', () => {
    const r = roll('2d10+8', { crit: true, rand: faceSeq(10, 10, 1, 1) })
    expect(r.dice[0].results).toHaveLength(4)
    expect(r.total).toBe(30) // (10+10+1+1) + 8
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
})
