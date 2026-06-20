// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { Creature } from '../../src/schema/creature.ts'
import type { MonsterCombatant, PlayerCharacter } from '../../src/schema/combatant.ts'
import { CombatantControls } from '../../src/components/CombatantControls.tsx'

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

function monster(): MonsterCombatant {
  return {
    isPC: false,
    combatantId: 'm',
    creatureId: 'srd:goblin',
    creature: creature(),
    label: 'Goblin',
    initiative: 12,
    status: 'active',
    hp: { current: 7, max: 7, temp: 0 },
    slotsUsed: {},
    limitedUseState: {},
    legendaryRemaining: 0,
    concentration: null,
    effects: [],
    visibility: { name: 'shown', hp: 'bloodied', conditions: 'shown', ac: 'hidden' },
  }
}

function downedPc(over: Partial<PlayerCharacter> = {}): PlayerCharacter {
  return {
    isPC: true,
    combatantId: 'p',
    name: 'Thalia',
    initiative: 18,
    ac: 16,
    passivePerception: 14,
    status: 'unconscious',
    hp: { current: 0, max: 30, temp: 0 },
    concentration: null,
    effects: [],
    deathSaves: { successes: 0, failures: 0 },
    ...over,
  }
}

afterEach(cleanup)

describe('CombatantControls', () => {
  it('dispatches a remove', () => {
    const dispatch = vi.fn()
    render(<CombatantControls combatant={monster()} round={1} dispatch={dispatch} onRoll={() => {}} />)
    fireEvent.click(screen.getByText('Remove'))
    expect(dispatch).toHaveBeenCalledWith({ type: 'remove', id: 'm' })
  })

  it('shows death-save controls for an unconscious PC, hidden once stable', () => {
    const dispatch = vi.fn()
    const { rerender } = render(
      <CombatantControls combatant={downedPc()} round={1} dispatch={dispatch} onRoll={() => {}} />,
    )
    expect(screen.getByText('Roll death save')).toBeInTheDocument()

    rerender(
      <CombatantControls
        combatant={downedPc({ deathSaves: { successes: 3, failures: 0 } })}
        round={1}
        dispatch={dispatch}
        onRoll={() => {}}
      />,
    )
    expect(screen.queryByText('Roll death save')).toBeNull()
  })

  it('marks a combatant as concentrating', () => {
    const dispatch = vi.fn()
    render(<CombatantControls combatant={monster()} round={3} dispatch={dispatch} onRoll={() => {}} />)
    fireEvent.click(screen.getByText('Concentrate'))
    fireEvent.change(screen.getByLabelText(/Concentration spell/), {
      target: { value: 'Hold Person' },
    })
    fireEvent.click(screen.getByText('Set'))

    const call = dispatch.mock.calls.map((c) => c[0]).find((a) => a.type === 'update')
    const updated = call?.update(monster())
    expect(updated?.concentration).toEqual({ spell: 'Hold Person', saveDc: 0, round: 3 })
  })
})
