// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import type { Creature } from '../../src/schema/creature.ts'
import { TEMPLATE_LIMITS as LIMITS } from '../../src/schema/encounterTemplate.ts'
import { missingCreatureFields, projectCreature } from '../../src/schema/creatureInput.ts'
import { roll } from '../../src/dice/roll.ts'
import { instantiate } from '../../src/combat/combatant.ts'
import { resolveMaxHp } from '../../src/combat/hp.ts'
import { saveBonus } from '../../src/combat/masssave.ts'
import { legendaryPerRound } from '../../src/combat/resources.ts'

/**
 * The door every Creature the compendium didn't ship comes through — a shared encounter's
 * embedded homebrew, or a stat block pasted out of a forum.
 *
 * The bar is not "the numbers are plausible" but the one the app depends on: whatever comes
 * out, the console can still roll a d20 with it. Several cases check that by rolling the
 * thing rather than by reading it back.
 */

/** The minimum a stat block needs to render, which is also the check's own bar. */
const base = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'custom:x',
  source: 'custom',
  name: 'Thing',
  size: 'Medium',
  type: 'humanoid',
  ac: 12,
  maxHp: 10,
  speed: { walk: 30 },
  abilities: { str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10 },
  senses: { passivePerception: 10 },
  ...over,
})

/** A projected creature on the board, which is where its numbers actually get used. */
const onBoard = (creature: Creature) =>
  instantiate(creature, { combatantId: 'c1', initiative: 0, label: creature.name })

describe('missingCreatureFields', () => {
  it('names what a stat block needs before it can be drawn at all', () => {
    expect(missingCreatureFields(base())).toEqual([])
    expect(missingCreatureFields({})).toEqual([
      'name',
      'size',
      'type',
      'ac',
      'maxHp',
      'speed',
      'abilities',
      'passivePerception',
    ])
    expect(missingCreatureFields(null)).toEqual(['name'])
    expect(missingCreatureFields([base()])).toEqual(['name'])
    expect(missingCreatureFields(base({ abilities: { str: 10 } }))).toEqual(['abilities'])
  })
})

describe('projectCreature', () => {
  it('keeps a well-formed stat block whole', () => {
    const input = base({
      hpFormula: '2d6+3',
      initiative: 2,
      cr: 0.25,
      saves: { dex: 4 },
      skills: { stealth: 6 },
      languages: ['Common', 'Goblin'],
      traits: [{ name: 'Nimble Escape', text: 'Disengages as a bonus action.' }],
      actions: [
        {
          id: 'a1',
          name: 'Scimitar',
          kind: 'melee',
          toHit: 4,
          reach: 5,
          damage: [{ formula: '1d6+2', type: 'slashing' }],
        },
      ],
      legendaryActions: { perRound: 3, actions: [] },
      legendaryResistance: 3,
    })
    const c = projectCreature(input)
    expect(c).toBeTruthy()
    expect(c!.name).toBe('Thing')
    expect(c!.hpFormula).toBe('2d6+3')
    expect(c!.saves).toEqual({ dex: 4 })
    expect(c!.skills).toEqual({ stealth: 6 })
    expect(c!.actions![0].damage).toEqual([{ formula: '1d6+2', type: 'slashing' }])
    expect(c!.legendaryActions!.perRound).toBe(3)
    expect(c!.legendaryResistance).toBe(3)
  })

  it('copies the schema’s keys and leaves everything else behind', () => {
    const c = projectCreature(
      base({ payload: 'x'.repeat(500), nested: { deep: { deeper: [1, 2, 3] } }, __proto__: {} }),
    )
    expect(c).toBeTruthy()
    expect(Object.prototype.hasOwnProperty.call(c!, 'payload')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(c!, 'nested')).toBe(false)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it('refuses what can’t be rendered as a stat block', () => {
    expect(projectCreature(null)).toBeNull()
    expect(projectCreature('a goblin')).toBeNull()
    expect(projectCreature([base()])).toBeNull()
    expect(projectCreature({})).toBeNull()
    expect(projectCreature(base({ abilities: { str: 10, dex: 10 } }))).toBeNull()
    // Present and numeric, but no ability score is a thousand — and a creature with no
    // usable scores can't roll a saving throw, so there is nothing to salvage.
    expect(
      projectCreature(base({ abilities: { ...(base().abilities as object), str: 1e6 } })),
    ).toBeNull()
  })

  // ---- the fields that reach a formula ----

  it('drops an initiative modifier that isn’t one, because it is pasted into a d20', () => {
    for (const bad of ['9', 9.5, 1e21, null, {}, Number.MAX_SAFE_INTEGER]) {
      const c = projectCreature(base({ initiative: bad }))!
      expect(c.initiative, `initiative ${JSON.stringify(bad)} survived`).toBeUndefined()
      // The shape the app actually uses it in — one that used to break Begin combat for the
      // whole board rather than just this creature.
      const mod = c.initiative ?? 0
      expect(() => roll(`1d20${mod >= 0 ? `+${mod}` : `${mod}`}`)).not.toThrow()
    }
    expect(projectCreature(base({ initiative: -3 }))!.initiative).toBe(-3)
  })

  it('drops a save bonus that isn’t a number, because every save rolls it', () => {
    const c = projectCreature(base({ saves: { dex: 'a lot', con: 3, wis: 1e12 } }))!
    expect(c.saves).toEqual({ con: 3 })
    const board = onBoard(c)
    for (const ability of ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const) {
      const bonus = saveBonus(board, ability)!
      expect(Number.isInteger(bonus), `${ability} bonus is ${bonus}`).toBe(true)
      expect(() => roll(`1d20${bonus >= 0 ? `+${bonus}` : `${bonus}`}`)).not.toThrow()
    }
  })

  it('drops a hit-point formula the dice engine would refuse, and keeps one it wouldn’t', () => {
    expect(projectCreature(base({ hpFormula: '4000d20' }))!.hpFormula).toBeUndefined()
    expect(projectCreature(base({ hpFormula: 'garbage' }))!.hpFormula).toBeUndefined()
    expect(projectCreature(base({ hpFormula: '1d20+1e21' }))!.hpFormula).toBeUndefined()
    expect(projectCreature(base({ hpFormula: 'd'.repeat(500) }))!.hpFormula).toBeUndefined()
    expect(projectCreature(base({ hpFormula: 19 }))!.hpFormula).toBeUndefined()
    expect(projectCreature(base({ hpFormula: '19d12+133' }))!.hpFormula).toBe('19d12+133')
    // And it still rolls, under every method, which is the reason for the check.
    const c = projectCreature(base({ hpFormula: '4000d20' }))!
    for (const method of ['average', 'min', 'max', 'roll'] as const) {
      expect(resolveMaxHp(c, method)).toBe(10)
    }
  })

  it('drops a damage component whose formula won’t roll, and keeps the rest of the attack', () => {
    const c = projectCreature(
      base({
        actions: [
          {
            id: 'a',
            name: 'Bite',
            kind: 'melee',
            toHit: 5,
            damage: [
              { formula: '4000d20', type: 'fire' },
              { formula: '2d6+3', type: 'piercing' },
              { formula: '', type: 'cold' },
              { formula: { evil: true }, type: 'acid' },
            ],
          },
        ],
      }),
    )!
    expect(c.actions![0].damage).toEqual([{ formula: '2d6+3', type: 'piercing' }])
    expect(c.actions![0].toHit).toBe(5)
    for (const d of c.actions![0].damage!) expect(() => roll(d.formula)).not.toThrow()
  })

  it('turns a to-hit that isn’t a whole number into “not an attack”', () => {
    const attack = (toHit: unknown) =>
      projectCreature(base({ actions: [{ id: 'a', name: 'Bite', kind: 'melee', toHit }] }))!
        .actions![0]
    for (const bad of ['+5', 5.5, 1e21, [], {}, null]) {
      expect(attack(bad).toHit, `toHit ${JSON.stringify(bad)} survived`).toBeNull()
    }
    expect(attack(7).toHit).toBe(7)
    expect(attack(-1).toHit).toBe(-1)
  })

  it('drops a saving throw with no ability or no DC, rather than rolling against nothing', () => {
    const save = (s: unknown) =>
      projectCreature(
        base({ actions: [{ id: 'a', name: 'Blast', kind: 'save', toHit: null, save: s }] }),
      )!.actions![0].save
    expect(save({ ability: 'nope', dc: 15, onSave: 'half' })).toBeUndefined()
    expect(save({ ability: 'dex', dc: 1e21, onSave: 'half' })).toBeUndefined()
    expect(save({ ability: 'dex', dc: '15', onSave: 'half' })).toBeUndefined()
    expect(save({ dc: 15 })).toBeUndefined()
    expect(save({ ability: 'dex', dc: 15, onSave: 'half' })).toEqual({
      ability: 'dex',
      dc: 15,
      onSave: 'half',
    })
    // An unreadable on-save rule means half, the commonest and the least surprising.
    expect(save({ ability: 'con', dc: 12, onSave: 'everything' })).toEqual({
      ability: 'con',
      dc: 12,
      onSave: 'half',
    })
  })

  it('holds the legendary budget to a count, since it is what the round hands out', () => {
    const perRound = (v: unknown) =>
      projectCreature(base({ legendaryActions: { perRound: v, actions: [] } }))!.legendaryActions!
        .perRound
    expect(perRound(1e9)).toBe(3)
    expect(perRound(-1)).toBe(3)
    expect(perRound('three')).toBe(3)
    expect(perRound(2)).toBe(2)
    const c = projectCreature(base({ legendaryActions: { perRound: 1e9, actions: [] } }))!
    expect(legendaryPerRound(onBoard(c))).toBe(3)
    expect(onBoard(c).legendaryRemaining).toBe(3)
  })

  it('holds a recharge to a die face or a count, and gives an unreadable one a default', () => {
    const rc = (v: unknown) =>
      projectCreature(
        base({
          limitedUse: [
            {
              id: 'l',
              name: 'Breath',
              recharge: v,
              action: { id: 'l', name: 'Breath', kind: 'save', toHit: null },
            },
          ],
        }),
      )!.limitedUse![0].recharge
    expect(rc({ type: 'dice', value: 5 })).toEqual({ type: 'dice', value: 5 })
    expect(rc({ type: 'dice', value: -99 })).toEqual({ type: 'perDay', value: 1 })
    expect(rc({ type: 'dice', value: 99 })).toEqual({ type: 'perDay', value: 1 })
    expect(rc({ type: 'perDay', value: 3 })).toEqual({ type: 'perDay', value: 3 })
    expect(rc({ type: 'whenever' })).toEqual({ type: 'perDay', value: 1 })
    expect(rc(null)).toEqual({ type: 'perDay', value: 1 })
  })

  it('holds a caster’s DC and attack bonus to numbers, since a cast is seeded with them', () => {
    const sc = (over: Record<string, unknown>) =>
      projectCreature(
        base({
          spellcasting: {
            ability: 'cha',
            groups: [{ usage: { type: 'atWill' }, spells: [{ name: 'Fire Bolt' }] }],
            ...over,
          },
        }),
      )!.spellcasting!
    expect(sc({ saveDc: 15, toHit: 7 }).saveDc).toBe(15)
    expect(sc({ saveDc: '15' }).saveDc).toBeUndefined()
    expect(sc({ toHit: 1e21 }).toHit).toBeUndefined()
    // A slot level indexes the slot pool, so an unreadable one drops its group rather than
    // keying spells to a level that isn't there. The good group beside it still casts.
    const mixed = projectCreature(
      base({
        spellcasting: {
          groups: [
            { usage: { type: 'slots', level: 99 }, spells: [{ name: 'Fireball' }] },
            { usage: { type: 'perDay', per: 2 }, spells: [{ name: 'Misty Step' }] },
            { usage: { type: 'perDay', per: '2' }, spells: [{ name: 'Blur' }] },
          ],
        },
      }),
    )!
    expect(mixed.spellcasting!.groups).toEqual([
      { usage: { type: 'perDay', per: 2 }, spells: [{ name: 'Misty Step' }] },
    ])
  })

  // ---- the strings that reach the screen ----

  it('strips the characters that make a name read as something it isn’t', () => {
    const c = projectCreature(base({ name: 'Goblin‮ niatpaC‬ ​' }))!
    expect(c.name).toBe('Goblin niatpaC')
    const trait = projectCreature(base({ traits: [{ name: 'W atcher', text: 'It‭ sees​ all.' }] }))!
    expect(trait.traits![0]).toEqual({ name: 'Watcher', text: 'It sees all.' })
  })

  it('caps every string, so no one field can carry a stat block’s worth of nothing', () => {
    const c = projectCreature(
      base({
        name: 'N'.repeat(5000),
        description: 'd'.repeat(50_000),
        traits: [{ name: 't', text: 'x'.repeat(50_000) }],
        languages: Array.from({ length: 500 }, () => 'Common'),
      }),
    )!
    expect(c.name).toHaveLength(LIMITS.name)
    expect(c.description).toHaveLength(LIMITS.proseChars)
    expect(c.traits![0].text).toHaveLength(LIMITS.proseChars)
    expect(c.languages).toHaveLength(LIMITS.arrayItems)
  })

  it('refuses a stat block larger than any the app ships', () => {
    const big = (n: number) =>
      base({
        traits: Array.from({ length: n }, (_, i) => ({ name: `t${i}`, text: 'x'.repeat(4000) })),
      })
    expect(projectCreature(big(60))).toBeNull()
    expect(projectCreature(big(3))).toBeTruthy()
  })

  it('is fixed under a second pass, so what it accepts it accepts unchanged', () => {
    const messy = base({
      name: 'Go​blin‮',
      hpFormula: '2d6+3',
      initiative: 3,
      saves: { dex: 4, str: 'no' },
      traits: [{ name: 'T', text: 'x'.repeat(50_000) }],
      actions: [
        {
          id: 'a',
          name: 'Bite',
          kind: 'melee',
          toHit: 4.5,
          damage: [
            { formula: 'bad', type: 'fire' },
            { formula: '1d6', type: 'piercing' },
          ],
        },
      ],
      junk: { nope: true },
    })
    const once = projectCreature(messy)!
    const twice = projectCreature(JSON.parse(JSON.stringify(once)))!
    expect(twice).toEqual(once)
  })

  it('lets every creature the app ships through with nothing lost', () => {
    // 2,300-odd real stat blocks over four books, through a door they were never sent
    // through. A cap one notch too tight shows up here as a trimmed immunity or a dropped
    // action — which is how the first draft of this module was found to be wrong.
    //
    // String ends are trimmed on both sides, because that is the one thing the door changes:
    // some SRD 5.1 prose carries a leading space from its ingest.
    const trimmed = (v: unknown): unknown => {
      if (typeof v === 'string') return v.trim()
      if (Array.isArray(v)) return v.map(trimmed)
      if (v && typeof v === 'object') {
        return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, trimmed(x)]))
      }
      return v
    }

    let checked = 0
    const lostFields: string[] = []
    for (const file of readdirSync('public/compendium').filter((f) => f.includes('creatures'))) {
      const raw: unknown = JSON.parse(readFileSync(`public/compendium/${file}`, 'utf8'))
      const list = (Array.isArray(raw) ? raw : (raw as { creatures: Creature[] }).creatures) ?? []
      for (const shipped of list as Creature[]) {
        const projected = projectCreature(shipped)
        expect(projected, `${file}: ${shipped.name} was refused`).toBeTruthy()
        const kept = new Set(Object.keys(projected!))
        const lost = Object.keys(shipped).filter((key) => !kept.has(key))
        for (const key of lost) lostFields.push(`${shipped.name}.${key}`)
        // The one known divergence is asserted on its own below.
        const same = (c: Creature) => trimmed({ ...c, hpFormula: '' })
        expect(same(projected!), `${file}: ${shipped.name} came back changed`).toEqual(
          same(shipped),
        )
        checked += 1
      }
    }
    expect(checked).toBeGreaterThan(2000)

    // A defect in the shipped data, not a cap set too tight: the Ravenfolk Scout's hit dice
    // read "6d8‒6" with a figure dash, so opendice has never rolled it and `resolveMaxHp`
    // has always used the printed average. This list must not grow.
    expect(lostFields).toEqual(['Ravenfolk Scout.hpFormula'])
  })
})
