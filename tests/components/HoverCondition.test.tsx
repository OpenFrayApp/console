// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { HoverCondition } from '../../src/components/HoverCondition.tsx'
import { CONDITION_TEXT } from '../../src/compendium/conditions.ts'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

/** Render a Stunned hover anchor and return the anchor element. */
function renderAnchor(): HTMLElement {
  render(
    <HoverCondition name="Stunned" text={CONDITION_TEXT.Stunned}>
      stunned-label
    </HoverCondition>,
  )
  return screen.getByText('stunned-label')
}

/** The floating card element wrapping the preview's heading. */
function cardAround(heading: HTMLElement): HTMLElement {
  const card = heading.parentElement?.parentElement
  if (!card) throw new Error('no floating card around the heading')
  return card
}

describe('HoverCondition', () => {
  it('opens the condition rules preview on hover', () => {
    const anchor = renderAnchor()
    expect(screen.queryByRole('heading', { name: 'Stunned' })).toBeNull()
    fireEvent.mouseEnter(anchor)
    expect(screen.getByRole('heading', { name: 'Stunned' })).toBeInTheDocument()
    expect(
      screen.getByText(/automatically fail Strength and Dexterity saving throws/i),
    ).toBeInTheDocument()
  })

  it('closes after the grace period once the pointer leaves', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const anchor = renderAnchor()
    fireEvent.mouseEnter(anchor)
    fireEvent.mouseLeave(anchor)
    // Still open through the grace, so the pointer can travel into the card.
    expect(screen.getByRole('heading', { name: 'Stunned' })).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(screen.queryByRole('heading', { name: 'Stunned' })).toBeNull()
  })

  it('stays open while the pointer is inside the card, then closes on leave', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const anchor = renderAnchor()
    fireEvent.mouseEnter(anchor)
    const card = cardAround(screen.getByRole('heading', { name: 'Stunned' }))
    fireEvent.mouseLeave(anchor)
    fireEvent.mouseEnter(card) // cancels the pending close
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByRole('heading', { name: 'Stunned' })).toBeInTheDocument()
    fireEvent.mouseLeave(card)
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(screen.queryByRole('heading', { name: 'Stunned' })).toBeNull()
  })
})
