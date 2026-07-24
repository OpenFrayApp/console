// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
  EncounterPlayback,
  EncounterCleanup,
  TurnControls,
} from '../../src/components/EncounterPlayback.tsx'

afterEach(cleanup)

describe('EncounterPlayback', () => {
  it('shows Begin before combat (cleanup lives elsewhere)', () => {
    render(<EncounterPlayback started={false} paused={false} canBegin dispatch={() => {}} />)
    expect(screen.getByRole('button', { name: 'Begin' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove all foes' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Remove all combatants' })).toBeNull()
  })

  it('shows Pause and Stop once combat is running', () => {
    render(<EncounterPlayback started paused={false} canBegin dispatch={() => {}} />)
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Begin' })).toBeNull()
    // Stepping through turns lives with the round heading, not here.
    expect(screen.queryByRole('button', { name: 'Next turn' })).toBeNull()
  })
})

describe('TurnControls', () => {
  it('steps forward and back', () => {
    const dispatch = vi.fn()
    render(<TurnControls dispatch={dispatch} />)
    fireEvent.click(screen.getByRole('button', { name: 'Next turn' }))
    fireEvent.click(screen.getByRole('button', { name: 'Previous turn' }))
    expect(dispatch.mock.calls.map((c) => c[0].type)).toEqual(['nextTurn', 'prevTurn'])
  })

  it('lets the caller override Next turn (to move the selection too)', () => {
    const dispatch = vi.fn()
    const onNextTurn = vi.fn()
    render(<TurnControls dispatch={dispatch} onNextTurn={onNextTurn} />)
    fireEvent.click(screen.getByRole('button', { name: 'Next turn' }))
    expect(onNextTurn).toHaveBeenCalled()
    expect(dispatch).not.toHaveBeenCalled()
  })
})

describe('EncounterCleanup', () => {
  it('shows the skull and broom', () => {
    render(<EncounterCleanup hasCombatants hasFoes dispatch={() => {}} />)
    expect(screen.getByRole('button', { name: 'Remove all combatants' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove all foes' })).toBeInTheDocument()
  })

  it('disables the skull with no combatants and the broom with no foes', () => {
    render(<EncounterCleanup hasCombatants={false} hasFoes={false} dispatch={() => {}} />)
    expect(screen.getByRole('button', { name: 'Remove all combatants' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Remove all foes' })).toBeDisabled()
  })

  it('clears all combatants after confirming', () => {
    const dispatch = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<EncounterCleanup hasCombatants hasFoes dispatch={dispatch} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove all combatants' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'clearAll' })
    vi.restoreAllMocks()
  })

  it('clears foes after confirming', () => {
    const dispatch = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<EncounterCleanup hasCombatants hasFoes dispatch={dispatch} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove all foes' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'clearFoes' })
    vi.restoreAllMocks()
  })

  it('does not clear if the confirm is declined', () => {
    const dispatch = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<EncounterCleanup hasCombatants hasFoes dispatch={dispatch} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove all combatants' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove all foes' }))
    expect(dispatch).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })
})
