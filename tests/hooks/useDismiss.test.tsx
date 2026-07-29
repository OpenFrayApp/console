// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useDismiss } from '../../src/hooks/useDismiss.ts'

afterEach(cleanup)

/** A minimal popover harness: the hook watches the inner box while `open`. */
function Popover({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, open, onClose)
  return (
    <div>
      <div ref={ref}>
        <button>inside</button>
      </div>
      <button>outside</button>
    </div>
  )
}

describe('useDismiss', () => {
  it('closes on a pointer-down outside the popover', () => {
    const onClose = vi.fn()
    render(<Popover open onClose={onClose} />)
    fireEvent.pointerDown(screen.getByText('outside'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('leaves pointer-downs inside the popover alone', () => {
    const onClose = vi.fn()
    render(<Popover open onClose={onClose} />)
    fireEvent.pointerDown(screen.getByText('inside'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes on Escape and only Escape', () => {
    const onClose = vi.fn()
    render(<Popover open onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Enter' })
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does nothing while the popover is closed', () => {
    const onClose = vi.fn()
    render(<Popover open={false} onClose={onClose} />)
    fireEvent.pointerDown(screen.getByText('outside'))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('removes its listeners when open flips to false', () => {
    const onClose = vi.fn()
    const { rerender } = render(<Popover open onClose={onClose} />)
    rerender(<Popover open={false} onClose={onClose} />)
    fireEvent.pointerDown(screen.getByText('outside'))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('removes its listeners on unmount', () => {
    const onClose = vi.fn()
    const { unmount } = render(<Popover open onClose={onClose} />)
    unmount()
    fireEvent.pointerDown(document.body)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })
})
