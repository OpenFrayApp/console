// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { Creature } from '../../src/schema/creature.ts'
import type { MonsterCombatant, PlayerCharacter } from '../../src/schema/combatant.ts'
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

/** A lightweight PC — no abilities, so the app never rolls for them. */
function pc(id: string, name: string): PlayerCharacter {
  return {
    isPC: true,
    kind: 'pc',
    combatantId: id,
    name,
    initiative: 18,
    ac: 16,
    status: 'active',
    hp: { current: 30, max: 30, temp: 0 },
    concentration: null,
    effects: [],
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

  it('shows what the typed damage formula rolled, under the type the GM picked', () => {
    render(<MassSavePanel combatants={[monster('a')]} dispatch={vi.fn()} onRoll={vi.fn()} />)

    fireEvent.click(screen.getByText('Group save'))
    fireEvent.click(screen.getByRole('button', { name: 'a' }))
    fireEvent.change(screen.getByLabelText('Damage'), { target: { value: '2d6' } })
    fireEvent.change(screen.getByLabelText('Damage type'), { target: { value: 'fire' } })
    fireEvent.click(screen.getByText('Roll saves'))

    // The field still reads "2d6"; the pill is the only place the total shows.
    const pill = screen.getByText(/^\d+ fire$/)
    const rolled = Number(pill.textContent!.split(' ')[0])
    expect(rolled).toBeGreaterThanOrEqual(2)
    expect(rolled).toBeLessThanOrEqual(12)
  })

  it('rerolls one creature’s save without touching the others', () => {
    const dispatch = vi.fn()
    const { unmount } = render(
      <MassSavePanel
        combatants={[monster('a'), monster('b')]}
        dispatch={dispatch}
        onRoll={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByText('Group save'))
    fireEvent.click(screen.getByRole('button', { name: 'a' }))
    fireEvent.click(screen.getByRole('button', { name: 'b' }))
    fireEvent.click(screen.getByText('Roll saves'))

    // Pin 'b' by hand; rerolling 'a' must leave that alone.
    const rowB = screen.getByLabelText('Damage to b').closest('li') as HTMLElement
    fireEvent.click(within(rowB).getByRole('button', { name: 'Fail' }))

    const rowA = screen.getByLabelText('Damage to a').closest('li') as HTMLElement
    fireEvent.click(within(rowA).getByRole('button', { name: 'Reroll' }))
    expect(within(rowB).getByRole('button', { name: 'Fail' }).className).toContain('rose')

    // One line each, however many times a row was rerolled — the roll that stood.
    unmount()
    const saves = dispatch.mock.calls
      .map((c) => c[0])
      .filter((a) => a.type === 'log')
      .map((a) => a.entry.message)
    expect(saves).toEqual(['a: DEX save', 'b: DEX save'])
  })

  // Legendary Resistance and a manual override both land on the held line, so the log
  // records the outcome that stood rather than the one the die first gave.
  it('records the outcome the Game Master settled on, not the one rolled', () => {
    const dispatch = vi.fn()
    const { unmount } = render(
      <MassSavePanel combatants={[monster('a')]} dispatch={dispatch} onRoll={vi.fn()} />,
    )
    fireEvent.click(screen.getByText('Group save'))
    fireEvent.click(screen.getByRole('button', { name: 'a' }))
    fireEvent.click(screen.getByText('Roll saves'))

    const row = screen.getByLabelText('Damage to a').closest('li') as HTMLElement
    fireEvent.click(within(row).getByRole('button', { name: 'Save' }))
    unmount()

    const [logged] = dispatch.mock.calls.map((c) => c[0]).filter((a) => a.type === 'log')
    expect(logged.entry.saved).toBe(true)
  })

  it('never offers to reroll a player’s save', () => {
    render(<MassSavePanel combatants={[pc('p', 'Thalia')]} dispatch={vi.fn()} onRoll={vi.fn()} />)
    fireEvent.click(screen.getByText('Group save'))
    fireEvent.click(screen.getByRole('button', { name: 'Thalia' }))
    fireEvent.click(screen.getByText('Roll saves'))
    expect(screen.queryByRole('button', { name: 'Reroll' })).toBeNull()
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
