// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import { conditionAttackAdvantage } from '../../src/combat/conditionrules.ts'

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
