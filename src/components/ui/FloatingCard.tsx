// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** The card's chrome; its w-96 is the CARD_WIDTH useHoverCard positions with. The z sits
 *  above the z-50 modals and full-screen panels, because a hover card is ephemeral topmost
 *  UI wherever its anchor lives — inside a dialog included. */
const FLOATING_CARD =
  'fixed z-[60] w-96 overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-left shadow-xl dark:border-slate-700 dark:bg-slate-900'

/**
 * A fixed-position hover card portalled to <body>, so it escapes any ancestor
 * `opacity` or `overflow` (e.g. an exhausted, greyed-out action block) that would
 * otherwise dim or clip it. Positioned purely via viewport coordinates in `style`.
 */
export function FloatingCard({
  style,
  onMouseEnter,
  onMouseLeave,
  children,
}: {
  style: CSSProperties
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  children: ReactNode
}) {
  return createPortal(
    <div
      className={FLOATING_CARD}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>,
    document.body,
  )
}
