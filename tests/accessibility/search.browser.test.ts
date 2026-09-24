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
