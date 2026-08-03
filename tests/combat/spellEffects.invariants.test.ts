// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import type { MonsterCombatant } from '../../src/schema/combatant.ts'
import type { Effect } from '../../src/schema/effect.ts'
import type { Spell } from '../../src/schema/spell.ts'
import {
  SPELL_EFFECTS,
  spellEffectFor,
  type SpellEffectDef,
} from '../../src/combat/spellEffects.ts'
import { badgeLabel, groupEffects } from '../../src/combat/effects.ts'
import { resolveCondition } from '../../src/compendium/conditions.ts'

/**
 * The shape contract, checked over the whole table so every entry added later is
 * covered without writing a test for it. The note is the entire badge on the
 * combatant row (`badgeLabel` returns `note ?? name`), which is why its length and
 * its overlap with a condition name are correctness properties, not cosmetics.
 * A multi-effect entry renders as one bundle badge, so the row-noise caps count
 * badges through the same grouping the row uses, not raw effects.
 */

/** The badge is one chip on a crowded row; a save-ends chip also appends "· save DC N". */
const MAX_NOTE = 30
const MAX_SAVE_ENDS_NOTE = 22

const target = (): MonsterCombatant =>
  ({
    isPC: false,
    combatantId: 'target',
    creature: { abilities: { str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10 } },
  }) as MonsterCombatant

const spellFor = (name: string, over: Partial<Spell> = {}): Spell => ({
  id: `srd-5.2:${name}`,
  source: 'srd-5.2',
  edition: '5.5',
  name,
  level: 1,
  school: 'Abjuration',
  castingTime: 'action',
  range: 'touch',
  components: { verbal: true, somatic: true, material: false },
  duration: 'up to 1 minute',
  concentration: false,
  ritual: false,
  text: '',
  ...over,
})

/** Every entry built both ways: from the cast card, and from a failed save. */
function buildAll(name: string, def: SpellEffectDef, over: Partial<Spell> = {}): Effect[] {
  const spell = spellFor(name, over)
  return [
    ...def.build({ source: 'caster', spell, target: target() }),
    ...def.build({ source: 'caster', spell, target: target(), save: { ability: 'wis', dc: 15 } }),
  ]
}

const entries = Object.entries(SPELL_EFFECTS)

describe('spell effect invariants', () => {
  it('covers a meaningful share of the compendium', () => {
    expect(entries.length).toBeGreaterThan(150)
  })

  it.each(entries)('%s builds effects that fit the badge', (name, def) => {
    for (const effect of buildAll(name, def)) {
      expect(effect.name, `${name}: empty effect name`).toBeTruthy()
      expect(effect.duration.type, `${name}: missing duration`).toBeTruthy()

      const label = badgeLabel(effect)
      // A bundled effect's row badge is the bundle's name; its own label shows only
      // in the Applied effects list, so just the general cap applies. A loose
      // save-ends effect draws its DC beside the label, hence the tighter limit.
      const bundled = def.build({ spell: spellFor(name), target: target() }).length >= 2
      const limit = effect.duration.type === 'saveEnds' && !bundled ? MAX_SAVE_ENDS_NOTE : MAX_NOTE
      expect(
        label.length,
        `${name}: badge "${label}" is ${label.length} chars`,
      ).toBeLessThanOrEqual(limit)
      expect(label, `${name}: badge should not end in a period`).not.toMatch(/\.$/)
      expect(label, `${name}: badge should be one line`).not.toContain('\n')
      expect(label.trim(), `${name}: badge has stray whitespace`).toBe(label)
    }
  })

  it.each(entries)('%s targets a known side and describes itself', (name, def) => {
    expect(['self', 'ally', 'enemy'], `${name}: bad targeting`).toContain(def.targeting)
    expect(def.summary, `${name}: missing summary`).toBeTruthy()
    // The summary is prose for the apply prompt; the note is the badge. If they are
    // the same string, one of them is doing the wrong job.
    for (const effect of buildAll(name, def)) {
      expect(def.summary, `${name}: summary duplicates the badge`).not.toBe(effect.note)
    }
  })

  it.each(entries)('%s names a real condition when it applies one', (name, def) => {
    for (const effect of buildAll(name, def)) {
      if (effect.icon !== 'condition') continue
      expect(
        resolveCondition(effect.name),
        `${name}: "${effect.name}" is not a 5e condition`,
      ).toBeTruthy()
      // A note replaces the condition name on the badge, so repeating it would cost a
      // string and show nothing new.
      if (effect.note) {
        expect(effect.note.toLowerCase(), `${name}: note repeats the condition name`).not.toContain(
          effect.name.toLowerCase(),
        )
      }
    }
  })

  it.each(entries)('%s builds fresh effects on every call', (name, def) => {
    const spell = spellFor(name)
    const first = def.build({ spell, target: target() })
    const second = def.build({ spell, target: target() })
    expect(first.length, `${name}: built nothing`).toBeGreaterThan(0)
    // Four parts is the ceiling — more turns the Applied effects list into a form.
    expect(first.length, `${name}: builds ${first.length} effects`).toBeLessThanOrEqual(4)
    expect(new Set(first.map((e) => e.id)).size, `${name}: duplicate ids in one build`).toBe(
      first.length,
    )
    for (const id of first.map((e) => e.id)) {
      expect(
        second.map((e) => e.id),
        `${name}: reused an id across builds`,
      ).not.toContain(id)
    }
  })

  it.each(entries)('%s renders as at most two badges, bundling several parts', (name) => {
    // Through spellEffectFor, where the bundle is stamped — the same path the app takes.
    const spell = spellFor(name)
    const wrapped = spellEffectFor(spell)!
    const first = wrapped.build({ spell, target: target() })
    // Two badges is the row's ceiling; a multi-part spell folds into one bundle badge.
    expect(
      groupEffects(first).length,
      `${name}: renders ${groupEffects(first).length} badges`,
    ).toBeLessThanOrEqual(2)
    if (first.length >= 2) {
      const bundles = new Set(first.map((e) => e.bundle?.id))
      expect(bundles.size, `${name}: parts split across bundles`).toBe(1)
      expect(first[0].bundle?.name, `${name}: bundle not named after the spell`).toBe(spell.name)
      // Each target gets its own bundle, so clearing one leaves the other alone.
      const second = wrapped.build({ spell, target: target() })
      expect(second[0].bundle?.id, `${name}: bundle id reused across builds`).not.toBe(
        first[0].bundle?.id,
      )
    } else {
      expect(first[0].bundle, `${name}: a lone effect needs no bundle`).toBeUndefined()
    }
  })

  it.each(entries)('%s carries the save it was handed', (name, def) => {
    const save = { ability: 'wis', dc: 15 } as const
    const spell = spellFor(name)
    for (const effect of def.build({ spell, target: target(), save })) {
      if (effect.duration.type !== 'saveEnds') continue
      expect(effect.duration.save, `${name}: save-ends without a save`).toEqual(save)
    }
  })

  it.each(entries)('%s builds for both editions', (name, def) => {
    for (const edition of ['5.0', '5.5'] as const) {
      const effects = def.build({ spell: spellFor(name, { edition }), target: target() })
      expect(effects.length, `${name}: built nothing for edition ${edition}`).toBeGreaterThan(0)
    }
  })
})

describe('concentration effects', () => {
  it('flags effects from a concentration spell so ending it can clear them', async () => {
    const { spellEffectFor } = await import('../../src/combat/spellEffects.ts')
    const conc = spellFor('bless', { concentration: true })
    const [effect] = spellEffectFor(conc)!.build({ source: 'caster', spell: conc })
    expect(effect.concentration).toBe(true)

    const plain = spellFor('mage armor', { concentration: false })
    const [other] = spellEffectFor(plain)!.build({ source: 'caster', spell: plain })
    expect(other.concentration).toBeUndefined()
  })
})
