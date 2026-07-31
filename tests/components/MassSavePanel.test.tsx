// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { Creature } from '../../src/schema/creature.ts'
import type { MonsterCombatant } from '../../src/schema/combatant.ts'
import { applySaveDamage } from '../../src/combat/masssave.ts'
import { MassSavePanel } from '../../src/components/MassSavePanel.tsx'

function creature(over: Partial<Creature> = {}): Creature {
  return {
    id: 'srd:goblin',
    source: 'srd-5.2',
    name: 'Goblin',
    size: 'Small',
    type: 'humanoid',
    ac: 15,
    maxHp: 30,
    speed: { walk: 30 },
    abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
    senses: { passivePerception: 9 },
    ...over,
  }
}

function monster(id: string, cr?: Creature): MonsterCombatant {
  return {
    isPC: false,
    combatantId: id,
    creatureId: 'srd:goblin',
    creature: cr ?? creature(),
    label: id,
    initiative: 12,
    status: 'active',
    hp: { current: 30, max: 30, temp: 0 },
    slotsUsed: {},
    spellUsesSpent: {},
    limitedUseState: {},
    legendaryRemaining: 0,
    concentration: null,
    effects: [],
    visibility: { name: 'shown', hp: 'bloodied', conditions: 'shown', ac: 'hidden' },
  }
}

afterEach(cleanup)

describe('MassSavePanel', () => {
  it('rolls saves for selected monsters and applies split damage', () => {
    const dispatch = vi.fn()
    render(
      <MassSavePanel
        combatants={[monster('a'), monster('b')]}
        dispatch={dispatch}
        onRoll={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByText('Group save'))
    fireEvent.click(screen.getByRole('button', { name: 'a' })) // target chip
    fireEvent.change(screen.getByLabelText('Damage'), { target: { value: '24' } })
    fireEvent.click(screen.getByText('Roll saves'))

    // Monster 'a' got a Save/Fail result; force it to Fail for a deterministic apply.
    fireEvent.click(screen.getByText('Fail'))
    fireEvent.click(screen.getByText('Apply damage'))

    const call = dispatch.mock.calls.find((c) => c[0].type === 'update' && c[0].id === 'a')
    expect(call).toBeTruthy()
    // a failure takes full damage (30 - 24 = 6)
    expect(call?.[0].update(monster('a')).hp.current).toBe(6)
    // 'b' was not selected, so no update for it
    expect(dispatch.mock.calls.some((c) => c[0].id === 'b')).toBe(false)
  })

  it('applies the target’s defenses once the GM names a damage type', () => {
    const dispatch = vi.fn()
    const hellHound = monster('a', creature({ name: 'Hell Hound', immunities: ['Fire'] }))
    render(<MassSavePanel combatants={[hellHound]} dispatch={dispatch} onRoll={vi.fn()} />)

    fireEvent.click(screen.getByText('Group save'))
    fireEvent.click(screen.getByRole('button', { name: 'a' }))
    fireEvent.change(screen.getByLabelText('Damage'), { target: { value: '15' } })
    fireEvent.change(screen.getByLabelText('Damage type'), { target: { value: 'fire' } })
    fireEvent.click(screen.getByText('Roll saves'))
    fireEvent.click(screen.getByText('Fail'))

    expect(screen.getByText('immune')).toBeInTheDocument()
    expect(screen.getByLabelText('Damage to a')).toHaveValue('0')

    fireEvent.click(screen.getByText('Apply damage'))
    const call = dispatch.mock.calls.find((c) => c[0].type === 'update' && c[0].id === 'a')
    expect(call?.[0].update(hellHound).hp.current).toBe(30)
  })

  it('leaves untyped damage alone, defenses or not', () => {
    const dispatch = vi.fn()
    const hellHound = monster('a', creature({ name: 'Hell Hound', immunities: ['Fire'] }))
    render(<MassSavePanel combatants={[hellHound]} dispatch={dispatch} onRoll={vi.fn()} />)

    fireEvent.click(screen.getByText('Group save'))
    fireEvent.click(screen.getByRole('button', { name: 'a' }))
    fireEvent.change(screen.getByLabelText('Damage'), { target: { value: '15' } })
    fireEvent.click(screen.getByText('Roll saves'))
    fireEvent.click(screen.getByText('Fail'))

    expect(screen.getByLabelText('Damage to a')).toHaveValue('15')
  })

  it('half damage on a save (sanity on the helper)', () => {
    expect(applySaveDamage(monster('a'), 24, 'save', 'half').hp.current).toBe(18)
  })

  it('prompts surviving concentrators after applying damage', () => {
    const dispatch = vi.fn()
    const conc = (): MonsterCombatant => ({
      ...monster('a'),
      concentration: { spell: 'Hold Person', saveDc: 13, round: 1 },
    })
    render(<MassSavePanel combatants={[conc()]} dispatch={dispatch} onRoll={vi.fn()} />)

    fireEvent.click(screen.getByText('Group save'))
    fireEvent.click(screen.getByRole('button', { name: 'a' }))
    fireEvent.change(screen.getByLabelText('Damage'), { target: { value: '24' } })
    fireEvent.click(screen.getByText('Roll saves'))
    fireEvent.click(screen.getByText('Fail'))
    fireEvent.click(screen.getByText('Apply damage'))

    expect(screen.getByText('Concentration checks')).toBeInTheDocument()
    expect(screen.getByText('Concentration — DC 12')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Broken'))
    // Ending concentration is board-wide (it also clears the effects it sustained),
    // so it dispatches its own action rather than an update to the caster's row.
    const breakCall = dispatch.mock.calls
      .map((c) => c[0])
      .find((a) => a.type === 'endConcentration' && a.id === 'a')
    expect(breakCall).toBeTruthy()
  })
})
