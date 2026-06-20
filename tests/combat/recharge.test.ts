// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import type { Creature } from '../../src/schema/creature.ts'
import type { Action } from '../../src/schema/action.ts'
import { isRechargeable, rechargeActions, rollRecharge } from '../../src/combat/recharge.ts'

const breath: Action = {
  id: 'fire-breath',
  name: 'Fire Breath',
  kind: 'save',
  toHit: null,
  save: { ability: 'dex', dc: 18, onSave: 'half' },
  damage: [{ formula: '10d8', type: 'fire' }],
  recharge: { type: 'dice', value: 5 },
}
const bite: Action = { id: 'bite', name: 'Bite', kind: 'melee', toHit: 7 }

function creature(): Creature {
  return {
    id: 'srd:dragon',
    source: 'srd-5.2',
    name: 'Dragon',
    size: 'Large',
    type: 'dragon',
    ac: 18,
    maxHp: 100,
    speed: { walk: 40 },
    abilities: { str: 20, dex: 10, con: 18, int: 14, wis: 12, cha: 16 },
    senses: { passivePerception: 16 },
    actions: [bite, breath],
    legendaryActions: { perRound: 3, actions: [{ id: 'tail', name: 'Tail', kind: 'melee', toHit: 7, recharge: { type: 'dice', value: 6 } }] },
  }
}

describe('rechargeActions', () => {
  it('collects dice-recharge actions across every category', () => {
    const ids = rechargeActions(creature()).map((a) => a.id)
    expect(ids).toEqual(['fire-breath', 'tail'])
  })

  it('isRechargeable is true only for a dice recharge', () => {
    expect(isRechargeable(breath)).toBe(true)
    expect(isRechargeable(bite)).toBe(false)
  })
})

describe('rollRecharge', () => {
  // A RandomSource returning v-1 yields a d6 face of v.
  it('recharges on a roll at or above the threshold', () => {
    expect(rollRecharge(breath, { rand: () => 4 }).recharged).toBe(true) // d6 = 5, ≥ 5
    expect(rollRecharge(breath, { rand: () => 5 }).recharged).toBe(true) // d6 = 6
  })

  it('does not recharge below the threshold', () => {
    expect(rollRecharge(breath, { rand: () => 3 }).recharged).toBe(false) // d6 = 4, < 5
  })

  it('logs the actual d6 roll', () => {
    const { roll } = rollRecharge(breath, { rand: () => 2 }) // d6 = 3
    expect(roll.total).toBe(3)
  })
})
