// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { DeathSaveControls } from '../../src/components/DeathSaveControls.tsx'

afterEach(cleanup)

describe('DeathSaveControls', () => {
  it('shows the current tally', () => {
    render(
      <DeathSaveControls
        saves={{ successes: 2, failures: 1 }}
        onSave={() => {}}
        onFail={() => {}}
        onRoll={() => {}}
      />,
    )
    expect(screen.getByText('2 of 3 successes')).toBeInTheDocument()
    expect(screen.getByText('1 of 3 failures')).toBeInTheDocument()
  })

  it('records the player-reported result via Save and Fail', () => {
    const onSave = vi.fn()
    const onFail = vi.fn()
    const onRoll = vi.fn()
    render(
      <DeathSaveControls
        saves={{ successes: 0, failures: 0 }}
        onSave={onSave}
        onFail={onFail}
        onRoll={onRoll}
      />,
    )
    fireEvent.click(screen.getByText('Save'))
    fireEvent.click(screen.getByText('Fail'))
    expect(onSave).toHaveBeenCalledOnce()
    expect(onFail).toHaveBeenCalledOnce()
    expect(onRoll).not.toHaveBeenCalled()
  })

  it('offers an in-app roll as a fallback', () => {
    const onRoll = vi.fn()
    render(
      <DeathSaveControls
        saves={{ successes: 0, failures: 0 }}
        onSave={() => {}}
        onFail={() => {}}
        onRoll={onRoll}
      />,
    )
    fireEvent.click(screen.getByText('Roll death save'))
    expect(onRoll).toHaveBeenCalledOnce()
  })
})
