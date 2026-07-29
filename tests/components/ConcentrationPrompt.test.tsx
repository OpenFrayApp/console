// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ConcentrationPrompt } from '../../src/components/ConcentrationPrompt.tsx'

afterEach(cleanup)

describe('ConcentrationPrompt', () => {
  it('shows the DC computed from the damage taken', () => {
    render(<ConcentrationPrompt dc={14} canRoll={false} onMaintain={vi.fn()} onBreak={vi.fn()} />)
    expect(screen.getByText('Concentration — DC 14')).toBeInTheDocument()
  })

  it('records the result through the Maintained / Broken callbacks', () => {
    const onMaintain = vi.fn()
    const onBreak = vi.fn()
    render(
      <ConcentrationPrompt dc={10} canRoll={false} onMaintain={onMaintain} onBreak={onBreak} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Maintained' }))
    expect(onMaintain).toHaveBeenCalledTimes(1)
    expect(onBreak).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Broken' }))
    expect(onBreak).toHaveBeenCalledTimes(1)
  })

  it('offers the in-app roll only when canRoll and a handler are both given', () => {
    const onRoll = vi.fn()
    const { rerender } = render(
      <ConcentrationPrompt
        dc={10}
        canRoll
        onMaintain={vi.fn()}
        onBreak={vi.fn()}
        onRoll={onRoll}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Roll CON save' }))
    expect(onRoll).toHaveBeenCalledTimes(1)

    // A PC never gets an in-app roll, even if a handler slipped through.
    rerender(
      <ConcentrationPrompt
        dc={10}
        canRoll={false}
        onMaintain={vi.fn()}
        onBreak={vi.fn()}
        onRoll={onRoll}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Roll CON save' })).toBeNull()
  })

  it('hides the roll button when no roll handler is wired', () => {
    render(<ConcentrationPrompt dc={10} canRoll onMaintain={vi.fn()} onBreak={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Roll CON save' })).toBeNull()
  })
})
