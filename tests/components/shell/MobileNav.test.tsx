// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MobileNav } from '../../../src/components/shell/MobileNav.tsx'

afterEach(cleanup)

describe('MobileNav', () => {
  it('reports each tab selection and moves the accessible active marker', () => {
    const onSelect = vi.fn()
    const { rerender } = render(<MobileNav active="stat-block" onSelect={onSelect} />)
    const statBlock = screen.getByRole('button', { name: 'Stat block' })
    expect(statBlock).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Tracker' })).not.toHaveAttribute('aria-current')

    for (const [label, tab] of [
      ['Tracker', 'tracker'],
      ['Stat block', 'stat-block'],
      ['Controls', 'controls'],
      ['Compendium', 'compendium'],
    ]) {
      onSelect.mockClear()
      fireEvent.click(screen.getByRole('button', { name: label }))
      expect(onSelect).toHaveBeenCalledExactlyOnceWith(tab)
    }

    rerender(<MobileNav active="compendium" onSelect={onSelect} />)
    expect(screen.getByRole('button', { name: 'Compendium' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(statBlock).not.toHaveAttribute('aria-current')
  })
})
