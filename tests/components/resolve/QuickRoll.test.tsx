// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QuickRoll } from '../../../src/components/resolve/QuickRoll.tsx'

afterEach(cleanup)

describe('QuickRoll', () => {
  it('rolls a typed formula', () => {
    const onRoll = vi.fn()
    render(<QuickRoll onRoll={onRoll} />)
    fireEvent.change(screen.getByLabelText('Dice formula'), { target: { value: '2d6+3' } })
    fireEvent.click(screen.getByText('Roll'))
    expect(onRoll).toHaveBeenCalledOnce()
    expect(onRoll.mock.calls[0][0]).toBe('2d6+3')
    expect(onRoll.mock.calls[0][1].total).toBeGreaterThanOrEqual(5)
  })

  it('rolls a die from a quick button', () => {
    const onRoll = vi.fn()
    render(<QuickRoll onRoll={onRoll} />)
    fireEvent.click(screen.getByText('d20'))
    expect(onRoll).toHaveBeenCalledOnce()
    expect(onRoll.mock.calls[0][0]).toBe('1d20')
  })

  it('ignores a malformed formula', () => {
    const onRoll = vi.fn()
    render(<QuickRoll onRoll={onRoll} />)
    fireEvent.change(screen.getByLabelText('Dice formula'), { target: { value: 'nonsense' } })
    fireEvent.click(screen.getByText('Roll'))
    expect(onRoll).not.toHaveBeenCalled()
  })
})

describe('QuickRoll — the d20 mode', () => {
  it('rolls a plain d20 by default, and a pair once advantage is set', () => {
    const onRoll = vi.fn()
    render(<QuickRoll onRoll={onRoll} />)
    fireEvent.click(screen.getByRole('button', { name: 'd20' }))
    // One die group throughout; what advantage changes is how many faces it rolled.
    expect(onRoll.mock.calls[0][1].dice[0].results).toHaveLength(1)

    fireEvent.click(screen.getByRole('radio', { name: 'Advantage' }))
    fireEvent.click(screen.getByRole('button', { name: 'd20' }))
    const result = onRoll.mock.calls[1][1]
    expect(result.dice[0].results).toHaveLength(2)
    expect(result.dice[0].kept).toHaveLength(1)
    expect(result.advantageState).toBe('advantage')
  })

  it('takes a typed formula exactly as typed, whatever the mode says', () => {
    const onRoll = vi.fn()
    render(<QuickRoll onRoll={onRoll} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Advantage' }))
    fireEvent.change(screen.getByLabelText('Dice formula'), { target: { value: '1d20' } })
    fireEvent.click(screen.getByText('Roll'))
    // The mode is the dice buttons' — somebody typing has already said what they want.
    expect(onRoll.mock.calls[0][1].dice[0].results).toHaveLength(1)
  })

  it('leaves dice that are not a d20 alone, whatever the mode says', () => {
    const onRoll = vi.fn()
    render(<QuickRoll onRoll={onRoll} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Disadvantage' }))
    fireEvent.click(screen.getByRole('button', { name: 'd100' }))
    expect(onRoll.mock.calls[0][1].dice[0].results).toHaveLength(1)
  })
})
