// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { TutorialCelebration } from '../../src/tutorial/TutorialCelebration.tsx'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('shows one decorative burst, expires within three seconds, and does not restart on rerender', () => {
  vi.useFakeTimers()
  const view = render(<TutorialCelebration />)
  const burst = screen.getByTestId('tutorial-confetti')
  expect(burst).toHaveAttribute('aria-hidden', 'true')
  expect(burst.querySelectorAll('button, a, input, [tabindex], [aria-live]')).toHaveLength(0)
  expect(burst.children.length).toBeGreaterThanOrEqual(128)
  expect(burst.children.length).toBeLessThanOrEqual(160)
  act(() => vi.advanceTimersByTime(3000))
  expect(screen.queryByTestId('tutorial-confetti')).toBeNull()
  view.rerender(<TutorialCelebration />)
  expect(screen.queryByTestId('tutorial-confetti')).toBeNull()
})

it('cancels pending cleanup on unmount and permits a fresh burst on remount', () => {
  vi.useFakeTimers()
  const view = render(<TutorialCelebration />)
  const pending = vi.getTimerCount()
  expect(pending).toBeGreaterThan(0)
  view.unmount()
  expect(vi.getTimerCount()).toBeLessThan(pending)
  render(<TutorialCelebration />)
  expect(screen.getByTestId('tutorial-confetti')).toBeInTheDocument()
})
