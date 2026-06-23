// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useRef, useState } from 'react'

export const SPIN_MS = 800

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )
}

/**
 * A d20 that spins and settles on `value`. Bump `spinKey` to (re)start a spin.
 * Respects prefers-reduced-motion (shows the value at once).
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
  // Crit/fumble colour only shows once the die has settled, not mid-spin.
  const [settled, setSettled] = useState(true)
  const frame = useRef(0)

  useEffect(() => {
    if (prefersReducedMotion()) {
      setFace(value)
      setSettled(true)
      return
    }
    setSettled(false)
    const start = performance.now()
    let lastSwap = 0
    const tick = (now: number) => {
      const elapsed = now - start
      if (elapsed >= SPIN_MS) {
        setFace(value)
        setSettled(true)
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
    settled && tone === 'crit'
      ? 'text-emerald-600 dark:text-emerald-400'
      : settled && tone === 'fumble'
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
