// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

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

  // Tab changes animate; restored views and changed strip geometry land immediately.
  // A throttled tab can drop the smooth animation, so a guard lands it by force.
  useEffect(() => {
    const first = !mounted.current
    mounted.current = true
    const el = ref.current
    if (!el) return
    let width = el.clientWidth
    let height = el.clientHeight
    let scrollWidth = el.scrollWidth
    let guard: number | undefined
    /** Position the requested pane, replacing obsolete scroll and settle guards. */
    const position = (behavior: ScrollBehavior) => {
      window.clearTimeout(guard)
      window.clearTimeout(settle.current)
      target.current = null
      if (!isPaging()) return
      const left = pane * el.clientWidth
      if (Math.abs(el.scrollLeft - left) <= 1) return
      target.current = left
      el.scrollTo({ left, behavior })
      guard = window.setTimeout(() => {
        if (target.current != null && Math.abs(el.scrollLeft - target.current) > 1) {
          el.scrollLeft = target.current
        }
        target.current = null
      }, 500)
    }
    /** Reconcile changed geometry without mistaking layout-driven snapping for a swipe. */
    const resize = () => {
      if (width === el.clientWidth && height === el.clientHeight && scrollWidth === el.scrollWidth)
        return
      width = el.clientWidth
      height = el.clientHeight
      scrollWidth = el.scrollWidth
      position('auto')
    }
    position(first ? 'auto' : 'smooth')
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
    observer?.observe(el)
    window.addEventListener('resize', resize)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', resize)
      window.clearTimeout(guard)
    }
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
