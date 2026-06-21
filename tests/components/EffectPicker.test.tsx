// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { EffectPicker } from '../../src/components/EffectPicker.tsx'

afterEach(cleanup)

describe('EffectPicker', () => {
  it('applies a condition', () => {
    const onApply = vi.fn()
    render(<EffectPicker onApply={onApply} />)
    fireEvent.click(screen.getByText('Apply condition'))
    fireEvent.click(screen.getByText('Prone'))
    expect(onApply).toHaveBeenCalledOnce()
    expect(onApply.mock.calls[0][0]).toMatchObject({ name: 'Prone', icon: 'condition' })
  })

  it('applies Bless as a flat bonus', () => {
    const onApply = vi.fn()
    render(<EffectPicker onApply={onApply} />)
    fireEvent.click(screen.getByText('Apply condition'))
    fireEvent.click(screen.getByText('Bless +1d4'))
    expect(onApply.mock.calls[0][0].modifier).toMatchObject({ mode: 'flatBonus', value: '1d4' })
  })

  it('applies a custom reminder', () => {
    const onApply = vi.fn()
    render(<EffectPicker onApply={onApply} />)
    fireEvent.click(screen.getByText('Apply condition'))
    fireEvent.change(screen.getByLabelText('Custom reminder'), {
      target: { value: 'Hex: +1d6 necrotic' },
    })
    fireEvent.click(screen.getByText('Add'))
    expect(onApply.mock.calls[0][0]).toMatchObject({ note: 'Hex: +1d6 necrotic', modifier: null })
  })
})
