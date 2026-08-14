// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useRef } from 'react'

/**
 * Drives a horizontal scroll-snap strip of full-width panes — the phone layout of the
 * console and the compendium. `pane` is the pane the caller wants shown; a swipe that
 * settles on another pane reports back through `onPaneChange`. On layouts where the
 * strip doesn't overflow (the desktop grid), both directions are no-ops.
 */
export function useSwipePanes(pane: number, onPaneChange: (pane: number) => void) {
  const ref = useRef<HTMLDivElement>(null)
  const settle = useRef<number | undefined>(undefined)
  const mounted = useRef(false)
  // Where a programmatic scroll is headed, so a stalled animation is landed by force
  // and the settle reporter never mistakes mid-flight positions for a swipe.
  const target = useRef<number | null>(null)

  /** True while the strip actually pages — its panes overflow it horizontally. */
  const isPaging = () => {
    const el = ref.current
    return el != null && el.scrollWidth > el.clientWidth + 1
  }

  // Scroll to the requested pane — instantly on mount (restoring a pane after a view
  // switch), smoothly after (a tab tap or a row tap asking for another pane). A
  // throttled tab can drop the smooth animation, so a guard lands it by force.
  useEffect(() => {
    const first = !mounted.current
    mounted.current = true
    const el = ref.current
    if (!el || !isPaging()) return
    const left = pane * el.clientWidth
    if (Math.abs(el.scrollLeft - left) <= 1) return
    target.current = left
    el.scrollTo({ left, behavior: first ? 'auto' : 'smooth' })
    const guard = window.setTimeout(() => {
      if (target.current != null && Math.abs(el.scrollLeft - target.current) > 1) {
        el.scrollLeft = target.current
      }
      target.current = null
    }, 500)
    return () => window.clearTimeout(guard)
  }, [pane])

  useEffect(() => () => window.clearTimeout(settle.current), [])

  /** Report the pane a swipe settled on, once the scroll has been quiet for a beat. */
  const onScroll = () => {
    const el = ref.current
    if (!el) return
    if (target.current != null) {
      if (Math.abs(el.scrollLeft - target.current) > 1) return
      target.current = null
    }
    window.clearTimeout(settle.current)
    settle.current = window.setTimeout(() => {
      if (!isPaging() || target.current != null) return
      const landed = Math.round(el.scrollLeft / el.clientWidth)
      if (landed !== pane) onPaneChange(landed)
    }, 120)
  }

  return { ref, onScroll, isPaging }
}
