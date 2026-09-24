// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { describe, expect, it } from 'vitest'
import { instantiate, isAutoLabel, nameOf } from '../../src/combat/combatant.ts'
import { creatureSuffix, type CreatureLabelStyle } from '../../src/combat/creatureLabels.ts'
import { templateEntries, templateToCombatants } from '../../src/combat/encounterTemplate.ts'
import { emptyEncounter, encounterReducer } from '../../src/state/encounter.ts'
import type { Creature } from '../../src/schema/creature.ts'
import type { Encounter } from '../../src/schema/encounter.ts'

const creature: Creature = {
  id: 'srd-5.2:goblin',
  source: 'srd-5.2',
  name: 'Goblin',
  size: 'Small',
  type: 'humanoid',
  ac: 15,
  maxHp: 7,
  speed: { walk: 30 },
  abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
  senses: { passivePerception: 9 },
}

/** Add an eligible template copy through the same reducer action as the picker. */
function add(
  state: Encounter,
  id: string,
  style: CreatureLabelStyle = 'numeric',
  label = 'Goblin',
): Encounter {
  return encounterReducer(state, {
    type: 'add',
    labelStyle: style,
    combatant: instantiate(creature, { combatantId: id, initiative: 0, label }),
  })
}

/** Read board labels in addition order without depending on initiative sorting. */
function names(state: Encounter): string[] {
  return [...state.combatants]
    .sort((a, b) => a.combatantId.localeCompare(b.combatantId))
    .map(nameOf)
}

describe('creature labels', () => {
  it.each([
    ['numeric', '1', '2'],
    ['roman', 'I', 'II'],
    ['letters', 'A', 'B'],
  ] as const)('labels the first copy only when a second arrives (%s)', (style, first, second) => {
    const one = add(emptyEncounter(), 'a', style)
    expect(names(one)).toEqual(['Goblin'])
    const two = add(one, 'b', style)
    expect(names(two)).toEqual([`Goblin ${first}`, `Goblin ${second}`])
    expect(names(one)).toEqual(['Goblin'])
    expect(names(encounterReducer(two, { type: 'remove', id: 'b' }))).toEqual([`Goblin ${first}`])
  })

  it('keeps gaps and allocates above surviving ordinals after removal and reload', () => {
    let state = add(add(add(emptyEncounter(), 'a'), 'b'), 'c')
    state = encounterReducer(state, { type: 'remove', id: 'b' })
    state = add(JSON.parse(JSON.stringify(state)), 'd')
    expect(names(state)).toEqual(['Goblin 1', 'Goblin 3', 'Goblin 4'])
  })

  it('keeps old labels when styles change and remembers ambiguous Roman ordinals', () => {
    let state = add(add(emptyEncounter(), 'a', 'roman'), 'b', 'roman')
    state = encounterReducer(state, { type: 'remove', id: 'b' })
    state = add(state, 'c', 'letters')
    state = add(state, 'd', 'numeric')
    expect(names(state)).toEqual(['Goblin I', 'Goblin B', 'Goblin 3'])
  })

  it('keeps manually assigned names and their original creature identity', () => {
    let state = add(add(emptyEncounter(), 'a', 'letters'), 'b', 'letters')
    state = encounterReducer(state, {
      type: 'update',
      id: 'a',
      update: (c) => ({ ...c, label: 'Goblin Chief' }),
    })
    state = add(state, 'c', 'roman')
    expect(names(state)).toEqual(['Goblin Chief', 'Goblin B', 'Goblin III'])
    expect(templateEntries(state.combatants)[0].labels).toEqual(['Goblin Chief'])
    const labeled = state.combatants.find((c) => c.combatantId === 'b')!
    if (labeled.isPC) throw new Error('Expected a creature')
    expect(isAutoLabel(labeled.label, creature.name, labeled.autoLabel)).toBe(true)
    expect(isAutoLabel('Goblin Chief', creature.name, labeled.autoLabel)).toBe(false)
  })

  it('does not interpret a manually typed letter suffix as generated', () => {
    const state = add(add(emptyEncounter(), 'a', 'letters', 'Goblin Z'), 'b', 'letters')
    expect(names(state)).toEqual(['Goblin Z', 'Goblin B'])
    expect(templateEntries(state.combatants)[0].labels).toEqual(['Goblin Z'])
  })

  it('keeps explicitly typed numeric names when loading a saved cast', () => {
    const { combatants } = templateToCombatants(
      {
        v: 1,
        name: 'Named',
        entries: [{ ref: creature.id, count: 2, side: 'foe', labels: ['Goblin 2'] }],
      },
      { creatures: [creature], hpMethod: 'average' },
    )
    expect(combatants.map(nameOf)).toEqual(['Goblin 2', 'Goblin 3'])
    expect(templateEntries(combatants)[0].labels).toEqual(['Goblin 2'])
  })

  it('preserves a typed numeric name on a previously unlabeled creature', () => {
    let state = add(emptyEncounter(), 'a')
    state = encounterReducer(state, {
      type: 'update',
      id: 'a',
      update: (c) => (c.isPC ? c : { ...c, label: 'Goblin 9', autoLabel: c.autoLabel ?? null }),
    })
    state = add(state, 'b')
    expect(names(state)).toEqual(['Goblin 9', 'Goblin 2'])
    expect(templateEntries(state.combatants)[0].labels).toEqual(['Goblin 9'])
  })

  it('reserves a manually typed suffix before labeling the first copy', () => {
    const state = add(add(emptyEncounter(), 'a', 'letters'), 'b', 'letters', 'Goblin A')
    expect(names(state)).toEqual(['Goblin B', 'Goblin A'])
    expect(names(add(state, 'c', 'letters'))).toEqual(['Goblin B', 'Goblin A', 'Goblin C'])
  })

  it('migrates legacy numeric labels and preserves the active creature', () => {
    let state = emptyEncounter()
    for (const [id, label] of [
      ['a', 'Goblin'],
      ['b', 'Goblin 4'],
    ]) {
      state = encounterReducer(state, {
        type: 'add',
        combatant: instantiate(creature, { combatantId: id, label, initiative: 10 }),
      })
    }
    const active = state.combatants[state.activeIndex].combatantId
    state = add(state, 'c', 'letters')
    expect(names(state)).toEqual(['Goblin A', 'Goblin 4', 'Goblin E'])
    expect(state.combatants[state.activeIndex].combatantId).toBe(active)
  })

  it('leaves ineligible additions and different template ids alone', () => {
    let state = add(emptyEncounter(), 'a')
    state = encounterReducer(state, {
      type: 'add',
      combatant: instantiate(creature, { combatantId: 'b', label: 'Goblin', initiative: 0 }),
    })
    expect(names(state)).toEqual(['Goblin', 'Goblin'])
    const other = instantiate(
      { ...creature, id: 'custom:goblin' },
      { combatantId: 'c', label: 'Goblin', initiative: 0 },
    )
    state = encounterReducer(state, { type: 'add', combatant: other, labelStyle: 'numeric' })
    expect(names(state)).toEqual(['Goblin', 'Goblin', 'Goblin'])
  })

  it('formats letter rollover and subtractive Roman numerals', () => {
    expect([26, 27, 52, 53, 702, 703].map((n) => creatureSuffix(n, 'letters'))).toEqual([
      'Z',
      'AA',
      'AZ',
      'BA',
      'ZZ',
      'AAA',
    ])
    expect([4, 9, 40, 49, 90, 400, 944].map((n) => creatureSuffix(n, 'roman'))).toEqual([
      'IV',
      'IX',
      'XL',
      'XLIX',
      'XC',
      'CD',
      'CMXLIV',
    ])
  })

  it.each(['numeric', 'roman', 'letters'] as const)(
    'labels template batches and existing first copies (%s)',
    (style) => {
      const before = add(emptyEncounter(), 'a', style)
      const { combatants } = templateToCombatants(
        { v: 1, name: 'More', entries: [{ ref: creature.id, count: 2, side: 'foe' }] },
        {
          creatures: [creature],
          hpMethod: 'average',
          labelStyle: style,
          existing: before.combatants,
        },
      )
      let state = before
      for (const c of combatants)
        state = encounterReducer(state, { type: 'add', combatant: c, labelStyle: style })
      expect(state.combatants.map(nameOf).sort()).toEqual(
        [1, 2, 3].map((n) => `Goblin ${creatureSuffix(n, style)}`).sort(),
      )
      expect(names(before)).toEqual(['Goblin'])
      expect(templateEntries(state.combatants)[0].labels).toBeUndefined()
    },
  )
})
