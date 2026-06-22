// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { EncounterPlayback } from '../../src/components/EncounterPlayback.tsx'

afterEach(cleanup)

describe('EncounterPlayback', () => {
  it('shows the clear-foes broom alongside Begin before combat', () => {
    render(
      <EncounterPlayback started={false} paused={false} canBegin hasFoes dispatch={() => {}} />,
    )
    expect(screen.getByRole('button', { name: 'Begin' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove all foes' })).toBeInTheDocument()
  })

  it('disables the broom when there are no foes', () => {
    render(
      <EncounterPlayback started={false} paused={false} canBegin hasFoes={false} dispatch={() => {}} />,
    )
    expect(screen.getByRole('button', { name: 'Remove all foes' })).toBeDisabled()
  })

  it('clears foes after confirming', () => {
    const dispatch = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(
      <EncounterPlayback started={false} paused={false} canBegin hasFoes dispatch={dispatch} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Remove all foes' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'clearFoes' })
    vi.restoreAllMocks()
  })

  it('does not clear foes if the confirm is declined', () => {
    const dispatch = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(
      <EncounterPlayback started={false} paused={false} canBegin hasFoes dispatch={dispatch} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Remove all foes' }))
    expect(dispatch).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  it('hides the broom once combat is running', () => {
    render(
      <EncounterPlayback started paused={false} canBegin hasFoes dispatch={() => {}} />,
    )
    expect(screen.queryByRole('button', { name: 'Remove all foes' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Next turn' })).toBeInTheDocument()
  })
})
