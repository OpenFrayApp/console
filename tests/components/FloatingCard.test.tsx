// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { FloatingCard } from '../../src/components/FloatingCard.tsx'

afterEach(cleanup)

describe('FloatingCard', () => {
  it('portals out to <body>, escaping the host subtree', () => {
    render(
      <div data-testid="host">
        <FloatingCard style={{ top: 40, left: 8 }}>Misty Step</FloatingCard>
      </div>,
    )
    const card = screen.getByText('Misty Step')
    expect(screen.getByTestId('host')).not.toContainElement(card)
    expect(card.parentElement).toBe(document.body)
  })

  it('positions itself purely from the style it is given', () => {
    render(<FloatingCard style={{ left: 8, bottom: 74, maxHeight: 686 }}>Misty Step</FloatingCard>)
    expect(screen.getByText('Misty Step')).toHaveStyle({
      left: '8px',
      bottom: '74px',
      maxHeight: '686px',
    })
  })

  it('reports pointer enter and leave so the owner can hold it open', () => {
    const onMouseEnter = vi.fn()
    const onMouseLeave = vi.fn()
    render(
      <FloatingCard style={{}} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
        Misty Step
      </FloatingCard>,
    )
    fireEvent.mouseEnter(screen.getByText('Misty Step'))
    expect(onMouseEnter).toHaveBeenCalledTimes(1)
    expect(onMouseLeave).not.toHaveBeenCalled()
    fireEvent.mouseLeave(screen.getByText('Misty Step'))
    expect(onMouseLeave).toHaveBeenCalledTimes(1)
  })
})
