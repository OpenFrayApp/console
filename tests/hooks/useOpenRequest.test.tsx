// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { useOpenRequest } from '../../src/hooks/useOpenRequest.ts'

afterEach(cleanup)

/** A minimal consumer: the hook watches `request` the way a popover watches its counter. */
function Probe({ request, onBump }: { request?: number; onBump: (previous?: number) => void }) {
  useOpenRequest(request, onBump)
  return null
}

describe('useOpenRequest', () => {
  it('never fires on a fresh mount', () => {
    const onBump = vi.fn()
    render(<Probe request={3} onBump={onBump} />)
    expect(onBump).not.toHaveBeenCalled()
  })

  it('fires once with the previous value when the prop changes', () => {
    const onBump = vi.fn()
    const { rerender } = render(<Probe request={3} onBump={onBump} />)
    rerender(<Probe request={4} onBump={onBump} />)
    expect(onBump).toHaveBeenCalledTimes(1)
    expect(onBump).toHaveBeenCalledWith(3)
  })

  it('stays quiet when re-rendered with the same value', () => {
    const onBump = vi.fn()
    const { rerender } = render(<Probe request={3} onBump={onBump} />)
    rerender(<Probe request={3} onBump={onBump} />)
    rerender(<Probe request={3} onBump={onBump} />)
    expect(onBump).not.toHaveBeenCalled()
  })

  it('fires on the first bump of an undefined counter, like the optional request props', () => {
    const onBump = vi.fn()
    const { rerender } = render(<Probe onBump={onBump} />)
    rerender(<Probe request={1} onBump={onBump} />)
    expect(onBump).toHaveBeenCalledTimes(1)
    expect(onBump).toHaveBeenCalledWith(undefined)
  })
})
