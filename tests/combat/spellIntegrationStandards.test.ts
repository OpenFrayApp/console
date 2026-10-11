// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Spell } from '../../src/schema/spell.ts'
import { spellEffectFor } from '../../src/combat/spellEffects.ts'
import { spellAction } from '../../src/combat/casting.ts'
import { reviewedSpellCasting } from '../../src/combat/reviewedSpells.ts'
import { monster } from '../fixtures.ts'
import { REVIEWED_SPELL_SKIPS } from './reviewedSpellSkips.data.ts'

const spells = [
  'tome-of-heroes',
  'so-many-spells',
  'spells-that-dont-suck',
  'kibbles-casting-v23',
  'deep-magic-2020',
].flatMap(
  (source) =>
    JSON.parse(readFileSync(`public/compendium/${source}-spells.json`, 'utf8')) as Spell[],
)

/** Find a published source-specific spell and build its actual console effect. */
function effectFor(id: string) {
  const spell = spells.find((entry) => entry.id === id)!
  return (
    spellEffectFor(spell)?.build({
      spell,
      source: 'caster',
      target: monster({ combatantId: 'target' }),
      save: reviewedSpellCasting(spell)?.mechanics?.save
        ? { ability: reviewedSpellCasting(spell)!.mechanics!.save!.ability, dc: 17 }
        : undefined,
    }) ?? []
  )
}

describe('new libraries follow the existing board-effect boundary', () => {
  it.each(Object.entries(REVIEWED_SPELL_SKIPS))(
    'keeps %s unmodeled (%s) without a substitute badge',
    (id) => {
      const spell = spells.find((entry) => entry.id === id)!
      expect(spell).toBeDefined()
      expect(reviewedSpellCasting(spell)).toBeDefined()
      expect(spellEffectFor(spell)).toBeNull()
    },
  )

  it.each(spells)('keeps $id creature reminders concise and free of GM instructions', (spell) => {
    for (const effect of effectFor(spell.id)) {
      if (effect.icon === 'reminder') {
        expect(effect.note!.length).toBeLessThanOrEqual(80)
        expect(effect.note).not.toMatch(/manually|GM resolution|consult the source|track printed/i)
      }
      if (effect.icon === 'condition') expect(effect.note).toBeUndefined()
      expect(effect.durationNote ?? '').not.toMatch(/^instantaneous$/i)
    }
  })

  it.each([
    'kibblestasty-casting-compendium-v2.3:animate-shadow',
    'somanyrobots-so-many-spells:alter-metal',
    'kobold-press-deepm:conjure-fey-hound',
    'kobold-press-deepm:dark-path',
  ])('does not attach a rules-summary badge for %s', (id) => {
    expect(effectFor(id)).toEqual([])
  })

  it('models the eligible failed target’s armor penalty', () => {
    expect(effectFor('kobold-press-deepm:undermine-armor')).toMatchObject([
      { modifier: { applies: 'ac', mode: 'flatBonus', value: -2 } },
    ])
  })

  it.each(['illusory-pit', 'poison-blast', 'twisting-eruption', 'vicious-vapors'])(
    'routes %s’s failed-save conditions to enemies',
    (slug) => {
      const spell = spells.find(
        (entry) => entry.id === `kibblestasty-casting-compendium-v2.3:${slug}`,
      )!
      expect(spellEffectFor(spell)?.targeting).toBe('enemy')
    },
  )

  it('models Form of Wind’s immediate invisibility without executing its later cone attack', () => {
    const id = 'kibblestasty-casting-compendium-v2.3:form-of-wind'
    const spell = spells.find((entry) => entry.id === id)!
    expect(spellAction(spell, {})).toBeNull()
    expect(effectFor(id)[0]).toMatchObject({
      name: 'Invisible',
      concentration: true,
      duration: { type: 'rounds', rounds: 100 },
    })
  })

  it('keeps the curse timer independent of the wall and retains only the variable Glare timer', () => {
    const wall = spells.find((entry) => entry.id === 'somanyrobots-so-many-spells:wall-of-misery')!
    const effects = spellEffectFor(wall)!.build({ spell: wall, source: 'caster' })
    expect(
      effects.every(
        (effect) =>
          effect.duration.type === 'rounds' &&
          effect.duration.rounds === 10 &&
          effect.concentration === false,
      ),
    ).toBe(true)
    expect(effectFor('kobold-press-toh:glare')[0].duration).toEqual({ type: 'manual' })
  })

  it('models Rot’s unconditional attack/check disadvantage on the caster turn boundary', () => {
    expect(effectFor('somanyrobots-spells-that-dont-suck:rot')).toMatchObject([
      {
        source: 'caster',
        modifier: { applies: 'attackRolls', mode: 'disadvantage' },
        duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
      },
      {
        source: 'caster',
        modifier: { applies: 'abilityChecks', mode: 'disadvantage' },
        duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
      },
    ])
  })

  it('uses Wisdom rather than the initial Constitution save to escape Banshee’s Wail', () => {
    expect(effectFor('somanyrobots-so-many-spells:banshee-s-wail')[0].duration).toMatchObject({
      type: 'saveEnds',
      save: { ability: 'wis', dc: 17 },
    })
  })

  it('does not turn action-only or damage-triggered escape saves into recurring turn-end saves', () => {
    for (const id of [
      'kobold-press-toh:babble',
      'somanyrobots-spells-that-dont-suck:command-beast',
      'kobold-press-deepm:dark-dementing',
    ]) {
      expect(effectFor(id).some((effect) => effect.duration.type === 'saveEnds')).toBe(false)
    }
  })

  it('models Restrained and its end-turn escape save independently of later exhaustion', () => {
    expect(effectFor('kobold-press-deepm:icy-grasp-of-the-void')).toMatchObject([
      {
        name: 'Restrained',
        duration: { type: 'saveEnds', save: { ability: 'con', dc: 17 }, when: 'endOfTurn' },
      },
    ])
  })
})
