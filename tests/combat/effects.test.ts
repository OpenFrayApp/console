// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import {
  advantageAgainst,
  badgeLabel,
  condition,
  disadvantageOn,
  flatBonus,
  isReminderOnly,
  reminder,
  saveEnds,
} from '../../src/combat/effects.ts'

describe('condition', () => {
  it('is a reminder-only Effect with a manual duration by default', () => {
    const e = condition('Prone')
    expect(e.name).toBe('Prone')
    expect(e.icon).toBe('condition')
    expect(e.modifier).toBeNull()
    expect(e.duration).toEqual({ type: 'manual' })
  })
})

describe('advantageAgainst', () => {
  it('grants incoming advantage on attack rolls until the source’s next turn', () => {
    const e = advantageAgainst('Reckless Attack', { source: 'barb' })
    expect(e.modifier).toEqual({
      applies: 'attackRolls',
      mode: 'advantage',
      value: null,
      direction: 'incoming',
    })
    expect(e.duration).toEqual({ type: 'untilSourceTurn' })
    expect(e.source).toBe('barb')
  })
})

describe('disadvantageOn', () => {
  it('imposes outgoing disadvantage that is consumed on the next roll', () => {
    const e = disadvantageOn('Vicious Mockery')
    expect(e.modifier?.mode).toBe('disadvantage')
    expect(e.modifier?.direction).toBe('outgoing')
    expect(e.duration).toEqual({ type: 'consumeOnRoll' })
  })
})

describe('flatBonus', () => {
  it('defaults to all rolls for 10 rounds (Bless)', () => {
    const e = flatBonus('Bless', '1d4')
    expect(e.modifier).toEqual({
      applies: 'all',
      mode: 'flatBonus',
      value: '1d4',
      direction: 'outgoing',
    })
    expect(e.duration).toEqual({ type: 'rounds', rounds: 10 })
  })

  it('accepts an explicit applies target', () => {
    const e = flatBonus('Guidance', '1d4', { applies: 'abilityChecks' })
    expect(e.modifier?.applies).toBe('abilityChecks')
  })
})

describe('reminder', () => {
  it('is note-only with no modifier', () => {
    const e = reminder('Hex', 'Hex: +1d6 necrotic')
    expect(e.modifier).toBeNull()
    expect(e.note).toBe('Hex: +1d6 necrotic')
    expect(e.icon).toBe('reminder')
  })
})

describe('saveEnds', () => {
  it('carries a saveEnds duration with the save', () => {
    const e = saveEnds('Ensnaring Strike', { ability: 'str', dc: 13 })
    expect(e.duration).toEqual({ type: 'saveEnds', save: { ability: 'str', dc: 13 } })
    expect(e.modifier).toBeNull()
  })
})

describe('helpers', () => {
  it('badgeLabel prefers the note, falling back to the name', () => {
    expect(badgeLabel(reminder('Hex', 'Hex: +1d6 necrotic'))).toBe('Hex: +1d6 necrotic')
    expect(badgeLabel(condition('Stunned'))).toBe('Stunned')
  })

  it('isReminderOnly distinguishes mechanical effects from reminders', () => {
    expect(isReminderOnly(condition('Prone'))).toBe(true)
    expect(isReminderOnly(reminder('Hex', 'note'))).toBe(true)
    expect(isReminderOnly(advantageAgainst('Reckless'))).toBe(false)
    expect(isReminderOnly(flatBonus('Bless', '1d4'))).toBe(false)
  })

  it('assigns a unique id per effect', () => {
    const a = condition('Prone')
    const b = condition('Prone')
    expect(a.id).toBeTruthy()
    expect(a.id).not.toBe(b.id)
  })
})
