// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import { hasValue, parseList, parseNonNegativeInt, parseSignedInt } from '../../src/lib/form.ts'

describe('parseNonNegativeInt', () => {
  it('floors and clamps at zero', () => {
    expect(parseNonNegativeInt('12')).toBe(12)
    expect(parseNonNegativeInt('12.9')).toBe(12)
    expect(parseNonNegativeInt('-3')).toBe(0)
  })

  it('treats blank and invalid input as zero', () => {
    expect(parseNonNegativeInt('')).toBe(0)
    expect(parseNonNegativeInt('abc')).toBe(0)
  })
})

describe('parseSignedInt', () => {
  it('keeps negatives — a modifier field can be −2', () => {
    expect(parseSignedInt('-2')).toBe(-2)
    expect(parseSignedInt('+3')).toBe(3)
    expect(parseSignedInt('0')).toBe(0)
  })

  it('treats blank and invalid input as zero', () => {
    expect(parseSignedInt('')).toBe(0)
    expect(parseSignedInt('abc')).toBe(0)
  })

  it('floors toward negative infinity, matching the ability-mod convention', () => {
    expect(parseSignedInt('2.7')).toBe(2)
    expect(parseSignedInt('-2.5')).toBe(-3)
  })
})

describe('parseList', () => {
  it('splits on commas, trims, and drops empties', () => {
    expect(parseList('fire,  cold , ')).toEqual(['fire', 'cold'])
    expect(parseList('')).toEqual([])
  })
})

describe('hasValue', () => {
  it('is false for blank and whitespace-only input', () => {
    expect(hasValue('')).toBe(false)
    expect(hasValue('   ')).toBe(false)
    expect(hasValue(' x ')).toBe(true)
  })
})
