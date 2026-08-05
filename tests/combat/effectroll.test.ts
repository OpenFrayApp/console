// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import type { Creature } from '../../src/schema/creature.ts'
import type { CombatantStatus, MonsterCombatant } from '../../src/schema/combatant.ts'
import type { Effect } from '../../src/schema/effect.ts'
import type { RandomSource } from '@openfray/dice'
import {
  advantageAgainst,
  condition,
  disadvantageOn,
  flatBonus,
  modifierEffect,
} from '../../src/combat/effects.ts'
import { rollWithEffects } from '../../src/combat/effectroll.ts'
import { exhaustionEffects } from '../../src/combat/exhaustion.ts'

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
    spellUsesSpent: {},
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

  describe('ability-narrowed modifiers', () => {
    /** "Disadvantage on Wisdom checks" — the Intoxication 1 shape. */
    const wisChecks = () =>
      modifierEffect({
        name: 'Intoxication',
        mode: 'disadvantage',
        direction: 'outgoing',
        applies: 'abilityChecks',
        abilities: ['wis'],
      })

    it('fires on a check of a named ability', () => {
      const roller = combatant('r', [wisChecks()])
      const { result, applied } = rollWithEffects('1d20', {
        roller,
        kind: 'check',
        ability: 'wis',
        rand: faceSeq(18, 4),
      })
      expect(result.advantageState).toBe('disadvantage')
      expect(applied).toContainEqual({ source: 'Intoxication', effect: 'disadvantage' })
    })

    it('stays out of a check of any other ability', () => {
      const roller = combatant('r', [wisChecks()])
      const { result, applied } = rollWithEffects('1d20', {
        roller,
        kind: 'check',
        ability: 'str',
        rand: faceSeq(11),
      })
      expect(result.advantageState).toBe('normal')
      expect(applied).toHaveLength(0)
    })

    it('never fires when the roll’s ability is unknown', () => {
      const roller = combatant('r', [wisChecks()])
      const { result } = rollWithEffects('1d20', { roller, kind: 'check', rand: faceSeq(11) })
      expect(result.advantageState).toBe('normal')
    })

    it('never touches an attack roll, whatever the applies says', () => {
      const roller = combatant('r', [
        modifierEffect({
          name: 'Shaky',
          mode: 'disadvantage',
          direction: 'outgoing',
          applies: 'all',
          abilities: ['dex'],
        }),
      ])
      const { result } = rollWithEffects('1d20', {
        roller,
        kind: 'attack',
        rand: faceSeq(11),
      })
      expect(result.advantageState).toBe('normal')
    })

    it('matches saves against its ability list (Disadvantage on Dex and Wis saves)', () => {
      const roller = combatant('r', [
        modifierEffect({
          name: 'Intoxication',
          mode: 'disadvantage',
          direction: 'outgoing',
          applies: 'savingThrows',
          abilities: ['dex', 'wis'],
        }),
      ])
      const dex = rollWithEffects('1d20', {
        roller,
        kind: 'save',
        ability: 'dex',
        rand: faceSeq(18, 4),
      })
      expect(dex.result.advantageState).toBe('disadvantage')
      const con = rollWithEffects('1d20', {
        roller,
        kind: 'save',
        ability: 'con',
        rand: faceSeq(11),
      })
      expect(con.result.advantageState).toBe('normal')
    })

    it('an un-narrowed modifier still applies whether or not the ability is known', () => {
      const roller = combatant('r', [flatBonus('Bless', '1d4', { applies: 'savingThrows' })])
      const known = rollWithEffects('1d20', {
        roller,
        kind: 'save',
        ability: 'con',
        rand: faceSeq(10, 2),
      })
      expect(known.result.total).toBe(12)
      const unknown = rollWithEffects('1d20', {
        roller,
        kind: 'save',
        rand: faceSeq(10, 2),
      })
      expect(unknown.result.total).toBe(12)
    })
  })
})

describe('Exhaustion', () => {
  it('2024: takes 2 per level off every d20 test the creature makes', () => {
    const roller = combatant('r', exhaustionEffects(3, '5.5'))
    for (const kind of ['attack', 'save', 'check'] as const) {
      const out = rollWithEffects('1d20', { roller, kind, rand: faceSeq(15) })
      expect(out.result.total).toBe(9)
      expect(out.applied).toContainEqual({ source: 'Exhaustion 3', effect: '-6' })
    }
  })

  it('2024: never touches a roll made against the creature', () => {
    const out = rollWithEffects('1d20', {
      roller: combatant('r'),
      target: combatant('t', exhaustionEffects(3, '5.5')),
      kind: 'attack',
      rand: faceSeq(15),
    })
    expect(out.result.total).toBe(15)
  })

  it('2014: level 1 is Disadvantage on ability checks and nothing more', () => {
    const roller = combatant('r', exhaustionEffects(1, '5.0'))
    const check = rollWithEffects('1d20', { roller, kind: 'check', rand: faceSeq(15, 4) })
    expect(check.result.advantageState).toBe('disadvantage')
    expect(check.result.total).toBe(4)
    expect(
      rollWithEffects('1d20', { roller, kind: 'attack', rand: faceSeq(15) }).result.advantageState,
    ).toBe('normal')
  })

  it('2014: level 3 reaches attacks and saves too', () => {
    const roller = combatant('r', exhaustionEffects(3, '5.0'))
    for (const kind of ['attack', 'save', 'check'] as const) {
      const out = rollWithEffects('1d20', { roller, kind, rand: faceSeq(15, 4) })
      expect(out.result.advantageState).toBe('disadvantage')
    }
  })

  it('2014: the level lands no flat penalty — that is the 2024 rule', () => {
    const out = rollWithEffects('1d20', {
      roller: combatant('r', exhaustionEffects(5, '5.0')),
      kind: 'save',
      rand: faceSeq(15, 4),
    })
    expect(out.result.total).toBe(4)
  })
})
