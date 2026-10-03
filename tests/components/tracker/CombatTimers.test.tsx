// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import type { CombatStats } from '../../../src/schema/encounter.ts'
import { CombatTimers } from '../../../src/components/tracker/CombatTimers.tsx'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

// A paused/frozen clock: runningSince null → activeMillis ignores wall-clock time,
// so the displayed values are deterministic.
const frozen = (activeMs: number): CombatStats => ({
  startedAt: 0,
  activeMs,
  runningSince: null,
  damageDealt: {},
  damageTaken: {},
  biggestHit: null,
})

describe('CombatTimers', () => {
  it('retains the GM wall-time timer by default across pause and resume', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_900_000_000_000)
    const { rerender } = render(
      <CombatTimers stats={{ activeMs: 0, runningSince: Date.now() }} round={1} running />,
    )
    const real = screen.getByTitle('Real elapsed time (excludes pauses)')
    act(() => void vi.advanceTimersByTime(2_000))
    expect(real.textContent).toBe('Real 0:02')
    rerender(
      <CombatTimers stats={{ activeMs: 2_000, runningSince: null }} round={1} running={false} />,
    )
    act(() => void vi.advanceTimersByTime(5_000))
    expect(real.textContent).toBe('Real 0:02')
    rerender(
      <CombatTimers stats={{ activeMs: 2_000, runningSince: Date.now() }} round={1} running />,
    )
    act(() => void vi.advanceTimersByTime(3_000))
    expect(real.textContent).toBe('Real 0:05')
  })

  it('shows real elapsed time and in-game time (round × 6s)', () => {
    render(<CombatTimers stats={frozen(72_000)} round={3} running={false} />)
    expect(screen.getByText('1:12')).toBeInTheDocument() // 72s real
    expect(screen.getByText('0:18')).toBeInTheDocument() // round 3 → 18s in-game
  })

  it('rolls over to h:mm:ss past an hour', () => {
    render(<CombatTimers stats={frozen(3_723_000)} round={0} running={false} />)
    expect(screen.getByText('1:02:03')).toBeInTheDocument() // 1h 2m 3s real
    expect(screen.getByText('0:00')).toBeInTheDocument()
  })
})
