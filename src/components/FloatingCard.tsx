// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { FLOATING_CARD } from './spellPreview.ts'

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
    <div className={FLOATING_CARD} style={style} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {children}
    </div>,
    document.body,
  )
}
