// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { cleanup, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { version } from '../../../package.json'
import App from '../../../src/App.tsx'
import { saveSettings } from '../../../src/state/settings.ts'
import '../../../src/index.css'

beforeEach(() => saveSettings({ tutorialSuppression: 'dismissed' }))

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  localStorage.clear()
})

it.each([1025, 1280, 1536])('keeps the version visible in the footer at %i px', async (width) => {
  await page.viewport(width, 800)
  render(createElement(App))
  await screen.findByRole('button', { name: 'Quick add' })
  const release = screen.getByText(`v${version}`)
  await expect.element(release).toBeVisible()
  const footer = release.closest('footer')!
  const bounds = release.getBoundingClientRect()
  const footerBounds = footer.getBoundingClientRect()
  expect(bounds.right).toBeLessThanOrEqual(footerBounds.right)
  expect(bounds.bottom).toBeLessThanOrEqual(footerBounds.bottom)
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(innerWidth)
})

it('keeps the version reachable in the phone settings menu', async () => {
  await page.viewport(390, 844)
  render(createElement(App))
  await userEvent.click(screen.getByRole('button', { name: 'Settings and more' }))
  const releases = screen.getAllByText(`v${version}`)
  const visibleRelease = releases.find((element) => element.getBoundingClientRect().width > 0)!
  await expect.element(visibleRelease).toBeVisible()
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(innerWidth)
})
