// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import { parseFormula } from '../../src/dice/formula.ts'

describe('parseFormula', () => {
  it('parses dice and a flat modifier', () => {
    expect(parseFormula('2d6+4').terms).toEqual([
      { kind: 'dice', sign: 1, count: 2, sides: 6 },
      { kind: 'flat', value: 4 },
    ])
  })

  it('defaults the count to 1', () => {
    expect(parseFormula('d20').terms).toEqual([
      { kind: 'dice', sign: 1, count: 1, sides: 20 },
    ])
  })

  it('expands advantage into two dice keeping the highest', () => {
    expect(parseFormula('1d20adv+5').terms).toEqual([
      {
        kind: 'dice',
        sign: 1,
        count: 2,
        sides: 20,
        advantage: 'advantage',
        keep: { mode: 'kh', n: 1 },
      },
      { kind: 'flat', value: 5 },
    ])
  })

  it('expands disadvantage into two dice keeping the lowest', () => {
    expect(parseFormula('1d20dis').terms[0]).toMatchObject({
      advantage: 'disadvantage',
      keep: { mode: 'kl', n: 1 },
    })
  })

  it('parses keep-highest/lowest', () => {
    expect(parseFormula('4d6kh3').terms[0]).toMatchObject({ keep: { mode: 'kh', n: 3 } })
    expect(parseFormula('5d6kl2').terms[0]).toMatchObject({ keep: { mode: 'kl', n: 2 } })
  })

  it('parses a trailing damage type tag', () => {
    const f = parseFormula('2d10+8 fire')
    expect(f.damageType).toBe('fire')
    expect(f.terms).toEqual([
      { kind: 'dice', sign: 1, count: 2, sides: 10 },
      { kind: 'flat', value: 8 },
    ])
  })

  it('parses subtracted dice (Bane-style)', () => {
    expect(parseFormula('10-1d4').terms).toEqual([
      { kind: 'flat', value: 10 },
      { kind: 'dice', sign: -1, count: 1, sides: 4 },
    ])
  })

  it('composes additive sub-rolls', () => {
    expect(parseFormula('1d8+1d4+3').terms).toHaveLength(3)
  })

  it('throws on malformed or unsupported input', () => {
    expect(() => parseFormula('')).toThrow()
    expect(() => parseFormula('nonsense')).toThrow()
    expect(() => parseFormula('1d6!')).toThrow() // exploding deferred
  })
})
