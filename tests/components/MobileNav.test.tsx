// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MobileNav } from '../../src/components/MobileNav.tsx'

afterEach(cleanup)

describe('MobileNav', () => {
  it('shows the four tabs and marks the active one', () => {
    render(<MobileNav active="stat-block" onSelect={vi.fn()} />)
    for (const label of ['Tracker', 'Stat block', 'Controls', 'Compendium']) {
      expect(screen.getByText(label)).toBeTruthy()
    }
    expect(screen.getByText('Stat block').closest('button')?.getAttribute('aria-current')).toBe(
      'page',
    )
    expect(screen.getByText('Tracker').closest('button')?.getAttribute('aria-current')).toBeNull()
  })

  it('reports the tapped tab', () => {
    const onSelect = vi.fn()
    render(<MobileNav active="tracker" onSelect={onSelect} />)
    fireEvent.click(screen.getByText('Compendium'))
    expect(onSelect).toHaveBeenCalledWith('compendium')
    fireEvent.click(screen.getByText('Controls'))
    expect(onSelect).toHaveBeenCalledWith('controls')
  })
})
