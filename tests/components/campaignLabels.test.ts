// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import {
  campaignAcronym,
  EDITION_OPTIONS,
  labelOf,
  TIEBREAK_OPTIONS,
} from '../../src/components/campaignLabels.ts'

describe('campaignAcronym', () => {
  it('takes each word initial, preserving its case', () => {
    expect(campaignAcronym('Sands of Eternity')).toBe('SoE')
  })

  it('reduces a single-word name to its initial', () => {
    expect(campaignAcronym('Waterdeep')).toBe('W')
  })

  it('collapses whitespace runs and ignores leading/trailing space', () => {
    expect(campaignAcronym('  The   Wild\tBeyond ')).toBe('TWB')
  })

  it('gives empty and whitespace-only names an empty acronym', () => {
    expect(campaignAcronym('')).toBe('')
    expect(campaignAcronym('   ')).toBe('')
  })

  it('passes non-letter initials through', () => {
    expect(campaignAcronym('7th Sea')).toBe('7S')
  })
})

describe('labelOf', () => {
  it('returns the human label for a stored value', () => {
    expect(labelOf(EDITION_OPTIONS, '5.5')).toBe('DnD 5.5 (2024)')
    expect(labelOf(TIEBREAK_OPTIONS, 'pcs-first')).toBe('Players first')
  })

  it('falls back to the raw value when it is not a known option', () => {
    expect(labelOf<string>(EDITION_OPTIONS, 'homebrew')).toBe('homebrew')
  })
})
