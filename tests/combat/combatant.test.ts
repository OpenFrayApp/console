// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import type { Combatant } from '../../src/schema/combatant.ts'
import { autoLabel, isAutoLabel, isFoe } from '../../src/combat/combatant.ts'

const pc = (over: Partial<Extract<Combatant, { isPC: true }>> = {}): Combatant =>
  ({
    isPC: true,
    kind: 'pc',
    combatantId: 'c',
    name: 'Hero',
    ac: 16,
    initiative: 0,
    status: 'active',
    hp: { current: 20, max: 20, temp: 0 },
    concentration: null,
    effects: [],
    ...over,
  }) as Combatant

const monster = (): Combatant =>
  ({
    isPC: false,
    combatantId: 'm',
    creatureId: 'srd:goblin',
    creature: { id: 'srd:goblin' },
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
  }) as unknown as Combatant

describe('isFoe', () => {
  it('treats every monster as a foe', () => {
    expect(isFoe(monster())).toBe(true)
  })

  it('treats a plain PC as a friend', () => {
    expect(isFoe(pc())).toBe(false)
  })

  it('honours an explicit side on a quick add', () => {
    expect(isFoe(pc({ kind: 'quick', side: 'foe' }))).toBe(true)
    expect(isFoe(pc({ kind: 'quick', side: 'friend' }))).toBe(false)
  })

  it('defaults a side-less lightweight combatant to friend', () => {
    expect(isFoe(pc({ kind: 'quick' }))).toBe(false)
  })
})

describe('labels', () => {
  it('numbers copies after the first', () => {
    expect(autoLabel('Ghoul', 0)).toBe('Ghoul')
    expect(autoLabel('Ghoul', 1)).toBe('Ghoul 2')
    expect(autoLabel('Ghoul', 4)).toBe('Ghoul 5')
  })

  it('recognises auto-numbering so a duplicate is not read as a rename', () => {
    expect(isAutoLabel('Ghoul', 'Ghoul')).toBe(true)
    expect(isAutoLabel('Ghoul 2', 'Ghoul')).toBe(true)
    expect(isAutoLabel('Ghoul 12', 'Ghoul')).toBe(true)
  })

  it('treats a GM rename as a rename', () => {
    expect(isAutoLabel('Snik', 'Goblin')).toBe(false)
    expect(isAutoLabel('Ghoul the Second', 'Ghoul')).toBe(false)
    expect(isAutoLabel('Ghoul 2 (boss)', 'Ghoul')).toBe(false)
  })

  it('is not fooled by regex characters in a creature name', () => {
    expect(isAutoLabel('Bo.gle 2', 'Bo.gle')).toBe(true)
    expect(isAutoLabel('BoXgle 2', 'Bo.gle')).toBe(false)
  })
})
