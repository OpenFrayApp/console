// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { floatingCardStyle, useHoverCard } from '../../src/components/spellPreview.ts'

afterEach(cleanup)

/** Pin the jsdom viewport so the geometry below is deterministic. */
function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true })
  Object.defineProperty(window, 'innerHeight', { value: height, configurable: true })
}

/** A DOMRect-like carrying just the fields floatingCardStyle reads. */
function anchorRect(left: number, top: number, bottom: number): DOMRect {
  return {
    left,
    top,
    bottom,
    right: left + 40,
    width: 40,
    height: bottom - top,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect
}

describe('floatingCardStyle', () => {
  beforeEach(() => setViewport(1024, 768))

  it('opens below an anchor near the top, capped to the room below', () => {
    expect(floatingCardStyle(anchorRect(200, 100, 120))).toEqual({
      left: 200,
      top: 126, // anchor bottom + 6px gap
      maxHeight: 634, // 768 − 120 − gap − margin
    })
  })

  it('opens above an anchor near the bottom, anchored by its bottom edge', () => {
    expect(floatingCardStyle(anchorRect(200, 700, 720))).toEqual({
      left: 200,
      bottom: 74, // 768 − anchor top + 6px gap
      maxHeight: 686, // 700 − gap − margin
    })
  })

  it('clamps a right-edge anchor so the 384px card stays inside the viewport', () => {
    expect(floatingCardStyle(anchorRect(900, 100, 120)).left).toBe(632) // 1024 − 384 − 8
  })

  it('never sits closer to the left edge than the 8px margin', () => {
    expect(floatingCardStyle(anchorRect(2, 100, 120)).left).toBe(8)
  })

  it('keeps at least 120px of card height in a cramped viewport, preferring below on a tie', () => {
    setViewport(1024, 200)
    const style = floatingCardStyle(anchorRect(200, 90, 110))
    expect(style.top).toBe(116) // equal room on both sides → below
    expect(style.bottom).toBeUndefined()
    expect(style.maxHeight).toBe(120) // floor, though only 76px actually fit
  })
})

describe('useHoverCard', () => {
  beforeEach(() => {
    setViewport(1024, 768)
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })
  afterEach(() => vi.useRealTimers())

  /** An anchor element stub with a fixed on-screen rect. */
  function anchor(): HTMLElement {
    return { getBoundingClientRect: () => anchorRect(200, 100, 120) } as HTMLElement
  }

  it('open shows the card for the value, positioned against the anchor', () => {
    const { result } = renderHook(() => useHoverCard<string>())
    expect(result.current.card).toBeNull()
    act(() => {
      result.current.open('fireball', anchor())
    })
    expect(result.current.card).toEqual({
      value: 'fireball',
      style: { left: 200, top: 126, maxHeight: 634 },
    })
  })

  it('close waits out the 150ms grace period before hiding', () => {
    const { result } = renderHook(() => useHoverCard<string>())
    act(() => {
      result.current.open('fireball', anchor())
      result.current.close()
    })
    act(() => {
      vi.advanceTimersByTime(149)
    })
    expect(result.current.card?.value).toBe('fireball')
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current.card).toBeNull()
  })

  it('cancelClose keeps the card up once the pointer enters it', () => {
    const { result } = renderHook(() => useHoverCard<string>())
    act(() => {
      result.current.open('fireball', anchor())
      result.current.close()
    })
    act(() => {
      vi.advanceTimersByTime(100)
      result.current.cancelClose()
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.card?.value).toBe('fireball')
  })

  it('re-opening during the grace period cancels the pending close', () => {
    const { result } = renderHook(() => useHoverCard<string>())
    act(() => {
      result.current.open('fireball', anchor())
      result.current.close()
    })
    act(() => {
      vi.advanceTimersByTime(100)
      result.current.open('mage hand', anchor())
    })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.card?.value).toBe('mage hand')
  })
})
