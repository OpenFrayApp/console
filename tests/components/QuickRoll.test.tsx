// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QuickRoll } from '../../src/components/QuickRoll.tsx'

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
