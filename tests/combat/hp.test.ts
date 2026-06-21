// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import type { Creature } from '../../src/schema/creature.ts'
import { resolveMaxHp } from '../../src/combat/hp.ts'

function creature(maxHp: number, hpFormula?: string): Creature {
  return {
    id: 'srd:goblin',
    source: 'srd-5.2',
    name: 'Goblin',
    size: 'Small',
    type: 'humanoid',
    ac: 15,
    maxHp,
    hpFormula,
    speed: { walk: 30 },
    abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
    senses: { passivePerception: 9 },
  }
}

describe('resolveMaxHp', () => {
  // 4d8+4: min 4*1+4 = 8, max 4*8+4 = 36, printed average 22.
  const c = creature(22, '4d8+4')

  it('average uses the printed maxHp', () => {
    expect(resolveMaxHp(c, 'average')).toBe(22)
  })

  it('min is all 1s plus the modifier', () => {
    expect(resolveMaxHp(c, 'min')).toBe(8)
  })

  it('max is all max faces plus the modifier', () => {
    expect(resolveMaxHp(c, 'max')).toBe(36)
  })

  it('roll lands within [min, max]', () => {
    for (let i = 0; i < 50; i++) {
      const hp = resolveMaxHp(c, 'roll')
      expect(hp).toBeGreaterThanOrEqual(8)
      expect(hp).toBeLessThanOrEqual(36)
    }
  })

  it('falls back to the printed average when there is no formula', () => {
    const noFormula = creature(15)
    expect(resolveMaxHp(noFormula, 'min')).toBe(15)
    expect(resolveMaxHp(noFormula, 'max')).toBe(15)
    expect(resolveMaxHp(noFormula, 'roll')).toBe(15)
  })

  it('never returns below 1', () => {
    const tiny = creature(1, '1d4-10')
    expect(resolveMaxHp(tiny, 'min')).toBe(1)
  })
})
