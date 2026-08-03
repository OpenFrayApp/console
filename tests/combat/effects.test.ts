// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import {
  advantageAgainst,
  badgeLabel,
  condition,
  counter,
  counterOf,
  describeDuration,
  describeModifier,
  disadvantageOn,
  flatBonus,
  groupEffects,
  isReminderOnly,
  modifierEffect,
  reminder,
  saveEnds,
  setCount,
  survivesLongRest,
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

describe('modifierEffect', () => {
  it('builds a directional advantage modifier (null value) and a manual default duration', () => {
    const e = modifierEffect({
      name: 'Faerie Fire',
      mode: 'advantage',
      direction: 'incoming',
      applies: 'attackRolls',
    })
    expect(e.modifier).toEqual({
      applies: 'attackRolls',
      mode: 'advantage',
      value: null,
      direction: 'incoming',
    })
    expect(e.duration).toEqual({ type: 'manual' })
  })

  it('keeps the flat-bonus value and honours an explicit duration', () => {
    const e = modifierEffect(
      { name: 'Bless', mode: 'flatBonus', direction: 'outgoing', applies: 'all', value: '1d4' },
      { duration: { type: 'rounds', rounds: 10 } },
    )
    expect(e.modifier?.value).toBe('1d4')
    expect(e.duration).toEqual({ type: 'rounds', rounds: 10 })
  })

  it('tones a helpful modifier as a buff and a harmful one as a debuff', () => {
    // Advantage on its own rolls helps it; advantage against it hurts it.
    expect(
      modifierEffect({ name: 'x', mode: 'advantage', direction: 'outgoing', applies: 'all' }).icon,
    ).toBe('buff')
    expect(
      modifierEffect({ name: 'x', mode: 'advantage', direction: 'incoming', applies: 'all' }).icon,
    ).toBe('debuff')
    // A negative flat bonus is a debuff (Bane −2); a positive one a buff.
    expect(
      modifierEffect({
        name: 'Bane',
        mode: 'flatBonus',
        direction: 'outgoing',
        applies: 'all',
        value: -2,
      }).icon,
    ).toBe('debuff')
    expect(
      modifierEffect({
        name: 'Bless',
        mode: 'flatBonus',
        direction: 'outgoing',
        applies: 'all',
        value: '1d4',
      }).icon,
    ).toBe('buff')
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

describe('counter', () => {
  it('is a reminder-only tally starting at zero', () => {
    const e = counter('Depth')
    expect(e.name).toBe('Depth')
    expect(e.icon).toBe('counter')
    expect(e.modifier).toBeNull()
    expect(e.duration).toEqual({ type: 'counter', count: 0 })
  })

  it('reads its tally back, and nothing from a non-counter', () => {
    expect(counterOf(setCount(counter('Depth'), 5))).toBe(5)
    expect(counterOf(counter('Depth'))).toBe(0)
    expect(counterOf(condition('Prone'))).toBeNull()
    expect(counterOf(reminder('Hex', 'note'))).toBeNull()
  })

  it('setCount keeps the tally whole and never negative, and leaves other effects alone', () => {
    const e = setCount(counter('Depth'), 2)
    expect(counterOf(setCount(e, 6))).toBe(6)
    expect(counterOf(setCount(e, -1))).toBe(0)
    expect(counterOf(setCount(e, 2.7))).toBe(2)
    expect(counterOf(setCount(e, Number.NaN))).toBe(0)
    // The original is untouched — the reducer swaps in the returned copy.
    expect(counterOf(e)).toBe(2)
    const prone = condition('Prone')
    expect(setCount(prone, 4)).toBe(prone)
  })
})

describe('survivesLongRest', () => {
  it('keeps manual and ≥8h effects, clears short and combat-scoped ones', () => {
    expect(survivesLongRest(condition('Prone', { duration: { type: 'manual' } }))).toBe(true)
    expect(
      survivesLongRest(condition('Restrained', { duration: { type: 'rounds', rounds: 4800 } })),
    ).toBe(true)
    expect(
      survivesLongRest(condition('Frightened', { duration: { type: 'rounds', rounds: 10 } })),
    ).toBe(false)
    expect(survivesLongRest(saveEnds('Web', { ability: 'str', dc: 12 }))).toBe(false)
  })

  it('keeps a counter — a rest doesn’t settle a tally, the GM does', () => {
    expect(survivesLongRest(setCount(counter('Depth'), 4))).toBe(true)
    expect(survivesLongRest(counter('Spore Load'))).toBe(true)
  })
})

describe('helpers', () => {
  it('badgeLabel prefers the note, falling back to the name', () => {
    expect(badgeLabel(reminder('Hex', 'Hex: +1d6 necrotic'))).toBe('Hex: +1d6 necrotic')
    expect(badgeLabel(condition('Stunned'))).toBe('Stunned')
  })

  it('badgeLabel puts a counter’s tally on the badge — the number is the point of it', () => {
    expect(badgeLabel(setCount(counter('Depth'), 3))).toBe('Depth 3')
    expect(badgeLabel(counter('Spore Load'))).toBe('Spore Load 0')
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

  it('describeDuration says how each effect ends', () => {
    expect(
      describeDuration(
        condition('Paralyzed', {
          duration: { type: 'saveEnds', save: { ability: 'wis', dc: 10 } },
        }),
      ),
    ).toBe('WIS save DC 10 (EoT)')
    expect(
      describeDuration(
        condition('Restrained', {
          duration: { type: 'saveEnds', save: { ability: 'str', dc: 13 }, when: 'startOfTurn' },
        }),
      ),
    ).toBe('STR save DC 13 (SoT)')
    // A rounds effect reports what's left — it ticks down each round.
    expect(
      describeDuration(flatBonus('Bless', '1d4', { duration: { type: 'rounds', rounds: 10 } })),
    ).toBe('10 rounds left')
    expect(describeDuration(condition('Prone', { duration: { type: 'rounds', rounds: 1 } }))).toBe(
      '1 round left',
    )
    // Past ten minutes of rounds the count stops meaning anything — say it in time.
    expect(
      describeDuration(condition('Prone', { duration: { type: 'rounds', rounds: 600 } })),
    ).toBe('1 hour left')
    expect(
      describeDuration(condition('Prone', { duration: { type: 'rounds', rounds: 4800 } })),
    ).toBe('8 hours left')
    expect(
      describeDuration(condition('Prone', { duration: { type: 'rounds', rounds: 300 } })),
    ).toBe('30 minutes left')
    expect(describeDuration(condition('Prone', { duration: { type: 'consumeOnRoll' } }))).toBe(
      'until its next roll',
    )
    expect(
      describeDuration(condition('Prone', { duration: { type: 'untilSourceTurn' } }), 'Archmage'),
    ).toBe('until Archmage’s next turn')
    // Hours don't convert to rounds, so the source's own wording is kept for them.
    expect(
      describeDuration({ ...reminder('Disguise Self', 'Disguised'), durationNote: '1 hour' }),
    ).toBe('1 hour')
    expect(describeDuration(condition('Prone'))).toBe('until removed')
    // A counter has no clock to report, so it reports where it stands.
    expect(describeDuration(setCount(counter('Depth'), 4))).toBe('at 4')
    expect(describeDuration(counter('Depth'))).toBe('at 0')
  })

  it('describeDuration says long custom durations in days', () => {
    expect(
      describeDuration(condition('Prone', { duration: { type: 'rounds', rounds: 28800 } })),
    ).toBe('2 days left')
  })

  it('describeModifier names the abilities a narrowed modifier touches', () => {
    expect(
      describeModifier({
        name: 'Intoxication',
        mode: 'disadvantage',
        direction: 'outgoing',
        applies: 'abilityChecks',
        abilities: ['wis'],
      }),
    ).toBe('Intoxication: Disadvantage on Wisdom checks it makes')
    expect(
      describeModifier({
        name: 'Intoxication',
        mode: 'disadvantage',
        direction: 'outgoing',
        applies: 'savingThrows',
        abilities: ['dex', 'wis'],
      }),
    ).toBe('Intoxication: Disadvantage on Dexterity and Wisdom saving throws it makes')
  })

  it('builders carry a bundle and the player-view flag only when set', () => {
    const bundle = { id: 'b1', name: 'Drunk' }
    const bundled = condition('Poisoned', { bundle })
    expect(bundled.bundle).toEqual(bundle)
    expect('gmOnly' in bundled).toBe(false)
    const hidden = reminder('Secret', 'Secret', { gmOnly: true })
    expect(hidden.gmOnly).toBe(true)
    const plain = condition('Prone')
    expect('bundle' in plain).toBe(false)
  })

  it('counter never joins a bundle — its tally outlives whatever applied it', () => {
    const bundle = { id: 'b1', name: 'Sallow Rot 1' }
    const depth = counter('Depth', { bundle, gmOnly: true, count: 3 })
    expect(depth.bundle).toBeUndefined()
    expect(depth.gmOnly).toBe(true)
    expect(counterOf(depth)).toBe(3)
  })
})

describe('groupEffects', () => {
  it('groups bundle members together, in first-seen order, leaving singles alone', () => {
    const bundle = { id: 'b1', name: 'Drunk' }
    const prone = condition('Prone')
    const poisoned = condition('Poisoned', { bundle })
    const depth = counter('Depth')
    const note = reminder('Rough morning', 'Rough morning', { bundle })
    const groups = groupEffects([prone, poisoned, depth, note])
    expect(groups).toHaveLength(3)
    expect(groups[0]).toEqual({ bundle: null, effects: [prone] })
    expect(groups[1]).toEqual({ bundle, effects: [poisoned, note] })
    expect(groups[2]).toEqual({ bundle: null, effects: [depth] })
  })

  it('keeps two bundles apart even when they share a name', () => {
    const a = { id: 'b1', name: 'Drunk' }
    const b = { id: 'b2', name: 'Drunk' }
    const groups = groupEffects([
      condition('Poisoned', { bundle: a }),
      condition('Prone', { bundle: b }),
    ])
    expect(groups).toHaveLength(2)
  })
})
