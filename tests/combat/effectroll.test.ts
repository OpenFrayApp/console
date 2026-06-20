// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import type { Creature } from '../../src/schema/creature.ts'
import type {
  CombatantStatus,
  MonsterCombatant,
} from '../../src/schema/combatant.ts'
import type { Effect } from '../../src/schema/effect.ts'
import type { RandomSource } from '../../src/dice/rng.ts'
import {
  advantageAgainst,
  condition,
  disadvantageOn,
  flatBonus,
} from '../../src/combat/effects.ts'
import { rollWithEffects } from '../../src/combat/effectroll.ts'

function faceSeq(...faces: number[]): RandomSource {
  let i = 0
  return () => {
    if (i >= faces.length) throw new Error('faceSeq exhausted')
    return faces[i++] - 1
  }
}

function creature(): Creature {
  return {
    id: 'srd:goblin',
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
}

function combatant(
  id: string,
  effects: Effect[] = [],
  status: CombatantStatus = 'active',
): MonsterCombatant {
  return {
    isPC: false,
    combatantId: id,
    creatureId: 'srd:goblin',
    creature: creature(),
    label: id,
    initiative: 10,
    status,
    hp: { current: 7, max: 7, temp: 0 },
    slotsUsed: {},
    limitedUseState: {},
    legendaryRemaining: 0,
    concentration: null,
    effects,
    visibility: { name: 'shown', hp: 'bloodied', conditions: 'shown', ac: 'hidden' },
  }
}

describe('rollWithEffects', () => {
  it("rolls disadvantage from the roller's outgoing effect (Vicious Mockery)", () => {
    const roller = combatant('r', [disadvantageOn('Vicious Mockery')])
    const { result, applied } = rollWithEffects('1d20+5', {
      roller,
      kind: 'attack',
      rand: faceSeq(18, 4),
    })
    expect(result.advantageState).toBe('disadvantage')
    expect(result.dice[0].kept).toEqual([4])
    expect(applied).toContainEqual({ source: 'Vicious Mockery', effect: 'disadvantage' })
  })

  it("rolls advantage from the target's incoming effect (Reckless Attack)", () => {
    const target = combatant('t', [advantageAgainst('Reckless Attack')])
    const { result } = rollWithEffects('1d20+5', {
      target,
      kind: 'attack',
      rand: faceSeq(4, 18),
    })
    expect(result.advantageState).toBe('advantage')
    expect(result.dice[0].kept).toEqual([18])
  })

  it('cancels one advantage against one disadvantage to a straight roll', () => {
    const roller = combatant('r', [disadvantageOn('Vicious Mockery')])
    const target = combatant('t', [advantageAgainst('Reckless Attack')])
    const { result, applied } = rollWithEffects('1d20+5', {
      roller,
      target,
      kind: 'attack',
      rand: faceSeq(11),
    })
    expect(result.advantageState).toBe('normal')
    expect(result.dice[0].results).toHaveLength(1)
    expect(applied).toHaveLength(2)
  })

  it('folds in a flat bonus (Bless) and reports it', () => {
    const roller = combatant('r', [flatBonus('Bless', '1d4')])
    const { result, applied } = rollWithEffects('1d20+5', {
      roller,
      kind: 'attack',
      rand: faceSeq(10, 3),
    })
    expect(result.total).toBe(18) // 10 + 5 + 3
    expect(applied).toContainEqual({ source: 'Bless', effect: '1d4' })
  })

  it('grants advantage when attacking an Unconscious target', () => {
    const target = combatant('t', [], 'unconscious')
    const { result, applied } = rollWithEffects('1d20+5', {
      target,
      kind: 'attack',
      rand: faceSeq(4, 18),
    })
    expect(result.advantageState).toBe('advantage')
    expect(applied).toContainEqual({ source: 'Unconscious', effect: 'advantage' })
  })

  it('consumes consumeOnRoll effects but keeps longer-lived ones', () => {
    const roller = combatant('r', [disadvantageOn('Vicious Mockery')]) // consumeOnRoll
    const target = combatant('t', [advantageAgainst('Reckless Attack')]) // untilSourceTurn
    const out = rollWithEffects('1d20', { roller, target, kind: 'attack', rand: faceSeq(10) })
    expect(out.roller?.effects).toHaveLength(0)
    expect(out.target?.effects).toHaveLength(1)
  })

  it('does not apply attack/save effects to damage rolls', () => {
    const roller = combatant('r', [flatBonus('Bless', '1d4')])
    const { result, applied } = rollWithEffects('2d6+3', {
      roller,
      kind: 'damage',
      rand: faceSeq(2, 2),
    })
    expect(result.total).toBe(7) // no Bless on damage
    expect(applied).toHaveLength(0)
  })

  it('applies a flat bonus to a saving throw', () => {
    const roller = combatant('r', [flatBonus('Bless', '1d4')])
    const { result } = rollWithEffects('1d20+1', {
      roller,
      kind: 'save',
      rand: faceSeq(10, 2),
    })
    expect(result.total).toBe(13) // 10 + 1 + 2
  })

  it('gives a melee attacker advantage against a Prone target', () => {
    const target = combatant('t', [condition('Prone')])
    const { result, applied } = rollWithEffects('1d20+5', {
      target,
      kind: 'attack',
      range: 'melee',
      rand: faceSeq(4, 18),
    })
    expect(result.advantageState).toBe('advantage')
    expect(applied).toContainEqual({ source: 'Prone', effect: 'advantage' })
  })

  it('gives a ranged attacker disadvantage against a Prone target', () => {
    const target = combatant('t', [condition('Prone')])
    const { result } = rollWithEffects('1d20+5', {
      target,
      kind: 'attack',
      range: 'ranged',
      rand: faceSeq(18, 4),
    })
    expect(result.advantageState).toBe('disadvantage')
    expect(result.dice[0].kept).toEqual([4])
  })

  it('defaults a Prone target to melee (advantage) when range is unspecified', () => {
    const target = combatant('t', [condition('Prone')])
    const r = rollWithEffects('1d20', { target, kind: 'attack', rand: faceSeq(4, 18) })
    expect(r.result.advantageState).toBe('advantage')
  })

  it('gives a Prone attacker disadvantage on its own attack', () => {
    const roller = combatant('r', [condition('Prone')])
    const { result } = rollWithEffects('1d20+5', {
      roller,
      kind: 'attack',
      rand: faceSeq(18, 4),
    })
    expect(result.advantageState).toBe('disadvantage')
  })

  it('cancels Prone-melee advantage against the attacker’s disadvantage', () => {
    const roller = combatant('r', [disadvantageOn('Vicious Mockery')])
    const target = combatant('t', [condition('Prone')])
    const { result } = rollWithEffects('1d20', {
      roller,
      target,
      kind: 'attack',
      range: 'melee',
      rand: faceSeq(11),
    })
    expect(result.advantageState).toBe('normal')
  })
})
