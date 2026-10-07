// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { cleanup, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'
import App from '../../src/App.tsx'
import { loadSettings, saveSettings } from '../../src/state/settings.ts'
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

it.each(
  [
    { width: 375, height: 812 },
    { width: 1180, height: 820 },
    { width: 1440, height: 900 },
  ].flatMap((viewport) =>
    [
      { control: 'Quick add', field: 'Quick add name' },
      { control: 'Add PC', field: 'PC name' },
      { control: 'Add creature', field: 'Search creatures' },
    ].flatMap((surface) =>
      ['Escape', 'trigger', 'pointer trigger', 'outside'].map((route) => ({
        ...viewport,
        ...surface,
        route,
      })),
    ),
  ),
)(
  'resumes a deferred welcome after $route cancels $control at $width × $height',
  async ({ width, height, control, field, route }) => {
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
      await userEvent.click(screen.getByRole('menuitem', { name: control }))
    } else {
      await userEvent.click(screen.getByRole('button', { name: control }))
    }
    const name = screen.getByLabelText(field)
    await userEvent.type(name, 'Uncommitted draft')
    app.rerender(createElement(AuthContext.Provider, { value: authState() }, createElement(App)))
    await screen.findByRole('button', { name: 'Sign in to resume saving' })
    expect(document.activeElement).toBe(name)
    expect(screen.queryByRole('dialog', { name: 'Learn the console' })).toBeNull()
    const recovery = sessionStorage.getItem('openfray:session')
    expect(recovery).not.toBeNull()

    if (route === 'Escape') await userEvent.keyboard('{Escape}')
    else if (route === 'outside') await userEvent.click(document.body, { position: { x: 5, y: 5 } })
    else {
      const trigger = screen.getByRole('button', {
        name: width <= 1024 ? 'Add to the encounter' : control,
      })
      if (route === 'pointer trigger') await userEvent.click(trigger)
      else {
        await userEvent.tab({ shift: true })
        expect(document.activeElement).toBe(trigger)
        await userEvent.keyboard('{Enter}')
      }
    }

    const welcome = await screen.findByRole('dialog', { name: 'Learn the console' })
    expectContained(welcome)
    await expect.poll(() => welcome.contains(document.activeElement)).toBe(true)
    expect(screen.queryByLabelText(field)).toBeNull()
    expect(screen.queryByRole('menu')).toBeNull()
    expect(sessionStorage.getItem('openfray:session')).toBe(recovery)
    expect(loadSettings().tutorialSuppression).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(screen.getByText(/Nobody is on the board yet/)).toBeTruthy()
    expect(screen.queryByText('Uncommitted draft')).toBeNull()
    expect(sessionStorage.getItem('openfray:session')).toBe(recovery)
  },
)

it('keeps swipe Add trigger cancellation closed when invitations are suppressed', async () => {
  await page.viewport(375, 812)
  await touchCommands.emulateTouch(true)
  saveSettings({ tutorialSuppression: 'completed' })
  render(createElement(App))
  await screen.findByRole('button', { name: 'Sign in to resume saving' })
  const trigger = screen.getByRole('button', { name: 'Add to the encounter' })
  await userEvent.click(trigger)
  await userEvent.click(screen.getByRole('menuitem', { name: 'Quick add' }))
  await userEvent.type(screen.getByLabelText('Quick add name'), 'Uncommitted draft')
  const recovery = sessionStorage.getItem('openfray:session')

  await userEvent.click(trigger)

  expect(screen.queryByLabelText('Quick add name')).toBeNull()
  expect(screen.queryByRole('menu')).toBeNull()
  expect(trigger.getAttribute('aria-expanded')).toBe('false')
  expect(screen.queryByRole('dialog', { name: 'Learn the console' })).toBeNull()
  expect(sessionStorage.getItem('openfray:session')).toBe(recovery)
  await userEvent.click(trigger)
  expect(screen.getByRole('menuitem', { name: 'Quick add' })).toBeTruthy()
})

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
