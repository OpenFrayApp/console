// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { CombatStats } from '../../src/schema/encounter.ts'
import { CombatTimers } from '../../src/components/CombatTimers.tsx'

afterEach(cleanup)

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
