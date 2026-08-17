// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { describe, expect, it } from 'vitest'
import type { Combatant } from '../../src/schema/combatant.ts'
import type { Creature } from '../../src/schema/creature.ts'
import type { EncounterTemplate } from '../../src/schema/encounterTemplate.ts'
import {
  castSize,
  parseTemplate,
  templateEntries,
  templateFromBoard,
  templateToCombatants,
} from '../../src/combat/encounterTemplate.ts'

/**
 * A template is prep, and the two directions have different jobs: going out it must forget
 * the fight (hit points, effects, initiative) while keeping the decisions (how many, which
 * side, the names the Game Master typed); coming in from a link it is the app's only
 * untrusted-input parser, and what it accepts is autosaved into the reader's own account.
 */

/** A library creature complete enough to instantiate and to pass the outside-input check. */
const creature = (over: Partial<Creature> = {}): Creature =>
  ({
    id: 'srd-5.2:goblin',
    source: 'srd-5.2',
    name: 'Goblin',
    size: 'Small',
    type: 'humanoid',
    ac: 15,
    maxHp: 7,
    speed: { walk: 30 },
    abilities: { str: 8, dex: 15, con: 10, int: 10, wis: 8, cha: 8 },
    senses: { passivePerception: 9 },
    ...over,
  }) as Creature

const monster = (over: Partial<Extract<Combatant, { isPC: false }>> = {}): Combatant =>
  ({
    isPC: false,
    combatantId: crypto.randomUUID(),
    creatureId: 'srd-5.2:goblin',
    creature: creature(),
    label: 'Goblin',
    initiative: 0,
    status: 'active',
    hp: { current: 7, max: 7, temp: 0 },
    slotsUsed: {},
    spellUsesSpent: {},
    limitedUseState: {},
    legendaryRemaining: 0,
    concentration: null,
    effects: [],
    visibility: { name: 'shown', hp: 'bloodied', conditions: 'shown', ac: 'hidden' },
    ...over,
  }) as Combatant

const pc = (over: Partial<Extract<Combatant, { isPC: true }>> = {}): Combatant =>
  ({
    isPC: true,
    kind: 'pc',
    combatantId: crypto.randomUUID(),
    name: 'Astra',
    ac: 16,
    initiative: 0,
    status: 'active',
    hp: { current: 12, max: 24, temp: 0 },
    concentration: null,
    effects: [],
    ...over,
  }) as Combatant

const quick = (over: Partial<Extract<Combatant, { isPC: true }>> = {}): Combatant =>
  pc({ kind: 'quick', name: 'Cart driver', ac: 11, hp: { current: 6, max: 11, temp: 0 }, ...over })

/** A minimal valid share payload, as it arrives from the database. */
const payload = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  v: 1,
  name: 'Goblin ambush',
  entries: [{ ref: 'srd-5.2:goblin', count: 4, side: 'foe' }],
  ...over,
})

describe('templateEntries', () => {
  it('groups copies of one creature into a count', () => {
    const entries = templateEntries([monster(), monster({ label: 'Goblin 2' }), monster()])
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ ref: 'srd-5.2:goblin', count: 3, side: 'foe' })
  })

  it('keeps the two sides apart, so a charmed ogre stays an ally', () => {
    const entries = templateEntries([monster(), monster({ side: 'friend', label: 'Snik' })])
    expect(entries.map((e) => e.side)).toEqual(['foe', 'friend'])
  })

  it('keeps a typed name and drops the auto-numbering', () => {
    // "Goblin 2" is the app numbering duplicates; "Snik" is a decision.
    const entries = templateEntries([
      monster({ label: 'Snik' }),
      monster({ label: 'Goblin 2' }),
      monster({ label: 'Goblin' }),
    ])
    expect(entries[0].count).toBe(3)
    expect(entries[0].labels).toEqual(['Snik'])
  })

  it('carries the lair, which is a prep decision, and groups by it', () => {
    const entries = templateEntries([monster({ inLair: true }), monster()])
    expect(entries).toHaveLength(2)
    expect(entries.find((e) => e.inLair)?.count).toBe(1)
  })

  it('leaves player characters out and takes quick adds in', () => {
    const entries = templateEntries([pc(), monster(), quick()])
    expect(entries).toHaveLength(2)
    expect(entries.some((e) => e.quick?.name === 'Cart driver')).toBe(true)
    expect(JSON.stringify(entries)).not.toContain('Astra')
  })

  it('counts identical quick adds together and keeps their numbers', () => {
    const entries = templateEntries([quick(), quick()])
    expect(entries).toEqual([
      { quick: { name: 'Cart driver', maxHp: 11, ac: 11 }, count: 2, side: 'friend' },
    ])
  })

  it('carries homebrew whole and a library creature as an id', () => {
    const own = creature({ id: 'custom:abc', source: 'custom', name: 'Thing' })
    const entries = templateEntries([monster({ creatureId: 'custom:abc', creature: own })])
    expect(entries[0].creature?.name).toBe('Thing')
    expect(entries[0].ref).toBeUndefined()
  })

  it('forgets the fight — no hit points, effects or initiative travel', () => {
    const wounded = monster({
      hp: { current: 2, max: 7, temp: 3 },
      initiative: 17,
      effects: [{ id: 'e', name: 'Poisoned' }],
    } as Partial<Extract<Combatant, { isPC: false }>>)
    const json = JSON.stringify(templateEntries([wounded]))
    expect(json).not.toContain('Poisoned')
    expect(json).not.toContain('"current"')
    expect(json).not.toContain('17')
  })
})

describe('templateFromBoard', () => {
  it('cleans the name and counts the cast', () => {
    const template = templateFromBoard([monster(), monster(), quick()], '  Goblin   ambush  ')
    expect(template).toMatchObject({ v: 1, name: 'Goblin ambush' })
    expect(castSize(template)).toBe(3)
  })
})

describe('templateToCombatants', () => {
  const opts = { creatures: [creature()], hpMethod: 'average' as const }

  it('instantiates fresh combatants, not the ones that were saved', () => {
    const { combatants, missing } = templateToCombatants(
      { v: 1, name: 'Ambush', entries: [{ ref: 'srd-5.2:goblin', count: 2, side: 'foe' }] },
      opts,
    )
    expect(missing).toEqual([])
    expect(combatants).toHaveLength(2)
    for (const c of combatants) {
      expect(c.hp).toEqual({ current: 7, max: 7, temp: 0 })
      expect(c.effects).toEqual([])
      expect(c.initiative).toBe(0)
      expect(c.status).toBe('active')
    }
    // Fresh ids, so adding the same encounter twice can't collide.
    expect(new Set(combatants.map((c) => c.combatantId)).size).toBe(2)
  })

  it('numbers the copies, and carries on from whoever is already on the board', () => {
    const { combatants } = templateToCombatants(
      { v: 1, name: 'More', entries: [{ ref: 'srd-5.2:goblin', count: 2, side: 'foe' }] },
      { ...opts, existing: [monster(), monster({ label: 'Goblin 2' })] },
    )
    expect(combatants.map((c) => (c.isPC ? c.name : c.label))).toEqual(['Goblin 3', 'Goblin 4'])
  })

  it('uses the typed names first, then numbers the rest', () => {
    const { combatants } = templateToCombatants(
      {
        v: 1,
        name: 'Ambush',
        entries: [{ ref: 'srd-5.2:goblin', count: 3, side: 'foe', labels: ['Snik'] }],
      },
      opts,
    )
    expect(combatants.map((c) => (c.isPC ? c.name : c.label))).toEqual([
      'Snik',
      'Goblin 2',
      'Goblin 3',
    ])
  })

  it('reports what it could not find instead of quietly adding less', () => {
    const { combatants, missing } = templateToCombatants(
      {
        v: 1,
        name: 'Ambush',
        entries: [
          { ref: 'srd-5.2:goblin', count: 1, side: 'foe' },
          { ref: 'kobold-press-tob9:wyrm', count: 1, side: 'foe' },
        ],
      },
      opts,
    )
    expect(combatants).toHaveLength(1)
    expect(missing).toEqual(['kobold-press-tob9:wyrm'])
  })

  it('carries the side and the lair onto the board', () => {
    const { combatants } = templateToCombatants(
      {
        v: 1,
        name: 'Ambush',
        entries: [{ ref: 'srd-5.2:goblin', count: 1, side: 'friend', inLair: true }],
      },
      opts,
    )
    const first = combatants[0]
    expect(first.isPC).toBe(false)
    if (!first.isPC) {
      expect(first.side).toBe('friend')
      expect(first.inLair).toBe(true)
    }
  })

  it('rebuilds a quick add as a quick add', () => {
    const { combatants } = templateToCombatants(
      {
        v: 1,
        name: 'Ambush',
        entries: [{ quick: { name: 'Cart driver', maxHp: 11, ac: 11 }, count: 1, side: 'friend' }],
      },
      opts,
    )
    expect(combatants[0]).toMatchObject({
      isPC: true,
      kind: 'quick',
      name: 'Cart driver',
      hp: { current: 11, max: 11, temp: 0 },
    })
  })

  it('never adds more than a board can hold, even from a template that asks', () => {
    const entries = Array.from({ length: 40 }, () => ({
      ref: 'srd-5.2:goblin',
      count: 30,
      side: 'foe' as const,
    }))
    const { combatants } = templateToCombatants({ v: 1, name: 'Horde', entries }, opts)
    expect(combatants).toHaveLength(100)
  })

  it('round-trips a board through a template', () => {
    const board = [monster({ label: 'Snik' }), monster(), quick(), pc()]
    const { combatants } = templateToCombatants(templateFromBoard(board, 'Ambush'), opts)
    // The party stays behind; the two goblins and the quick add come back.
    expect(combatants).toHaveLength(3)
    expect(combatants.filter((c) => !c.isPC)).toHaveLength(2)
    expect(combatants.some((c) => c.isPC && c.name === 'Astra')).toBe(false)
  })
})

describe('parseTemplate', () => {
  it('reads a well-formed payload', () => {
    const { template, error } = parseTemplate(payload({ note: 'They wait in the rafters.' }))
    expect(error).toBeUndefined()
    expect(template).toMatchObject({
      v: 1,
      name: 'Goblin ambush',
      note: 'They wait in the rafters.',
    })
    expect(template?.entries[0]).toEqual({ ref: 'srd-5.2:goblin', count: 4, side: 'foe' })
  })

  it('refuses what isn’t a template at all', () => {
    for (const value of [null, undefined, 42, 'a string', [], {}]) {
      expect(parseTemplate(value).error).toBeTruthy()
    }
  })

  it('refuses a payload from a newer console rather than reading half of it', () => {
    expect(parseTemplate(payload({ v: 2 })).error).toContain('newer version')
  })

  it('refuses counts and sizes past the caps rather than clamping them silently', () => {
    expect(
      parseTemplate(payload({ entries: [{ ref: 'a', count: 31, side: 'foe' }] })).error,
    ).toBeTruthy()
    expect(
      parseTemplate(payload({ entries: [{ ref: 'a', count: 0, side: 'foe' }] })).error,
    ).toBeTruthy()
    expect(
      parseTemplate(payload({ entries: [{ ref: 'a', count: 1.5, side: 'foe' }] })).error,
    ).toBeTruthy()
    expect(parseTemplate(payload({ name: 'x'.repeat(61) })).error).toBeTruthy()
    expect(parseTemplate(payload({ note: 'x'.repeat(2001) })).error).toBeTruthy()
    expect(
      parseTemplate(
        payload({
          entries: Array.from({ length: 41 }, () => ({ ref: 'a', count: 1, side: 'foe' })),
        }),
      ).error,
    ).toBeTruthy()
    // Forty entries of thirty is 1200 combatants, which the total cap refuses.
    expect(
      parseTemplate(
        payload({
          entries: Array.from({ length: 40 }, () => ({ ref: 'a', count: 30, side: 'foe' })),
        }),
      ).error,
    ).toBeTruthy()
  })

  it('refuses a malformed entry', () => {
    const bad: unknown[] = [
      { count: 1, side: 'foe' }, // no creature named at all
      { ref: 'a', creature: creature(), count: 1, side: 'foe' }, // two ways of naming one
      { ref: 'a', count: 1, side: 'nobody' },
      { ref: 'a', count: 1 },
      { ref: '../../etc/passwd', count: 1, side: 'foe' },
      { ref: 'a b', count: 1, side: 'foe' },
      { ref: 'a'.repeat(200), count: 1, side: 'foe' },
      'not an entry',
    ]
    for (const entry of bad) {
      expect(parseTemplate(payload({ entries: [entry] })).error, JSON.stringify(entry)).toBeTruthy()
    }
  })

  it('refuses an embedded creature that can’t be rendered', () => {
    const { name, ...noName } = creature()
    expect(name).toBeTruthy()
    expect(
      parseTemplate(payload({ entries: [{ creature: noName, count: 1, side: 'foe' }] })).error,
    ).toBeTruthy()
  })

  it('re-mints an embedded creature’s id, so it can’t pass as a library entry', () => {
    const { template } = parseTemplate(
      payload({
        entries: [
          {
            creature: creature({ id: 'srd-5.2:goblin', source: 'srd-5.2' }),
            count: 1,
            side: 'foe',
          },
        ],
      }),
    )
    expect(template?.entries[0].creature?.id).toMatch(/^custom:/)
    expect(template?.entries[0].creature?.source).toBe('custom')
  })

  it('drops an embedded creature’s junk instead of carrying it into a saved fight', () => {
    const stuffed = {
      ...creature(),
      surprise: 'x'.repeat(1000),
      nested: { deep: { deeper: [1, 2, 3] } },
    }
    const { template } = parseTemplate(
      payload({ entries: [{ creature: stuffed, count: 1, side: 'foe' }] }),
    )
    const kept = template?.entries[0].creature as unknown as Record<string, unknown>
    expect(kept.surprise).toBeUndefined()
    expect(kept.nested).toBeUndefined()
    expect(kept.name).toBe('Goblin')
  })

  it('neither pollutes nor carries a prototype key', () => {
    // Everything is rebuilt key by key from a known list, so a key like this is dropped on
    // the way through — the reason nothing here is ever spread from the input.
    const hostile = JSON.parse(
      '{"v":1,"name":"Ambush","__proto__":{"polluted":true},"entries":[{"ref":"a","count":1,"side":"foe","__proto__":{"polluted":true}}]}',
    ) as unknown
    const { template } = parseTemplate(hostile)
    expect(template).toBeTruthy()
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    expect(Object.prototype.hasOwnProperty.call(template ?? {}, 'polluted')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(template?.entries[0] ?? {}, 'polluted')).toBe(false)

    // Same for a creature: the schema's keys are copied, the rest is left behind.
    const stuffed = parseTemplate(
      payload({
        entries: [
          {
            creature: JSON.parse(
              `{"__proto__":{"polluted":true},${JSON.stringify(creature()).slice(1)}`,
            ),
            count: 1,
            side: 'foe',
          },
        ],
      }),
    )
    const kept = stuffed.template?.entries[0].creature as unknown as Record<string, unknown>
    expect(stuffed.error).toBeUndefined()
    expect(kept.name).toBe('Goblin')
    expect(Object.prototype.hasOwnProperty.call(kept, 'polluted')).toBe(false)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()

    // Nested inside a field we do keep, it is refused rather than reached into: a stat block
    // has no business carrying one, so there is nothing to salvage.
    expect(
      parseTemplate(
        payload({
          entries: [
            {
              creature: {
                ...creature(),
                speed: JSON.parse('{"walk":30,"__proto__":{"polluted":true}}'),
              },
              count: 1,
              side: 'foe',
            },
          ],
        }),
      ).error,
    ).toBeTruthy()
  })

  it('drops a formula the dice engine would refuse', () => {
    const { template } = parseTemplate(
      payload({
        entries: [{ creature: creature({ hpFormula: '4000d20' }), count: 1, side: 'foe' }],
      }),
    )
    expect(template?.entries[0].creature?.hpFormula).toBeUndefined()
    const good = parseTemplate(
      payload({ entries: [{ creature: creature({ hpFormula: '2d6+2' }), count: 1, side: 'foe' }] }),
    )
    expect(good.template?.entries[0].creature?.hpFormula).toBe('2d6+2')
  })

  it('strips the characters that would make a name read as something else', () => {
    const { template } = parseTemplate(
      payload({
        name: 'Amb‮ush',
        entries: [{ ref: 'srd-5.2:goblin', count: 1, side: 'foe', labels: ['Sn​ik'] }],
      }),
    )
    expect(template?.name).toBe('Ambush')
    expect(template?.entries[0].labels).toEqual(['Snik'])
  })

  it('keeps a byline that follows the rules and drops one that doesn’t', () => {
    expect(parseTemplate(payload({ by: 'Bob' })).template?.by).toBe('Bob')
    // Refusing the whole encounter over an attribution line would hand whoever wrote it the
    // power to break the page, so the cast survives and the byline doesn't.
    for (const by of ['OpenFray', '<script>alert(1)</script>', 'x'.repeat(40)]) {
      const { template, error } = parseTemplate(payload({ by }))
      expect(error).toBeUndefined()
      expect(template?.by).toBeUndefined()
      expect(template?.entries).toHaveLength(1)
    }
  })

  it('parses what it produced, so a published template can always be read back', () => {
    const template: EncounterTemplate = {
      ...templateFromBoard([monster({ label: 'Snik' }), monster(), quick()], 'Goblin ambush'),
      note: 'They **wait** in the rafters.',
      by: 'Nico Verdi',
    }
    const { template: read, error } = parseTemplate(JSON.parse(JSON.stringify(template)))
    expect(error).toBeUndefined()
    expect(read).toEqual(template)
  })
})
