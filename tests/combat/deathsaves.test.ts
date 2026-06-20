// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import type { PlayerCharacter } from '../../src/schema/combatant.ts'
import type { RandomSource } from '../../src/dice/rng.ts'
import {
  isStable,
  markDeathSaveFailure,
  markDeathSaveSuccess,
  reviveAtOneHp,
  rollDeathSave,
  stabilize,
} from '../../src/combat/deathsaves.ts'

function faceSeq(...faces: number[]): RandomSource {
  let i = 0
  return () => {
    if (i >= faces.length) throw new Error('faceSeq exhausted')
    return faces[i++] - 1
  }
}

function downedPc(overrides: Partial<PlayerCharacter> = {}): PlayerCharacter {
  return {
    isPC: true,
    combatantId: 'p',
    name: 'Thalia',
    initiative: 18,
    ac: 16,
    passivePerception: 14,
    status: 'down',
    hp: { current: 0, max: 30, temp: 0 },
    concentration: null,
    effects: [],
    deathSaves: { successes: 0, failures: 0 },
    ...overrides,
  }
}

describe('manual death-save results', () => {
  it('tallies successes and stabilizes at three', () => {
    let pc = downedPc()
    pc = markDeathSaveSuccess(markDeathSaveSuccess(pc))
    expect(pc.deathSaves).toEqual({ successes: 2, failures: 0 })
    expect(isStable(pc)).toBe(false)
    pc = markDeathSaveSuccess(pc)
    expect(isStable(pc)).toBe(true)
    expect(pc.status).toBe('down')
  })

  it('dies at three failures', () => {
    const pc = markDeathSaveFailure(downedPc({ deathSaves: { successes: 0, failures: 2 } }))
    expect(pc.deathSaves).toEqual({ successes: 0, failures: 3 })
    expect(pc.status).toBe('dead')
  })

  it('stabilize() sets three successes without killing', () => {
    const pc = stabilize(downedPc({ deathSaves: { successes: 0, failures: 2 } }))
    expect(isStable(pc)).toBe(true)
    expect(pc.status).toBe('down')
  })

  it('reviveAtOneHp wakes the PC and clears the tally', () => {
    const pc = reviveAtOneHp(downedPc({ deathSaves: { successes: 1, failures: 2 } }))
    expect(pc.hp.current).toBe(1)
    expect(pc.status).toBe('active')
    expect(pc.deathSaves).toEqual({ successes: 0, failures: 0 })
  })
})

describe('rollDeathSave (optional in-app roll)', () => {
  it('counts a 10+ as a success', () => {
    const { pc, outcome } = rollDeathSave(downedPc(), { rand: faceSeq(12) })
    expect(outcome).toBe('success')
    expect(pc.deathSaves).toEqual({ successes: 1, failures: 0 })
  })

  it('counts a 9- as a failure', () => {
    const { pc, outcome } = rollDeathSave(downedPc(), { rand: faceSeq(7) })
    expect(outcome).toBe('failure')
    expect(pc.deathSaves).toEqual({ successes: 0, failures: 1 })
  })

  it('revives on a natural 20', () => {
    const { pc, outcome } = rollDeathSave(downedPc(), { rand: faceSeq(20) })
    expect(outcome).toBe('critical-success')
    expect(pc.status).toBe('active')
    expect(pc.hp.current).toBe(1)
  })

  it('adds two failures on a natural 1', () => {
    const { pc, outcome } = rollDeathSave(downedPc(), { rand: faceSeq(1) })
    expect(outcome).toBe('critical-failure')
    expect(pc.deathSaves).toEqual({ successes: 0, failures: 2 })
  })
})
