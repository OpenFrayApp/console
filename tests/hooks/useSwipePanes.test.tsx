// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useSwipePanes } from '../../src/hooks/useSwipePanes.ts'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
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

  it('positions the unchanged requested pane when the desktop grid becomes a strip', () => {
    const onPaneChange = vi.fn()
    render(<Strip pane={2} onPaneChange={onPaneChange} />)
    const el = screen.getByTestId('strip')
    sizeStrip(el, { clientWidth: 1200, scrollWidth: 1200 })
    fireEvent(window, new Event('resize'))
    expect(el.scrollLeft).toBe(0)
    sizeStrip(el, { clientWidth: 400, scrollWidth: 1200 })
    fireEvent(window, new Event('resize'))
    expect(el.scrollLeft).toBe(800)
    expect(onPaneChange).not.toHaveBeenCalled()
  })

  it('repositions an unchanged pane for a new strip width without reporting a swipe', () => {
    vi.useFakeTimers()
    const onPaneChange = vi.fn()
    render(<Strip pane={1} onPaneChange={onPaneChange} />)
    const el = screen.getByTestId('strip')
    sizeStrip(el)
    fireEvent(window, new Event('resize'))
    el.scrollLeft = 0
    fireEvent.scroll(el)
    sizeStrip(el, { clientWidth: 820, scrollWidth: 2460 })
    fireEvent(window, new Event('resize'))
    act(() => vi.advanceTimersByTime(500))
    expect(el.scrollLeft).toBe(820)
    expect(onPaneChange).not.toHaveBeenCalled()
  })

  it('positions a height-driven shell change even when the strip width stays the same', () => {
    render(<Strip pane={2} onPaneChange={vi.fn()} />)
    const el = screen.getByTestId('strip')
    sizeStrip(el, { clientWidth: 1440, scrollWidth: 1440 })
    fireEvent(window, new Event('resize'))
    sizeStrip(el, { clientWidth: 1440, scrollWidth: 4320 })
    fireEvent(window, new Event('resize'))
    expect(el.scrollLeft).toBe(2880)
  })

  it('replaces a stalled tab animation guard with the resized strip destination', () => {
    vi.useFakeTimers()
    const { rerender } = render(<Strip pane={0} onPaneChange={vi.fn()} />)
    const el = screen.getByTestId('strip')
    sizeStrip(el)
    const scrollTo = vi.fn()
    Object.defineProperty(el, 'scrollTo', { value: scrollTo, configurable: true })
    rerender(<Strip pane={2} onPaneChange={vi.fn()} />)
    act(() => vi.advanceTimersByTime(200))
    Object.defineProperty(el, 'clientWidth', { value: 500, configurable: true })
    Object.defineProperty(el, 'scrollWidth', { value: 1500, configurable: true })
    fireEvent(window, new Event('resize'))
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 1000, behavior: 'auto' })
    act(() => vi.advanceTimersByTime(300))
    expect(el.scrollLeft).toBe(0)
    act(() => vi.advanceTimersByTime(200))
    expect(el.scrollLeft).toBe(1000)
  })

  it('reconciles element dimensions without a viewport resize and ignores unchanged observer notifications', () => {
    let notify: ResizeObserverCallback
    vi.stubGlobal(
      'ResizeObserver',
      class {
        /** Capture browser geometry notifications at their normal boundary. */
        constructor(callback: ResizeObserverCallback) {
          notify = callback
        }
        /** Begin observing the strip. */
        observe() {}
        /** Release observation when the strip changes or unmounts. */
        disconnect() {}
      },
    )
    const { rerender } = render(<Strip pane={0} onPaneChange={vi.fn()} />)
    const el = screen.getByTestId('strip')
    const scrollTo = sizeStrip(el)
    rerender(<Strip pane={1} onPaneChange={vi.fn()} />)
    act(() => notify([], {} as ResizeObserver))
    expect(scrollTo).toHaveBeenCalledTimes(1)
    expect(scrollTo).toHaveBeenCalledWith({ left: 400, behavior: 'smooth' })
    Object.defineProperty(el, 'clientWidth', { value: 500, configurable: true })
    Object.defineProperty(el, 'scrollWidth', { value: 1500, configurable: true })
    act(() => notify([], {} as ResizeObserver))
    expect(el.scrollLeft).toBe(500)
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
