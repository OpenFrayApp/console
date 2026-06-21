// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useState, type ReactNode } from 'react'
import type { Spell } from '../schema/spell.ts'
import { SpellCard } from './SpellCard.tsx'

/**
 * Wraps a label and shows the spell's card on hover, anchored with a fixed
 * position so it isn't clipped by a scrolling container. Touch devices don't
 * fire hover, so the label just reads as styled text there.
 */
export function HoverSpell({
  spell,
  children,
  className,
}: {
  spell: Spell
  children: ReactNode
  className?: string
}) {
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null)
  return (
    <>
      <span
        className={className}
        onMouseEnter={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          setPoint({ x: Math.min(r.left, window.innerWidth - 340), y: r.bottom + 6 })
        }}
        onMouseLeave={() => setPoint(null)}
      >
        {children}
      </span>
      {point && (
        <div
          className="pointer-events-none fixed z-40 w-80 rounded-lg border border-slate-200 bg-white p-3 text-left shadow-xl dark:border-slate-700 dark:bg-slate-900"
          style={{ left: point.x, top: point.y }}
        >
          <SpellCard spell={spell} />
        </div>
      )}
    </>
  )
}
