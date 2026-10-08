// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { createElement } from 'react'
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { commands, page, userEvent } from 'vitest/browser'
import { TutorialCelebration } from '../../src/tutorial/TutorialCelebration.tsx'

const browser = commands as typeof commands & {
  emulateAccessibilityMedia(options: { reducedMotion: 'reduce' | 'no-preference' }): Promise<void>
}

afterEach(async () => {
  cleanup()
  await browser.emulateAccessibilityMedia({ reducedMotion: 'no-preference' })
})

it.each([
  [375, 812],
  [1180, 820],
  [1440, 900],
])(
  'keeps the burst bounded and controls pointer/keyboard usable at %i × %i',
  async (width, height) => {
    await page.viewport(width, height)
    render(
      createElement(
        'div',
        null,
        createElement(TutorialCelebration),
        createElement(
          'button',
          {
            onClick: (event) => {
              event.currentTarget.textContent = 'Continued'
            },
          },
          'Continue',
        ),
      ),
    )
    const burst = screen.getByTestId('tutorial-confetti')
    expect(getComputedStyle(burst).pointerEvents).toBe('none')
    const particles = [...burst.children] as HTMLElement[]
    expect(particles).toHaveLength(144)
    for (const index of [0, 72]) {
      const particle = particles[index]
      const animation = particle.getAnimations()[0]
      animation.pause()
      animation.currentTime = 0
      const launch = particle.getBoundingClientRect()
      expect(launch.top).toBeGreaterThanOrEqual(innerHeight - 12)
      if (index === 0) expect(launch.left).toBeLessThanOrEqual(0)
      else expect(launch.right).toBeGreaterThanOrEqual(innerWidth)
      const duration = Number(animation.effect!.getComputedTiming().duration)
      animation.currentTime = duration * 0.45
      const peak = particle.getBoundingClientRect()
      expect(peak.top).toBeLessThan(innerHeight * 0.6)
      if (index === 0) expect(peak.left).toBeGreaterThan(launch.left + 20)
      else expect(peak.right).toBeLessThan(launch.right - 20)
      animation.play()
    }
    expect(
      particles.every((particle) => getComputedStyle(particle).animationIterationCount === '1'),
    ).toBe(true)
    await userEvent.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Continue' }))
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('button', { name: 'Continued' })).toBeTruthy()
    await expect.poll(() => screen.queryByTestId('tutorial-confetti'), { timeout: 4000 }).toBeNull()
  },
)

it('disables the burst immediately under reduced motion, including a preference change mid-burst', async () => {
  await browser.emulateAccessibilityMedia({ reducedMotion: 'reduce' })
  render(createElement(TutorialCelebration))
  const burst = screen.getByTestId('tutorial-confetti')
  expect(getComputedStyle(burst).display).toBe('none')
  expect(getComputedStyle(burst.firstElementChild!).animationName).toBe('none')
  await browser.emulateAccessibilityMedia({ reducedMotion: 'no-preference' })
  expect(getComputedStyle(burst).display).not.toBe('none')
  await browser.emulateAccessibilityMedia({ reducedMotion: 'reduce' })
  expect(getComputedStyle(burst).display).toBe('none')
})
