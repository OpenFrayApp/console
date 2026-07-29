// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { DieRoll, SPIN_MS } from '../../src/components/DieRoll.tsx'

/** Stub the reduced-motion media query to the given preference. */
function stubReducedMotion(matches: boolean) {
  vi.stubGlobal('matchMedia', () => ({ matches }))
}

beforeEach(() => {
  // now: 0 lines the faked performance.now up with the faked rAF timestamps.
  vi.useFakeTimers({
    now: 0,
    toFake: [
      'setTimeout',
      'clearTimeout',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
    ],
  })
  // Pin the cosmetic mid-spin face to 11, distinct from every rolled value used here.
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('DieRoll', () => {
  it('shows the rolled value at once under reduced motion', () => {
    stubReducedMotion(true)
    render(<DieRoll value={17} spinKey={1} />)
    expect(screen.getByLabelText('d20: 17')).toBeInTheDocument()
    expect(screen.getByText('17')).toBeInTheDocument()
    // Mid-spin time passes: still the value, never a cosmetic face.
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(screen.getByLabelText('d20: 17')).toBeInTheDocument()
  })

  it('spins through cosmetic faces, then settles on the real roll after SPIN_MS', () => {
    stubReducedMotion(false)
    render(<DieRoll value={17} spinKey={1} />)
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(screen.getByLabelText('d20: 11')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(SPIN_MS)
    })
    expect(screen.getByLabelText('d20: 17')).toBeInTheDocument()
    expect(screen.getByText('17')).toBeInTheDocument()
  })

  it('a new spinKey restarts the spin for the next roll', () => {
    stubReducedMotion(false)
    const { rerender } = render(<DieRoll value={17} spinKey={1} />)
    act(() => {
      vi.advanceTimersByTime(SPIN_MS)
    })
    expect(screen.getByLabelText('d20: 17')).toBeInTheDocument()
    rerender(<DieRoll value={3} spinKey={2} />)
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(screen.getByLabelText('d20: 11')).toBeInTheDocument() // spinning again
    act(() => {
      vi.advanceTimersByTime(SPIN_MS)
    })
    expect(screen.getByLabelText('d20: 3')).toBeInTheDocument()
  })
})
