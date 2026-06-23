// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { type ReactNode } from 'react'
import type { Spell } from '../schema/spell.ts'
import { SpellCard } from './SpellCard.tsx'
import { FLOATING_CARD, useHoverCard } from './spellPreview.ts'

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
  const { card, open, close, cancelClose } = useHoverCard<true>()
  return (
    <>
      <span
        className={className}
        onMouseEnter={(e) => open(true, e.currentTarget)}
        onMouseLeave={close}
      >
        {children}
      </span>
      {card && (
        <div className={FLOATING_CARD} style={card.style} onMouseEnter={cancelClose} onMouseLeave={close}>
          <SpellCard spell={spell} />
        </div>
      )}
    </>
  )
}
