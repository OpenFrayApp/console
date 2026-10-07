// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { cleanup, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'
import App from '../../src/App.tsx'
import { loadSettings } from '../../src/state/settings.ts'
import { AuthContext } from '../../src/auth/useAuth.ts'
import { authState } from '../fixtures.ts'
import '../../src/index.css'

vi.mock('../../src/lib/supabase.ts', () => ({ supabase: null }))
const touchCommands = commands as typeof commands & {
  emulateTouch(enabled: boolean): Promise<void>
}

afterEach(async () => {
  cleanup()
  sessionStorage.clear()
  localStorage.clear()
  await touchCommands.emulateTouch(false)
})

/** Verify the current guide is readable without horizontal page scrolling. */
function expectContained(panel: HTMLElement) {
  const bounds = panel.getBoundingClientRect()
  expect(bounds.left).toBeGreaterThanOrEqual(0)
  expect(bounds.right).toBeLessThanOrEqual(innerWidth)
  expect(bounds.top).toBeGreaterThanOrEqual(0)
  expect(bounds.bottom).toBeLessThanOrEqual(innerHeight)
  expect(panel.scrollWidth).toBeLessThanOrEqual(panel.clientWidth)
}

const layouts = [
  { width: 375, height: 812 },
  { width: 820, height: 1180 },
  { width: 812, height: 375 },
  { width: 1180, height: 820 },
  { width: 1440, height: 900 },
]

it.each(layouts.flatMap((layout) => ['light', 'dark'].map((theme) => ({ ...layout, theme }))))(
  'offers, launches, and exits with keyboard and touch in $theme at $width × $height',
  async ({ width, height, theme }) => {
    await page.viewport(width, height)
    await touchCommands.emulateTouch(true)
    localStorage.setItem('openfray-theme', theme)
    render(createElement(App))
    const welcome = await screen.findByRole('dialog', { name: 'Learn the console' })
    expectContained(welcome)
    await expect.poll(() => welcome.contains(document.activeElement)).toBe(true)
    await userEvent.tab({ shift: true })
    expect(welcome.contains(document.activeElement)).toBe(true)
    await userEvent.tab()
    expect(welcome.contains(document.activeElement)).toBe(true)
    await userEvent.keyboard('{Control>}k{/Control}')
    expect(screen.queryByRole('combobox', { name: 'Search references' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Not now' }))
    await userEvent.click(screen.getByRole('button', { name: 'Search references' }))
    await userEvent.click(screen.getByRole('option', { name: 'Settings' }))
    await userEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))
    const guide = screen.getByRole('dialog', { name: 'Tutorial introduction' })
    expectContained(guide)
    const exit = screen.getByRole('button', { name: 'Exit tutorial' })
    expect(exit.getBoundingClientRect().height).toBeGreaterThanOrEqual(44)
    await userEvent.tab()
    expect(guide.contains(document.activeElement)).toBe(true)
    await userEvent.keyboard('{Escape}')
    const confirmation = screen.getByRole('dialog', { name: 'Exit tutorial' })
    expectContained(confirmation)
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: 'Tutorial introduction' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Exit tutorial' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, another time' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText(/Nobody is on the board yet/)).toBeTruthy()
    expect(loadSettings().tutorialSuppression).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Search references' }))
    const search = screen.getByRole('combobox', { name: 'Search references' })
    await userEvent.type(search, 'tutorial')
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('dialog', { name: 'Tutorial introduction' })).toBeTruthy()
    await page.viewport(height, width)
    expectContained(screen.getByRole('dialog', { name: 'Tutorial introduction' }))
    await userEvent.click(screen.getByRole('button', { name: 'Exit tutorial' }))
    await userEvent.click(screen.getByRole('button', { name: 'Never show again' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(loadSettings().tutorialSuppression).toBe('dismissed')
  },
)

it.each([
  { width: 375, height: 812 },
  { width: 1180, height: 820 },
  { width: 1440, height: 900 },
])(
  'resumes a deferred welcome after Quick add Escape at $width × $height',
  async ({ width, height }) => {
    await page.viewport(width, height)
    const app = render(
      createElement(
        AuthContext.Provider,
        { value: authState({ loading: true }) },
        createElement(App),
      ),
    )
    if (width <= 1024) {
      await userEvent.click(screen.getByRole('button', { name: 'Add to the encounter' }))
      await userEvent.click(screen.getByRole('menuitem', { name: 'Quick add' }))
    } else {
      await userEvent.click(screen.getByRole('button', { name: 'Quick add' }))
    }
    const name = screen.getByLabelText('Quick add name')
    await userEvent.type(name, 'Uncommitted draft')
    app.rerender(createElement(AuthContext.Provider, { value: authState() }, createElement(App)))
    await screen.findByRole('button', { name: 'Sign in to resume saving' })
    expect(document.activeElement).toBe(name)
    expect(screen.queryByRole('dialog', { name: 'Learn the console' })).toBeNull()
    const recovery = sessionStorage.getItem('openfray:session')
    expect(recovery).not.toBeNull()

    await userEvent.keyboard('{Escape}')

    const welcome = await screen.findByRole('dialog', { name: 'Learn the console' })
    expectContained(welcome)
    await expect.poll(() => welcome.contains(document.activeElement)).toBe(true)
    expect(screen.queryByLabelText('Quick add name')).toBeNull()
    expect(sessionStorage.getItem('openfray:session')).toBe(recovery)
    expect(loadSettings().tutorialSuppression).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(screen.getByText(/Nobody is on the board yet/)).toBeTruthy()
    expect(screen.queryByText('Uncommitted draft')).toBeNull()
    expect(sessionStorage.getItem('openfray:session')).toBe(recovery)
  },
)

it('blocks background focus and pointer actions while the introductory guide is open', async () => {
  await page.viewport(1440, 900)
  render(createElement(App))
  const backgroundSearch = screen.getByRole('button', { name: 'Search references' })
  await screen.findByRole('dialog', { name: 'Learn the console' })
  await userEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))
  const guide = screen.getByRole('dialog', { name: 'Tutorial introduction' })
  backgroundSearch.focus()
  expect(guide.contains(document.activeElement)).toBe(true)
  await userEvent.click(document.body, { position: { x: 10, y: 10 } })
  expect(screen.getByRole('dialog', { name: 'Tutorial introduction' })).toBeTruthy()
  await userEvent.keyboard('{Control>}k{/Control}')
  expect(screen.queryByRole('combobox', { name: 'Search references' })).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Exit tutorial' }))
  await userEvent.click(screen.getByRole('button', { name: 'Return to tutorial' }))
  expect(guide.contains(document.activeElement)).toBe(true)
})
