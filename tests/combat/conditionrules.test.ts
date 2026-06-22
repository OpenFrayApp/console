// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import { conditionAttackAdvantage, meleeHitAutoCrits } from '../../src/combat/conditionrules.ts'
import type { Combatant } from '../../src/schema/combatant.ts'
import type { CombatantStatus } from '../../src/schema/combatant.ts'
import type { ConditionName, Effect } from '../../src/schema/effect.ts'

const conditionEffect = (name: ConditionName): Effect => ({
  id: name,
  name,
  icon: 'condition',
  modifier: null,
  duration: { type: 'manual' },
})

const pc = (status: CombatantStatus, conditions: ConditionName[] = []): Combatant => ({
  isPC: true,
  combatantId: 'p',
  name: 'Thalia',
  initiative: 10,
  ac: 15,
  passivePerception: 12,
  status,
  hp: { current: status === 'unconscious' ? 0 : 20, max: 20, temp: 0 },
  concentration: null,
  effects: conditions.map(conditionEffect),
})

describe('conditionAttackAdvantage', () => {
  it('makes Prone defenders range-dependent', () => {
    expect(conditionAttackAdvantage('Prone', 'defender', 'melee')).toBe('advantage')
    expect(conditionAttackAdvantage('Prone', 'defender', 'ranged')).toBe('disadvantage')
    expect(conditionAttackAdvantage('Prone', 'defender')).toBe('advantage') // default melee
  })

  it('gives a Prone attacker disadvantage on its own attacks', () => {
    expect(conditionAttackAdvantage('Prone', 'attacker')).toBe('disadvantage')
  })

  it('handles Blinded both ways', () => {
    expect(conditionAttackAdvantage('Blinded', 'defender')).toBe('advantage')
    expect(conditionAttackAdvantage('Blinded', 'attacker')).toBe('disadvantage')
  })

  it('handles Invisible (inverse of most)', () => {
    expect(conditionAttackAdvantage('Invisible', 'defender')).toBe('disadvantage')
    expect(conditionAttackAdvantage('Invisible', 'attacker')).toBe('advantage')
  })

  it('grants advantage against Restrained/Stunned/Paralyzed/Petrified targets', () => {
    for (const c of ['Restrained', 'Stunned', 'Paralyzed', 'Petrified'] as const) {
      expect(conditionAttackAdvantage(c, 'defender')).toBe('advantage')
    }
  })

  it('returns null for conditions without attack-roll consequences', () => {
    expect(conditionAttackAdvantage('Charmed', 'defender')).toBeNull()
    expect(conditionAttackAdvantage('Grappled', 'attacker')).toBeNull()
    expect(conditionAttackAdvantage('Deafened', 'defender')).toBeNull()
  })
})

describe('meleeHitAutoCrits', () => {
  it('is true for a downed (Unconscious) creature', () => {
    expect(meleeHitAutoCrits(pc('unconscious'))).toBe(true)
  })

  it('is true for a Paralyzed creature (even while conscious)', () => {
    expect(meleeHitAutoCrits(pc('active', ['Paralyzed']))).toBe(true)
  })

  it('is false for other conditions and a healthy creature', () => {
    expect(meleeHitAutoCrits(pc('active'))).toBe(false)
    expect(meleeHitAutoCrits(pc('active', ['Prone', 'Restrained', 'Stunned']))).toBe(false)
  })
})
