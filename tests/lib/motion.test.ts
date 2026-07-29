// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { afterEach, describe, expect, it, vi } from 'vitest'
import { prefersReducedMotion } from '../../src/lib/motion.ts'

afterEach(() => vi.unstubAllGlobals())

/** Stub a window whose matchMedia reports the given match result. */
function stubMatchMedia(matches: boolean) {
  const matchMedia = vi.fn(() => ({ matches }))
  vi.stubGlobal('window', { matchMedia })
  return matchMedia
}

describe('prefersReducedMotion', () => {
  it('is false where there is no window at all (this suite runs in node)', () => {
    expect(typeof window).toBe('undefined')
    expect(prefersReducedMotion()).toBe(false)
  })

  it('is true when the OS asks for reduced motion', () => {
    const matchMedia = stubMatchMedia(true)
    expect(prefersReducedMotion()).toBe(true)
    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
  })

  it('is false when the query does not match', () => {
    stubMatchMedia(false)
    expect(prefersReducedMotion()).toBe(false)
  })

  it('is false when the browser has no matchMedia', () => {
    vi.stubGlobal('window', {})
    expect(prefersReducedMotion()).toBe(false)
  })
})
