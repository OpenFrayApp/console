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
