// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useEffect, useState, type CSSProperties } from 'react'
import './tutorialCelebration.css'

const colors = ['#818cf8', '#34d399', '#fbbf24', '#f472b6']

/** Show one bounded, decorative confetti burst for a mounted completion surface. */
export function TutorialCelebration() {
  const [active, setActive] = useState(true)
  useEffect(() => {
    const timeout = window.setTimeout(() => setActive(false), 2400)
    return () => window.clearTimeout(timeout)
  }, [])

  if (!active) return null
  return (
    <div className="tutorial-confetti" data-testid="tutorial-confetti" aria-hidden="true">
      {Array.from({ length: 32 }, (_, index) => (
        <span
          key={index}
          style={
            {
              left: `${8 + ((index * 17) % 84)}%`,
              backgroundColor: colors[index % colors.length],
              '--drift': `${((index * 31) % 160) - 80}px`,
              '--spin': `${index % 2 ? 540 : -540}deg`,
              animationDelay: `${(index % 8) * 35}ms`,
              animationDuration: `${1600 + (index % 5) * 100}ms`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
