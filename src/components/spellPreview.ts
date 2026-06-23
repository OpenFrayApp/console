// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useRef, useState, type CSSProperties } from 'react'

const CARD_WIDTH = 384 // matches w-96

/**
 * Position a floating spell-preview card next to an anchor rect, kept fully inside
 * the viewport: clamped horizontally, placed on whichever side (below/above the
 * anchor) has more room, and — crucially — capped to the space actually available
 * on that side so a long card never runs off the bottom of the window. The card
 * scrolls internally for anything that doesn't fit.
 */
export function floatingCardStyle(rect: DOMRect): CSSProperties {
  const MARGIN = 8
  const GAP = 6
  const left = Math.max(MARGIN, Math.min(rect.left, window.innerWidth - CARD_WIDTH - MARGIN))
  const below = window.innerHeight - rect.bottom - GAP - MARGIN
  const above = rect.top - GAP - MARGIN
  if (above > below) {
    return { left, bottom: window.innerHeight - rect.top + GAP, maxHeight: Math.max(120, above) }
  }
  return { left, top: rect.bottom + GAP, maxHeight: Math.max(120, below) }
}

export const FLOATING_CARD =
  'fixed z-40 w-96 overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-left shadow-xl dark:border-slate-700 dark:bg-slate-900'

/**
 * Hover-card open/close state with a short close delay, so the mouse can travel
 * from the anchor into the card (to scroll a long one) without it vanishing. The
 * card is interactive; entering it cancels the pending close, leaving it closes.
 * Generic over a payload so callers can stash which spell is shown.
 */
export function useHoverCard<T>() {
  const [card, setCard] = useState<{ value: T; style: CSSProperties } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const cancelClose = () => window.clearTimeout(timer.current)
  const open = (value: T, anchor: HTMLElement) => {
    cancelClose()
    setCard({ value, style: floatingCardStyle(anchor.getBoundingClientRect()) })
  }
  const close = () => {
    cancelClose()
    timer.current = window.setTimeout(() => setCard(null), 150)
  }
  useEffect(() => cancelClose, [])
  return { card, open, close, cancelClose }
}
