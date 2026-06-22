// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { RestControls } from '../../src/components/RestControls.tsx'
import type { Combatant, PlayerCharacter, MonsterCombatant } from '../../src/schema/combatant.ts'

afterEach(cleanup)

const hero: PlayerCharacter = {
  isPC: true,
  kind: 'pc',
  combatantId: 'hero',
  name: 'Thalia',
  initiative: 0,
  ac: 16,
  status: 'active',
  hp: { current: 4, max: 20, temp: 0 },
  concentration: null,
  effects: [],
}

const foe: MonsterCombatant = {
  isPC: false,
  combatantId: 'foe',
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
}

const combatants: Combatant[] = [hero, foe]

describe('RestControls', () => {
  it('disables both rests while combat is running', () => {
    render(
      <RestControls combatants={combatants} dispatch={() => {}} disabled shortRests={0} showCounter={false} />,
    )
    expect(screen.getByRole('button', { name: 'Short rest' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Long rest' })).toBeDisabled()
  })

  it('shows the short-rest tally only when the counter is enabled', () => {
    const { rerender } = render(
      <RestControls combatants={combatants} dispatch={() => {}} disabled={false} shortRests={2} showCounter={false} />,
    )
    expect(screen.queryByText('2 SR')).toBeNull()
    rerender(
      <RestControls combatants={combatants} dispatch={() => {}} disabled={false} shortRests={2} showCounter />,
    )
    expect(screen.getByText('2 SR')).toBeInTheDocument()
  })

  it('takes a long rest after confirming', () => {
    const dispatch = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(
      <RestControls combatants={combatants} dispatch={dispatch} disabled={false} shortRests={0} showCounter />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Long rest' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'longRest' })
    vi.restoreAllMocks()
  })

  it('does not long rest if the confirm is declined', () => {
    const dispatch = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(
      <RestControls combatants={combatants} dispatch={dispatch} disabled={false} shortRests={0} showCounter />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Long rest' }))
    expect(dispatch).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  it('short rest modal lists only friendly combatants and applies +N / fixed HP', () => {
    const dispatch = vi.fn()
    render(
      <RestControls combatants={combatants} dispatch={dispatch} disabled={false} shortRests={0} showCounter />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Short rest' }))
    const dialog = screen.getByRole('dialog', { name: 'Short rest' })
    // The foe (Goblin) isn't a rest target.
    expect(within(dialog).queryByText('Goblin')).toBeNull()
    // +N heals from current (4 + 5 = 9).
    fireEvent.change(within(dialog).getByLabelText('New HP for Thalia'), { target: { value: '+5' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Take short rest' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'shortRest', hp: { hero: 9 } })
  })

  it('short rest treats a bare number as the exact HP', () => {
    const dispatch = vi.fn()
    render(
      <RestControls combatants={combatants} dispatch={dispatch} disabled={false} shortRests={0} showCounter />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Short rest' }))
    const dialog = screen.getByRole('dialog', { name: 'Short rest' })
    fireEvent.change(within(dialog).getByLabelText('New HP for Thalia'), { target: { value: '12' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Take short rest' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'shortRest', hp: { hero: 12 } })
  })
})
