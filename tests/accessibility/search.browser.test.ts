// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { cleanup, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { QuickSearch } from '../../src/components/search/QuickSearch.tsx'
import { monster, spell } from '../fixtures.ts'
import '../../src/index.css'

afterEach(cleanup)

it('tabs through a character’s collapsible reference and keeps focus inside', async () => {
  await page.viewport(820, 1180)
  render(
    createElement(QuickSearch, {
      enabledLibraries: [],
      showHomebrew: true,
      customCreatures: [],
      customSpells: [],
      characters: [
        {
          id: 'thalia',
          name: 'Thalia',
          maxHp: 30,
          ac: 16,
          backstory: '[Notes](https://example.com)',
        },
      ],
      combatants: [],
      dispatch: vi.fn(),
      onRoll: vi.fn(),
      onNote: vi.fn(),
      onClose: vi.fn(),
      onAddCreature: vi.fn(),
      onAddCharacter: vi.fn(),
    }),
  )
  await userEvent.tab()
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))
  await userEvent.tab()
  expect(document.activeElement).toBe(screen.getByRole('combobox'))
  await userEvent.fill(screen.getByRole('combobox'), 'thalia')
  await userEvent.keyboard('{Enter}')
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))
  await userEvent.tab()
  expect(document.activeElement).toBe(screen.getByText('Backstory & Goals'))
  await userEvent.tab()
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Add to encounter' }))
  await userEvent.tab()
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))
  await userEvent.tab()
  await userEvent.keyboard('{Enter}')
  await userEvent.tab()
  expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Notes' }))
})

it('scrolls to matches beyond the first ten while keeping the search field visible', async () => {
  await page.viewport(390, 844)
  render(
    createElement(QuickSearch, {
      enabledLibraries: [],
      showHomebrew: true,
      customCreatures: [],
      customSpells: Array.from({ length: 30 }, (_, i) =>
        spell({ id: `custom:${i}`, name: `Reference ${String(i + 1).padStart(2, '0')}` }),
      ),
      characters: [],
      combatants: [],
      dispatch: vi.fn(),
      onRoll: vi.fn(),
      onNote: vi.fn(),
      onClose: vi.fn(),
      onAddCreature: vi.fn(),
      onAddCharacter: vi.fn(),
    }),
  )
  const input = screen.getByRole('combobox')
  await userEvent.fill(input, 'Reference')
  expect(screen.getAllByRole('option')).toHaveLength(30)
  const list = screen.getByRole('listbox')
  expect(list.scrollHeight).toBeGreaterThan(list.clientHeight)
  await userEvent.keyboard('{ArrowUp}')
  const last = screen.getByRole('option', { name: /Reference 30/ })
  expect(input).toHaveAttribute('aria-activedescendant', last.id)
  await expect
    .poll(() => {
      const row = last.getBoundingClientRect(),
        box = list.getBoundingClientRect()
      return row.top >= box.top && row.bottom <= box.bottom + 1
    })
    .toBe(true)
  expect(input.getBoundingClientRect().top).toBeGreaterThanOrEqual(0)
  expect(screen.queryByText(/Refine your search/)).toBeNull()
})

it('keeps focus in the casting dialog after explicit confirmation', async () => {
  const onNote = vi.fn()
  render(
    createElement(QuickSearch, {
      enabledLibraries: [],
      showHomebrew: true,
      customCreatures: [],
      customSpells: [spell({ id: 'custom:light', name: 'Light' })],
      characters: [],
      combatants: [monster()],
      defaultCasterId: 'g1',
      dispatch: vi.fn(),
      onRoll: vi.fn(),
      onNote,
      onClose: vi.fn(),
      onAddCreature: vi.fn(),
      onAddCharacter: vi.fn(),
    }),
  )
  await userEvent.fill(screen.getByRole('combobox'), 'light')
  await userEvent.keyboard('{Enter}')
  expect(onNote).not.toHaveBeenCalled()
  expect(screen.getByRole('combobox', { name: 'Caster' })).toHaveValue('g1')
  await userEvent.click(screen.getByRole('button', { name: 'Cast' }))
  expect(onNote).toHaveBeenCalledWith('Goblin (A) casts Light', 'cast')
  await expect.poll(() => screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
})
