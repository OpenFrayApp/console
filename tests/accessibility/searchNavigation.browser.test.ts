// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { cleanup, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import type { User } from '@supabase/supabase-js'
import { afterEach, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import App from '../../src/App.tsx'
import { AuthContext } from '../../src/auth/useAuth.ts'
import { authState } from '../fixtures.ts'
import '../../src/index.css'

vi.mock('../../src/lib/supabase.ts', () => ({ supabase: null }))

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  localStorage.clear()
})

it.each([
  { width: 375, height: 812, labelVisible: false },
  { width: 820, height: 1180, labelVisible: false },
  { width: 1180, height: 820, labelVisible: false },
  { width: 1279, height: 900, labelVisible: false },
  { width: 1280, height: 900, labelVisible: true },
  { width: 1800, height: 1000, labelVisible: true },
  { width: 1280, height: 500, labelVisible: false },
])(
  'uses the shell search presentation at $width × $height',
  async ({ width, height, labelVisible }) => {
    await page.viewport(width, height)
    render(createElement(App))
    const trigger = screen.getByRole('button', { name: 'Search references' })
    const label = screen.getByText('Search', { selector: 'span' })
    expect(getComputedStyle(label).display !== 'none').toBe(labelVisible)
    const hint = trigger.querySelector('kbd')
    expect(hint).not.toBeNull()
    expect(getComputedStyle(hint!).display !== 'none').toBe(labelVisible)
    if (width === 1180) {
      const add = screen.getByRole('button', { name: 'Add creature' })
      const searchBox = trigger.getBoundingClientRect()
      const addBox = add.getBoundingClientRect()
      expect(searchBox.top + searchBox.height / 2).toBe(addBox.top + addBox.height / 2)
    }
    await userEvent.click(trigger)
    expect(screen.getByRole('combobox', { name: 'Search references' })).toBeTruthy()
    await userEvent.keyboard('{Escape}')
    expect(document.activeElement).toBe(trigger)
  },
)

it.each([
  { destination: 'Settings', dialog: 'Settings', close: 'Done', signedIn: false },
  { destination: 'Player view', dialog: 'Player view', close: null, signedIn: false },
  { destination: 'Profile', dialog: 'Account', close: 'Done', signedIn: true },
  { destination: 'Shared links', dialog: 'Shared links', close: 'Done', signedIn: true },
  { destination: 'Sign in', dialog: 'Sign in', close: 'Back to the console', signedIn: false },
])(
  'contains and restores focus after navigating to $destination',
  async ({ destination, dialog, close, signedIn }) => {
    await page.viewport(1440, 900)
    render(
      createElement(
        AuthContext.Provider,
        {
          value: authState({
            user: signedIn ? ({ id: 'search-owner', email: 'gm@example.com' } as User) : null,
          }),
        },
        createElement(App),
      ),
    )
    const trigger = screen.getByRole('button', { name: 'Search references' })
    await userEvent.click(trigger)
    await userEvent.click(screen.getByRole('option', { name: destination }))
    const panel = screen.getByRole('dialog', { name: dialog })
    await expect.poll(() => panel.contains(document.activeElement)).toBe(true)
    const first = document.activeElement
    await userEvent.tab({ shift: true })
    expect(panel.contains(document.activeElement)).toBe(true)
    await userEvent.tab()
    expect(document.activeElement).toBe(first)
    if (close) await userEvent.click(screen.getByRole('button', { name: close }))
    else await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  },
)
