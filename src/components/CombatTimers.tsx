// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useState } from 'react'
import type { CombatClock } from '../schema/encounter.ts'
import { activeMillis } from '../combat/recap.ts'

/** Seconds → `m:ss` (or `h:mm:ss` past an hour), for a live clock readout. */
function clock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/** Clock icon (footer combat clocks). */
function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

const VALUE = 'tabular-nums font-medium text-slate-700 dark:text-slate-200'

/**
 * Live combat clocks for the footer: real elapsed time (excludes paused stretches)
 * and in-game time (rounds × 6s). The 1s tick lives here so only this readout
 * re-renders each second, never the whole console. Frozen while paused — a paused
 * `CombatStats` has `runningSince: null`, so `activeMillis` ignores `now`.
 */
export function CombatTimers({
  stats,
  round,
  running,
}: {
  stats: CombatClock
  round: number
  /** Combat is started and not paused — drives the 1s tick. */
  running: boolean
}) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!running) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [running])

  return (
    <div className="flex items-center gap-2.5 text-sm text-slate-500 dark:text-slate-400">
      <ClockIcon />
      <span title="Real elapsed time (excludes pauses)">
        Real <span className={VALUE}>{clock(activeMillis(stats, now) / 1000)}</span>
      </span>
      <span className="text-slate-300 dark:text-slate-600">·</span>
      <span title="In-game time (6 seconds per round)">
        In-game <span className={VALUE}>{clock(round * 6)}</span>
      </span>
    </div>
  )
}
