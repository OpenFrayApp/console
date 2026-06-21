// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { CSSProperties } from 'react'

const CARD_WIDTH = 384 // matches w-96

/**
 * Position a floating spell-preview card next to an anchor rect, kept inside the
 * viewport: clamped horizontally, and flipped above the anchor when there's more
 * room above than below (so a spell near the bottom — e.g. a Lich legendary
 * action — isn't clipped). The card itself is capped at 80vh and scrolls.
 */
export function floatingCardStyle(rect: DOMRect): CSSProperties {
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - CARD_WIDTH - 8))
  const below = window.innerHeight - rect.bottom
  if (below < 320 && rect.top > below) {
    return { left, bottom: window.innerHeight - rect.top + 6, maxHeight: '80vh' }
  }
  return { left, top: rect.bottom + 6, maxHeight: '80vh' }
}

export const FLOATING_CARD =
  'pointer-events-none fixed z-40 w-96 overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-left shadow-xl dark:border-slate-700 dark:bg-slate-900'
