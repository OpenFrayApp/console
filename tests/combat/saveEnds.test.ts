// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import { groupSaveEnds } from '../../src/combat/saveEnds.ts'
import type { Ability } from '../../src/schema/primitives.ts'
import type { Effect } from '../../src/schema/effect.ts'

const saveEnd = (
  name: string,
  ability: Ability,
  dc: number,
  when?: 'startOfTurn' | 'endOfTurn',
): Effect => ({
  id: name,
  name,
  icon: 'condition',
  modifier: null,
  duration: { type: 'saveEnds', save: { ability, dc }, when },
})

describe('groupSaveEnds', () => {
  it('groups effects that share a save (ability + DC + timing)', () => {
    const groups = groupSaveEnds([
      saveEnd('Frightened', 'dex', 15),
      saveEnd('Restrained', 'dex', 15),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({ ability: 'dex', dc: 15, when: 'endOfTurn' })
    expect(groups[0].effects.map((e) => e.name)).toEqual(['Frightened', 'Restrained'])
  })

  it('keeps different saves in separate groups', () => {
    const groups = groupSaveEnds([
      saveEnd('Frightened', 'dex', 15),
      saveEnd('Poisoned', 'con', 15), // different ability
      saveEnd('Stunned', 'dex', 13), // different DC
      saveEnd('Prone', 'dex', 15, 'startOfTurn'), // different timing
    ])
    expect(groups).toHaveLength(4)
  })

  it('ignores effects that are not save-ends', () => {
    const condition: Effect = {
      id: 'c',
      name: 'Grappled',
      icon: 'condition',
      modifier: null,
      duration: { type: 'manual' },
    }
    expect(groupSaveEnds([condition])).toEqual([])
  })

  it('defaults missing timing to end of turn', () => {
    expect(groupSaveEnds([saveEnd('Frightened', 'wis', 12)])[0].when).toBe('endOfTurn')
  })
})
