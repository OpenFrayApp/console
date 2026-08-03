// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { Theme } from '../../src/state/persistence.ts'
import { SettingsMenu } from '../../src/components/SettingsMenu.tsx'

afterEach(cleanup)

/** Render the menu, optionally already open. */
function menu({ theme = 'dark' as Theme, open = true } = {}) {
  const onToggleTheme = vi.fn()
  const onOpenSettings = vi.fn()
  render(
    <SettingsMenu theme={theme} onToggleTheme={onToggleTheme} onOpenSettings={onOpenSettings} />,
  )
  if (open) fireEvent.click(screen.getByRole('button', { name: 'Settings and more' }))
  return { onToggleTheme, onOpenSettings }
}

describe('SettingsMenu', () => {
  it('keeps the header to one button, with everything behind it', () => {
    menu({ open: false })
    expect(screen.queryByText('Settings')).toBeNull()
    expect(screen.queryByText('Handbook')).toBeNull()
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('opens the four items', () => {
    menu()
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Light mode')).toBeInTheDocument()
    expect(screen.getByText('Handbook')).toBeInTheDocument()
    expect(screen.getByText('Report a bug')).toBeInTheDocument()
  })

  it('opens the settings panel and gets out of the way', () => {
    const { onOpenSettings } = menu()
    fireEvent.click(screen.getByText('Settings'))
    expect(onOpenSettings).toHaveBeenCalled()
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('names the theme it would switch to, not the one in use', () => {
    menu({ theme: 'dark' })
    expect(screen.getByText('Light mode')).toBeInTheDocument()
    cleanup()
    menu({ theme: 'light' })
    expect(screen.getByText('Dark mode')).toBeInTheDocument()
  })

  // The whole app changes colour, so leaving the row there lets the GM change their
  // mind without hunting for the gear again.
  it('switches the theme and stays open', () => {
    const { onToggleTheme } = menu()
    fireEvent.click(screen.getByText('Light mode'))
    expect(onToggleTheme).toHaveBeenCalled()
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('opens the handbook in its own tab, so the fight is not navigated away from', () => {
    menu()
    const link = screen.getByText('Handbook').closest('a')
    expect(link).toHaveAttribute('href', '/docs/')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('sends a bug report to a fresh GitHub issue, in its own tab', () => {
    menu()
    const link = screen.getByText('Report a bug').closest('a')
    expect(link).toHaveAttribute('href', 'https://github.com/SirDarcanos/openfray/issues/new')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('closes on Escape', () => {
    menu()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
  })
})
