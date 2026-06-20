// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import { parseSpeedInput } from '../../src/combat/speed.ts'

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
