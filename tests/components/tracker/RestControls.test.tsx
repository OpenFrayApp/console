// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { RestControls } from '../../../src/components/tracker/RestControls.tsx'
import type { Combatant } from '../../../src/schema/combatant.ts'
import { monster, pc } from '../../fixtures.ts'

afterEach(cleanup)

const hero = pc({ combatantId: 'hero', initiative: 0, hp: { current: 4, max: 20, temp: 0 } })
const foe = monster({ combatantId: 'foe', label: 'Goblin', initiative: 0 })

const combatants: Combatant[] = [hero, foe]

describe('RestControls', () => {
  it('disables both rests while combat is running', () => {
    render(
      <RestControls
        combatants={combatants}
        dispatch={() => {}}
        disabled
        shortRests={0}
        showCounter={false}
      />,
    )
    expect(screen.getByRole('button', { name: 'Short rest' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Long rest' })).toBeDisabled()
  })

  it('shows the short-rest tally only when the counter is enabled', () => {
    const { rerender } = render(
      <RestControls
        combatants={combatants}
        dispatch={() => {}}
        disabled={false}
        shortRests={2}
        showCounter={false}
      />,
    )
    expect(screen.queryByText('2 short rests')).toBeNull()
    rerender(
      <RestControls
        combatants={combatants}
        dispatch={() => {}}
        disabled={false}
        shortRests={2}
        showCounter
      />,
    )
    expect(screen.getByText('2 short rests')).toBeInTheDocument()
  })

  it('takes a long rest after confirming', () => {
    const dispatch = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(
      <RestControls
        combatants={combatants}
        dispatch={dispatch}
        disabled={false}
        shortRests={0}
        showCounter
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Long rest' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'longRest' })
    vi.restoreAllMocks()
  })

  it('does not long rest if the confirm is declined', () => {
    const dispatch = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(
      <RestControls
        combatants={combatants}
        dispatch={dispatch}
        disabled={false}
        shortRests={0}
        showCounter
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Long rest' }))
    expect(dispatch).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  it('short rest modal lists only friendly combatants and applies +N / fixed HP', () => {
    const dispatch = vi.fn()
    render(
      <RestControls
        combatants={combatants}
        dispatch={dispatch}
        disabled={false}
        shortRests={0}
        showCounter
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Short rest' }))
    const dialog = screen.getByRole('dialog', { name: 'Short rest' })
    expect(within(dialog).queryByText('Goblin')).toBeNull()
    // +N heals from current (4 + 5 = 9).
    fireEvent.change(within(dialog).getByLabelText('New hit points for Thalia'), {
      target: { value: '+5' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Take short rest' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'shortRest', hp: { hero: 9 } })
  })

  it('short rest treats a bare number as the exact HP', () => {
    const dispatch = vi.fn()
    render(
      <RestControls
        combatants={combatants}
        dispatch={dispatch}
        disabled={false}
        shortRests={0}
        showCounter
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Short rest' }))
    const dialog = screen.getByRole('dialog', { name: 'Short rest' })
    fireEvent.change(within(dialog).getByLabelText('New hit points for Thalia'), {
      target: { value: '12' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Take short rest' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'shortRest', hp: { hero: 12 } })
  })
})
