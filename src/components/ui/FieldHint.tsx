// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReactNode } from 'react'
import { useHoverCard } from '../../hooks/useHoverCard.ts'
import { FloatingCard } from './FloatingCard.tsx'

/**
 * The small ? beside a field's label, revealing the field's description on hover, or on
 * a tap where there is no hover. This is the default home for a form field's description
 * text; a line that reports state or consequence stays visible beside the control instead.
 */
export function FieldHint({ children }: { children: ReactNode }) {
  const { card, open, close, cancelClose } = useHoverCard<true>()
  return (
    <>
      <button
        type="button"
        aria-label="What this does"
        aria-expanded={card != null}
        onMouseEnter={(e) => open(true, e.currentTarget)}
        onMouseLeave={close}
        onClick={(e) => (card ? close() : open(true, e.currentTarget))}
        onBlur={close}
        className="tap-area inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:border-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
      >
        ?
      </button>
      {card && (
        <FloatingCard style={card.style} onMouseEnter={cancelClose} onMouseLeave={close}>
          <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {children}
          </div>
        </FloatingCard>
      )}
    </>
  )
}
