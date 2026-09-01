// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { describe, expect, it } from 'vitest'
import type { Combatant } from '../../src/schema/combatant.ts'
import type { Creature } from '../../src/schema/creature.ts'
import { TEMPLATE_LIMITS as LIMITS } from '../../src/schema/encounterTemplate.ts'
import { parseTemplate, templateToCombatants } from '../../src/combat/encounterTemplate.ts'
import { parseImportedCreature } from '../../src/combat/importCreature.ts'
import { rollRecharge } from '../../src/combat/recharge.ts'
import { resolveMaxHp } from '../../src/combat/hp.ts'
import { rollSave, saveBonus } from '../../src/combat/masssave.ts'
import { legendaryPerRound } from '../../src/combat/resources.ts'
import { beginEncounter, nextTurn } from '../../src/combat/initiative.ts'
import { instantiate } from '../../src/combat/combatant.ts'
import { roll } from '../../src/dice/roll.ts'
import { signed } from '../../src/compendium/format.ts'

/**
 * The two doors that read something nobody here wrote: a shared encounter's payload, and a
 * stat block pasted into the importer.
 *
 * `tests/schema/creatureInput.test.ts` covers the fields one at a time; these fuzz both doors
 * for the two properties they exist for. One, the parser answers — never throws, never hangs.
 * Two, what it lets through the console can run: the board rolls initiative, saves, recharges
 * and attacks with no throw anywhere.
 */

/** A stat block complete enough to be readable, with a field replaced. */
const creature = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'custom:theirs',
  source: 'custom',
  name: 'Thing',
  size: 'Medium',
  type: 'aberration',
  ac: 14,
  maxHp: 30,
  speed: { walk: 30 },
  abilities: { str: 10, dex: 14, con: 12, int: 10, wis: 10, cha: 10 },
  senses: { passivePerception: 10 },
  ...over,
})

const share = (creatures: unknown[]): Record<string, unknown> => ({
  v: 1,
  name: 'Ambush',
  entries: creatures.map((c) => ({ creature: c, count: 1, side: 'foe' })),
})

/** Wrong in every way JSON can be: bad types, non-integers, magnitudes that break a
 *  formula, shapes that aren't shapes. Each is tried in every position a stat block has. */
const HOSTILE: unknown[] = [
  null,
  true,
  false,
  0,
  -1,
  -99999,
  0.5,
  1e21,
  -1e21,
  Number.MAX_SAFE_INTEGER,
  Number.MAX_VALUE,
  1e-9,
  '',
  ' ',
  '0',
  '5',
  '+5',
  'NaN',
  'Infinity',
  'a lot',
  '1d20',
  '4000d20',
  '9'.repeat(400),
  'x'.repeat(30_000),
  '‮gnihtemos‬',
  '\u0000\u0007',
  [],
  [1, 2, 3],
  {},
  { type: 'dice' },
  { nested: { deeper: { deepest: 1 } } },
]

/** Every field of a stat block that reaches a formula or a number the app computes with. */
const FIELDS: ((v: unknown) => Record<string, unknown>)[] = [
  (v) => creature({ hpFormula: v }),
  (v) => creature({ initiative: v }),
  (v) => creature({ ac: v }),
  (v) => creature({ maxHp: v }),
  (v) => creature({ cr: v }),
  (v) => creature({ saves: { dex: v, con: v } }),
  (v) => creature({ skills: { stealth: v } }),
  (v) => creature({ abilities: { str: v, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } }),
  (v) => creature({ senses: { passivePerception: v, darkvision: v } }),
  (v) => creature({ speed: { walk: v, fly: v } }),
  (v) => creature({ legendaryResistance: v, legendaryResistanceLair: v }),
  (v) => creature({ legendaryActions: v }),
  (v) => creature({ legendaryActions: { perRound: v, perRoundLair: v, actions: v } }),
  (v) => creature({ actions: v }),
  (v) => creature({ actions: [{ id: 'a', name: 'Slam', kind: 'melee', toHit: v }] }),
  (v) => creature({ actions: [{ id: 'a', name: 'Slam', kind: v, toHit: 5 }] }),
  (v) => creature({ actions: [{ id: 'a', name: 'Slam', kind: 'melee', toHit: 5, damage: v }] }),
  (v) =>
    creature({
      actions: [
        { id: 'a', name: 'Slam', kind: 'melee', toHit: 5, damage: [{ formula: v, type: v }] },
      ],
    }),
  (v) => creature({ actions: [{ id: 'a', name: 'Blast', kind: 'save', toHit: null, save: v }] }),
  (v) =>
    creature({
      actions: [
        {
          id: 'a',
          name: 'Blast',
          kind: 'save',
          toHit: null,
          save: { ability: v, dc: v, onSave: v },
        },
      ],
    }),
  (v) =>
    creature({ actions: [{ id: 'a', name: 'Slam', kind: 'melee', toHit: 5, legendaryCost: v }] }),
  (v) => creature({ actions: [{ id: v, name: v, kind: 'melee', toHit: 5, recharge: v }] }),
  (v) => creature({ limitedUse: v }),
  (v) =>
    creature({
      limitedUse: [
        {
          id: 'l',
          name: 'Breath',
          recharge: v,
          action: { id: 'l', name: 'B', kind: 'save', toHit: null },
        },
      ],
    }),
  (v) => creature({ spellcasting: v }),
  (v) => creature({ spellcasting: { ability: v, saveDc: v, toHit: v, groups: v, slots: v } }),
  (v) =>
    creature({
      spellcasting: {
        groups: [{ usage: { type: 'slots', level: v }, spells: [{ name: 'X', ref: v }] }],
      },
    }),
  (v) => creature({ spellcasting: { groups: [{ usage: v, spells: [{ name: 'X' }] }] } }),
  (v) => creature({ traits: v }),
  (v) => creature({ traits: [{ name: v, text: v }] }),
  (v) => creature({ name: v }),
  (v) => creature({ description: v }),
  (v) => creature({ languages: v, immunities: v, resistances: v, gear: v }),
  (v) => creature({ id: v, source: v, edition: v, sourcePage: v, xp: v, xpLair: v }),
  (v) => creature({ size: v, type: v, alignment: v }),
  (v) => creature({ bonusActions: v, reactions: v, lairActions: v }),
]

/** Run a board the way a fight does. Every roll here pastes a number from the creature into
 *  a formula string, so this is where a stat block breaks the console if it can. */
function runAFight(combatants: Combatant[]): void {
  let encounter = beginEncounter({
    encounterId: 'e1',
    ownerId: null,
    combatants,
    activeIndex: 0,
    round: 0,
    log: [],
  })
  for (const c of encounter.combatants) {
    if (c.isPC) continue
    // Initiative, which is where a bad `initiative` used to break the whole board at once.
    const mod = c.creature.initiative ?? Math.floor((c.creature.abilities.dex - 10) / 2)
    roll(`1d20${signed(mod)}`)
    for (const ability of ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const) {
      saveBonus(c, ability)
      rollSave(c, { ability, dc: 12, onSave: 'half' })
    }
    legendaryPerRound(c)
    for (const method of ['average', 'min', 'max', 'roll'] as const) {
      const hp = resolveMaxHp(c.creature, method)
      expect(Number.isInteger(hp) && hp >= 1).toBe(true)
    }
    const actions = [
      ...(c.creature.actions ?? []),
      ...(c.creature.bonusActions ?? []),
      ...(c.creature.reactions ?? []),
      ...(c.creature.lairActions ?? []),
      ...(c.creature.legendaryActions?.actions ?? []),
      ...(c.creature.limitedUse ?? []).map((l) => l.action),
    ]
    for (const action of actions) {
      rollRecharge(action)
      if (action.toHit != null) roll(`1d20${signed(action.toHit)}`, { kind: 'attack' })
      for (const d of action.damage ?? []) roll(d.formula, { kind: 'damage', crit: true })
      if (action.save)
        roll(`1d20${signed(saveBonus(c, action.save.ability) ?? 0)}`, { kind: 'save' })
    }
  }
  encounter = nextTurn(encounter)
  expect(encounter.combatants.length).toBe(combatants.length)
}

describe('parseTemplate — fuzzed', () => {
  it('answers rather than throwing, whatever the payload is', () => {
    const payloads: unknown[] = [
      ...HOSTILE,
      { v: 1 },
      { v: 1, name: 'x' },
      { v: 1, name: 'x', entries: [] },
      { v: 999, name: 'x', entries: [{ ref: 'a', count: 1, side: 'foe' }] },
      { v: 1, name: 'x', entries: [{ count: 1, side: 'foe' }] },
      // Two ways of naming one creature: which wins is not the reader's to guess.
      { v: 1, name: 'x', entries: [{ ref: 'a', creature: creature(), count: 1, side: 'foe' }] },
      {
        v: 1,
        name: 'x',
        entries: [{ quick: { name: 'a', maxHp: 1, ac: 1 }, ref: 'b', count: 1, side: 'foe' }],
      },
      JSON.parse('{"v":1,"name":"x","__proto__":{"polluted":true},"entries":[]}'),
      JSON.parse('{"v":1,"name":"x","constructor":{"prototype":{"polluted":true}},"entries":[]}'),
      ...FIELDS.flatMap((build) => HOSTILE.map((v) => share([build(v)]))),
    ]
    for (const value of payloads) {
      expect(
        () => parseTemplate(value),
        `threw on ${JSON.stringify(value)?.slice(0, 120)}`,
      ).not.toThrow()
      const { template, error } = parseTemplate(value)
      // One or the other, never both and never neither.
      expect(Boolean(template) !== Boolean(error), 'gave back both or neither').toBe(true)
      if (error) expect(error.length).toBeGreaterThan(10)
    }
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it('hands back a board that can actually fight, for every payload it accepts', () => {
    let accepted = 0
    for (const build of FIELDS) {
      for (const value of HOSTILE) {
        const { template } = parseTemplate(share([build(value)]))
        if (!template) continue
        accepted += 1
        for (const method of ['average', 'min', 'max', 'roll'] as const) {
          const { combatants } = templateToCombatants(template, { creatures: [], hpMethod: method })
          expect(
            () => runAFight(combatants),
            `broke the board: ${JSON.stringify(value).slice(0, 80)}`,
          ).not.toThrow()
        }
      }
    }
    // Most are repaired rather than refused, which is the intent. If this collapses toward
    // zero the door has quietly turned into a wall.
    expect(accepted).toBeGreaterThan(FIELDS.length * 10)
  })

  it('never lets a payload through that is bigger than the blob it becomes', () => {
    const filler = (n: number) => ({ name: 't', text: 'x'.repeat(n) })
    for (const [entries, chars] of [
      [40, 4000],
      [40, 1500],
      [2, 20_000],
      [1, 500_000],
    ] as const) {
      const fat = creature({ traits: Array.from({ length: 3 }, () => filler(chars)) })
      const { template } = parseTemplate({
        v: 1,
        name: 'x',
        entries: Array.from({ length: entries }, () => ({ creature: fat, count: 2, side: 'foe' })),
      })
      if (!template) continue
      expect(JSON.stringify(template).length).toBeLessThanOrEqual(LIMITS.readBytes)
      const { combatants } = templateToCombatants(template, { creatures: [], hpMethod: 'average' })
      // What immediate recovery writes for a board the recipient did not build. A normal
      // full board is a couple of hundred kilobytes.
      expect(JSON.stringify(combatants).length).toBeLessThan(2 * 1024 * 1024)
    }
  })

  it('never spends longer than a moment deciding, however deep the payload', () => {
    // A parser that answers but takes a minute is a parser that hangs the tab.
    const deep = (n: number): unknown => (n === 0 ? 'x' : { nested: deep(n - 1) })
    const wide = Array.from({ length: 5000 }, (_, i) => ({ name: `t${i}`, text: 'x'.repeat(200) }))
    const started = performance.now()
    for (const value of [
      share([creature({ traits: deep(200) })]),
      share([creature({ traits: wide })]),
      share([creature({ description: 'x'.repeat(500_000) })]),
      share(Array.from({ length: 200 }, () => creature())),
    ]) {
      expect(() => parseTemplate(value)).not.toThrow()
    }
    expect(performance.now() - started).toBeLessThan(2000)
  })

  it('the harness has teeth: the same stat block breaks a board if it skips the door', () => {
    // A test of the test above: `runAFight` is only worth running if it can fail. Each of
    // these is a real throw out of opendice, in whatever click handler asked for the roll.
    const unprojected = (over: Record<string, unknown>): Combatant[] => [
      instantiate(creature(over) as unknown as Creature, {
        combatantId: 'c1',
        initiative: 0,
        label: 'Thing',
      }),
    ]
    // A save bonus that isn't a number: "1d20a lot".
    expect(() => runAFight(unprojected({ saves: { dex: 'a lot' } }))).toThrow()
    // An initiative modifier that isn't one, which takes the whole board's Begin with it.
    expect(() => runAFight(unprojected({ initiative: '9 or 1d20' }))).toThrow()
    // A saving throw naming an ability that doesn't exist: abilityMod(undefined) is NaN.
    expect(() =>
      runAFight(
        unprojected({
          actions: [
            {
              id: 'a',
              name: 'Blast',
              kind: 'save',
              toHit: null,
              save: { ability: 'nope', dc: 12, onSave: 'half' },
            },
          ],
        }),
      ),
    ).toThrow()
    // A damage formula past opendice's thousand-dice limit.
    expect(() =>
      runAFight(
        unprojected({
          actions: [
            {
              id: 'a',
              name: 'Slam',
              kind: 'melee',
              toHit: 5,
              damage: [{ formula: '4000d20', type: 'fire' }],
            },
          ],
        }),
      ),
    ).toThrow()
    // The hit-dice formula this sweep began from, which `resolveMaxHp` now survives alone.
    expect(() => runAFight(unprojected({ hpFormula: '4000d20' }))).not.toThrow()
  })
})

describe('parseImportedCreature — fuzzed', () => {
  it('answers rather than throwing, whatever the text is', () => {
    const texts = [
      '',
      ' ',
      'not json',
      'null',
      'true',
      '[]',
      '[{}]',
      '{}',
      '"a goblin"',
      '{"name":"x"}',
      '{',
      '{"a":' + '['.repeat(2000) + ']'.repeat(2000) + '}',
      JSON.stringify(creature()),
      JSON.stringify({ ...creature(), __proto__: { polluted: true } }),
      '{"__proto__":{"polluted":true},' + JSON.stringify(creature()).slice(1),
      ...FIELDS.flatMap((build) => HOSTILE.map((v) => JSON.stringify(build(v)))),
    ]
    for (const text of texts) {
      expect(() => parseImportedCreature(text), `threw on ${text.slice(0, 80)}`).not.toThrow()
      const { creature: got, error } = parseImportedCreature(text)
      expect(
        Boolean(got) !== Boolean(error),
        `gave back both or neither for ${text.slice(0, 60)}`,
      ).toBe(true)
    }
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it('hands back a creature the console can run, for every paste it accepts', () => {
    let accepted = 0
    for (const build of FIELDS) {
      for (const value of HOSTILE) {
        const { creature: got } = parseImportedCreature(JSON.stringify(build(value)))
        if (!got) continue
        accepted += 1
        const { template } = parseTemplate(share([got]))
        expect(template, 'its own import is not readable as a share').toBeTruthy()
        const { combatants } = templateToCombatants(template!, { creatures: [], hpMethod: 'roll' })
        expect(() => runAFight(combatants)).not.toThrow()
      }
    }
    expect(accepted).toBeGreaterThan(FIELDS.length * 10)
  })

  it('refuses a paste too large to be a stat block before it parses it', () => {
    const huge = JSON.stringify({ ...creature(), description: 'x'.repeat(400_000) })
    const { creature: got, error } = parseImportedCreature(huge)
    expect(got).toBeUndefined()
    expect(error).toMatch(/larger than a stat block/)
  })

  it('mints a fresh custom id, so a paste can never overwrite a library entry', () => {
    for (const id of ['srd-5.2:goblin', 'custom:mine', '', 'x'.repeat(500)]) {
      const { creature: got } = parseImportedCreature(JSON.stringify(creature({ id })))
      expect(got!.id).toMatch(/^custom:[0-9a-f-]{36}$/)
    }
  })

  it('keeps the fields a Game Master would notice losing', () => {
    // The projection drops what the schema doesn't name, which is the point — but a real
    // paste must survive it whole, or the importer is worse than it was.
    const { creature: got } = parseImportedCreature(
      JSON.stringify(
        creature({
          hpFormula: '7d10+21',
          cr: 0.5,
          alignment: 'chaotic evil',
          languages: ['Common', 'Abyssal'],
          traits: [{ name: 'Pack Tactics', text: 'It has **advantage** when allies are near.' }],
          actions: [
            {
              id: 'slam',
              name: 'Slam',
              kind: 'melee',
              toHit: 6,
              reach: 10,
              damage: [{ formula: '2d8+4', type: 'bludgeoning' }],
              text: 'Melee Attack Roll: +6, reach 10 ft.',
            },
          ],
          legendaryActions: { perRound: 3, actions: [] },
        }),
      ),
    )
    const c = got as Creature
    expect(c.hpFormula).toBe('7d10+21')
    expect(c.cr).toBe(0.5)
    expect(c.alignment).toBe('chaotic evil')
    expect(c.languages).toEqual(['Common', 'Abyssal'])
    expect(c.traits).toEqual([
      { name: 'Pack Tactics', text: 'It has **advantage** when allies are near.' },
    ])
    expect(c.actions![0]).toMatchObject({
      name: 'Slam',
      toHit: 6,
      reach: 10,
      damage: [{ formula: '2d8+4', type: 'bludgeoning' }],
    })
    expect(c.legendaryActions!.perRound).toBe(3)
  })
})
