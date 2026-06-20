// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useRef, useState } from 'react'

/** How long the spin runs before settling. Capped well under one second. */
export const SPIN_MS = 800

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )
}

/**
 * A d20 that spins to a value: it flips through faces quickly, slows down, and
 * settles on `value` — the whole animation capped under a second. Bump `spinKey`
 * to (re)start a spin. Respects prefers-reduced-motion (shows the value at once).
 *
 * The flickering faces are cosmetic only and use `Math.random` — the *actual*
 * roll is produced by the CSPRNG dice engine and passed in as `value`.
 */
export function DieRoll({
  value,
  spinKey,
  tone = 'normal',
}: {
  value: number
  spinKey: number
  tone?: 'normal' | 'crit' | 'fumble'
}) {
  const [face, setFace] = useState(value)
  const frame = useRef(0)

  useEffect(() => {
    if (prefersReducedMotion()) {
      setFace(value)
      return
    }
    const start = performance.now()
    let lastSwap = 0
    const tick = (now: number) => {
      const elapsed = now - start
      if (elapsed >= SPIN_MS) {
        setFace(value)
        return
      }
      // Swap faces less often as the die "slows down" (≈40ms → ≈150ms).
      const interval = 40 + 110 * (elapsed / SPIN_MS)
      if (now - lastSwap >= interval) {
        lastSwap = now
        setFace(1 + Math.floor(Math.random() * 20))
      }
      frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [spinKey, value])

  const toneClass =
    tone === 'crit'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'fumble'
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-slate-700 dark:text-slate-200'

  return (
    <span
      className={`relative inline-flex h-11 w-11 shrink-0 items-center justify-center ${toneClass}`}
      aria-label={`d20: ${face}`}
    >
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinejoin="round"
      >
        <polygon points="50,4 91,27 91,73 50,96 9,73 9,27" />
      </svg>
      <span className="relative text-base font-bold tabular-nums">{face}</span>
    </span>
  )
}
