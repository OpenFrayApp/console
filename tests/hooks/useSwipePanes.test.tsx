// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useSwipePanes } from '../../src/hooks/useSwipePanes.ts'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

/** Bare strip wired to the hook, so tests can drive it as a component. */
function Strip({ pane, onPaneChange }: { pane: number; onPaneChange: (pane: number) => void }) {
  const { ref, onScroll } = useSwipePanes(pane, onPaneChange)
  return <div data-testid="strip" ref={ref} onScroll={onScroll} />
}

/** Give the jsdom strip real dimensions and a scrollTo that records itself. */
function sizeStrip(el: HTMLElement, { clientWidth = 400, scrollWidth = 1200 } = {}) {
  Object.defineProperty(el, 'clientWidth', { value: clientWidth, configurable: true })
  Object.defineProperty(el, 'scrollWidth', { value: scrollWidth, configurable: true })
  const scrollTo = vi.fn((opts: ScrollToOptions) => {
    el.scrollLeft = opts.left ?? 0
  })
  Object.defineProperty(el, 'scrollTo', { value: scrollTo, configurable: true })
  return scrollTo
}

describe('useSwipePanes', () => {
  it('scrolls to the requested pane when it changes', () => {
    const { rerender } = render(<Strip pane={0} onPaneChange={vi.fn()} />)
    const scrollTo = sizeStrip(screen.getByTestId('strip'))
    rerender(<Strip pane={2} onPaneChange={vi.fn()} />)
    expect(scrollTo).toHaveBeenCalledWith({ left: 800, behavior: 'smooth' })
  })

  it('reports the pane a swipe settles on, once', () => {
    vi.useFakeTimers()
    const onPaneChange = vi.fn()
    render(<Strip pane={0} onPaneChange={onPaneChange} />)
    const el = screen.getByTestId('strip')
    sizeStrip(el)
    el.scrollLeft = 390
    fireEvent.scroll(el)
    el.scrollLeft = 405
    fireEvent.scroll(el)
    vi.advanceTimersByTime(120)
    expect(onPaneChange).toHaveBeenCalledTimes(1)
    expect(onPaneChange).toHaveBeenCalledWith(1)
  })

  it('stays quiet when the settled pane is the current one', () => {
    vi.useFakeTimers()
    const onPaneChange = vi.fn()
    render(<Strip pane={1} onPaneChange={onPaneChange} />)
    const el = screen.getByTestId('strip')
    sizeStrip(el)
    el.scrollLeft = 402
    fireEvent.scroll(el)
    vi.advanceTimersByTime(120)
    expect(onPaneChange).not.toHaveBeenCalled()
  })

  it('does nothing on a layout that does not page (the desktop grid)', () => {
    const { rerender } = render(<Strip pane={0} onPaneChange={vi.fn()} />)
    const scrollTo = sizeStrip(screen.getByTestId('strip'), {
      clientWidth: 1200,
      scrollWidth: 1200,
    })
    rerender(<Strip pane={1} onPaneChange={vi.fn()} />)
    expect(scrollTo).not.toHaveBeenCalled()
  })
})
