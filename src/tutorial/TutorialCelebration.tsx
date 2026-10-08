// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useEffect, useState, type CSSProperties } from 'react'
import './tutorialCelebration.css'

const colors = ['#818cf8', '#34d399', '#fbbf24', '#f472b6', '#38bdf8', '#fb923c']

/** Show one bounded, decorative confetti burst for a mounted completion surface. */
export function TutorialCelebration() {
  const [active, setActive] = useState(true)
  useEffect(() => {
    const timeout = window.setTimeout(() => setActive(false), 2800)
    return () => window.clearTimeout(timeout)
  }, [])

  if (!active) return null
  return (
    <div className="tutorial-confetti" data-testid="tutorial-confetti" aria-hidden="true">
      {Array.from({ length: 144 }, (_, index) => {
        const fromLeft = index < 72
        const piece = index % 72
        return (
          <span
            key={index}
            style={
              {
                left: fromLeft ? 0 : undefined,
                right: fromLeft ? undefined : 0,
                width: `${5 + (piece % 5)}px`,
                height: `${7 + (piece % 7)}px`,
                borderRadius: piece % 4 === 0 ? '50%' : undefined,
                backgroundColor: colors[piece % colors.length],
                '--travel': `${(fromLeft ? 1 : -1) * (18 + ((piece * 37) % 55))}vw`,
                '--rise': `${55 + ((piece * 29) % 40)}dvh`,
                '--spin': `${(fromLeft ? 1 : -1) * (540 + (piece % 5) * 180)}deg`,
                animationDelay: `${(piece % 9) * 12}ms`,
                animationDuration: `${2100 + (piece % 5) * 100}ms`,
              } as CSSProperties
            }
          />
        )
      })}
    </div>
  )
}
