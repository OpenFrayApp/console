// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import { effectiveSpeeds, parseSpeedInput } from '../../src/combat/speed.ts'
import { modifierEffect } from '../../src/combat/effects.ts'

/** A speed modifier effect, the shape the disease stages now carry. */
const speedMod = (value: number | string) =>
  modifierEffect({
    name: 'Sallow Rot',
    mode: 'flatBonus',
    direction: 'outgoing',
    applies: 'speed',
    value,
  })

describe('effectiveSpeeds', () => {
  it('returns the speeds untouched with no speed effects on the list', () => {
    const speed = { walk: 30, fly: 60 }
    expect(effectiveSpeeds(speed, [])).toBe(speed)
  })

  it('applies flat deltas to every movement, flooring at 0', () => {
    expect(effectiveSpeeds({ walk: 30, fly: 60 }, [speedMod(-10)])).toEqual({ walk: 20, fly: 50 })
    expect(effectiveSpeeds({ walk: 5 }, [speedMod(-10)])).toEqual({ walk: 0 })
  })

  it('stacks deltas, then halves once for any number of halvings', () => {
    expect(effectiveSpeeds({ walk: 40 }, [speedMod(-10), speedMod('half')])).toEqual({ walk: 15 })
  })

  it('pins everything at 0 for a zero effect, whatever else applies', () => {
    expect(effectiveSpeeds({ walk: 30, fly: 60 }, [speedMod('zero'), speedMod(-5)])).toEqual({
      walk: 0,
      fly: 0,
    })
  })

  it('keeps hover and untouched keys as they are', () => {
    expect(effectiveSpeeds({ fly: 60, hover: true }, [speedMod(-10)])).toEqual({
      fly: 50,
      hover: true,
    })
  })
})

describe('parseSpeedInput', () => {
  it('treats a bare number as walking', () => {
    expect(parseSpeedInput('30')).toEqual({ walk: 30 })
  })

  it('reads labelled movement after a bare walk', () => {
    expect(parseSpeedInput('30, Climb 12 ft')).toEqual({ walk: 30, climb: 12 })
  })

  it('keeps only the first of several bare numbers', () => {
    expect(parseSpeedInput('30, 15')).toEqual({ walk: 30 })
  })

  it('reads a labelled walk and multiple movement types', () => {
    expect(parseSpeedInput('Walk 30, Fly 60, Swim 20')).toEqual({ walk: 30, fly: 60, swim: 20 })
  })

  it('ignores junk and empty input', () => {
    expect(parseSpeedInput('')).toEqual({})
    expect(parseSpeedInput('fast')).toEqual({})
  })
})
