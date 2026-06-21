// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { InitiativePrompt } from '../../src/components/InitiativePrompt.tsx'
import type { Combatant, MonsterCombatant, PlayerCharacter } from '../../src/schema/combatant.ts'

afterEach(cleanup)

function pc(id: string, name: string): PlayerCharacter {
  return {
    isPC: true,
    combatantId: id,
    name,
    initiative: 0,
    ac: 15,
    passivePerception: 12,
    status: 'active',
    hp: { current: 20, max: 20, temp: 0 },
    concentration: null,
    effects: [],
  }
}

function monster(id: string, label: string): MonsterCombatant {
  return {
    isPC: false,
    combatantId: id,
    creatureId: 'srd:goblin',
    creature: {
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
    },
    label,
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
  }
}

const combatants: Combatant[] = [pc('p1', 'Thalia'), monster('m1', 'Goblin A')]
const initial = { p1: '', m1: '14' }

describe('InitiativePrompt', () => {
  it('lists every combatant with its pre-filled initiative', () => {
    render(<InitiativePrompt combatants={combatants} initial={initial} onStart={() => {}} onCancel={() => {}} />)
    expect(screen.getByText('Thalia')).toBeInTheDocument()
    expect(screen.getByText('Goblin A')).toBeInTheDocument()
    expect((screen.getByLabelText('Initiative for Thalia') as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText('Initiative for Goblin A') as HTMLInputElement).value).toBe('14')
  })

  it('returns entered values and the surprised set on start', () => {
    const onStart = vi.fn()
    render(<InitiativePrompt combatants={combatants} initial={initial} onStart={onStart} onCancel={() => {}} />)

    fireEvent.change(screen.getByLabelText('Initiative for Thalia'), { target: { value: '17' } })
    fireEvent.click(screen.getByRole('button', { name: 'Mark Goblin A surprised' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start combat' }))

    expect(onStart).toHaveBeenCalledTimes(1)
    expect(onStart.mock.calls[0][0]).toEqual({
      values: { p1: '17', m1: '14' },
      surprised: ['m1'],
    })
  })

  it('toggles a surprise mark off again', () => {
    const onStart = vi.fn()
    render(<InitiativePrompt combatants={combatants} initial={initial} onStart={onStart} onCancel={() => {}} />)
    const toggle = screen.getByRole('button', { name: 'Mark Goblin A surprised' })
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'Start combat' }))
    expect(onStart.mock.calls[0][0].surprised).toEqual([])
  })
})
