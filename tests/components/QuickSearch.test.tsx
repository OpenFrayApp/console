// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { RosterPc } from '../../src/schema/roster.ts'
import type { Combatant } from '../../src/schema/combatant.ts'
import { loadLibraries } from '../../src/compendium/srd.ts'
import { QuickSearch } from '../../src/components/search/QuickSearch.tsx'
import { creature, monster, spell } from '../fixtures.ts'

vi.mock('../../src/compendium/srd.ts', () => ({
  loadLibraries: vi.fn(async () => ({ creatures: [creature()], spells: [spell()] })),
}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

/** Render the search with observable encounter actions. */
function setup(combatants: Combatant[] = [], characters: RosterPc[] = []) {
  const onClose = vi.fn(),
    onAddCreature = vi.fn(),
    onAddCharacter = vi.fn(),
    onNote = vi.fn(),
    dispatch = vi.fn()
  render(
    <QuickSearch
      enabledLibraries={['srd-5.2']}
      showHomebrew
      customCreatures={[]}
      customSpells={[]}
      characters={characters}
      combatants={combatants}
      dispatch={dispatch}
      onRoll={vi.fn()}
      onNote={onNote}
      onClose={onClose}
      onAddCreature={onAddCreature}
      onAddCharacter={onAddCharacter}
    />,
  )
  return { onClose, onAddCreature, onAddCharacter, onNote, dispatch }
}

it('opens a creature with the keyboard and only adds it on explicit action', async () => {
  const actions = setup()
  const input = screen.getByRole('combobox', { name: 'Search references' })
  expect(document.activeElement).toBe(input)
  fireEvent.change(input, { target: { value: 'gob' } })
  await screen.findByRole('option', { name: /Goblin/ })
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(screen.queryByRole('combobox')).toBeNull()
  expect(actions.onAddCreature).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Add creature' }))
  expect(actions.onAddCreature).toHaveBeenCalledOnce()
  expect(actions.onClose).toHaveBeenCalledOnce()
})

it('casts only after confirmation and lets the GM choose a caster', async () => {
  const actions = setup([monster()])
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'fire' } })
  fireEvent.click(await screen.findByRole('option', { name: /Fireball/ }))
  expect(actions.onNote).not.toHaveBeenCalled()
  expect(actions.dispatch).not.toHaveBeenCalled()
  fireEvent.change(screen.getByRole('combobox', { name: 'Caster' }), { target: { value: 'g1' } })
  fireEvent.click(screen.getByRole('button', { name: 'Cast' }))
  expect(actions.onNote).toHaveBeenCalledWith('Goblin (A) casts Fireball', 'cast')
  expect(screen.getAllByRole('dialog')).toHaveLength(1)
  expect(actions.onClose).not.toHaveBeenCalled()
})

it('shows a saved character at full health and adds it only on request', async () => {
  const character = { id: 'pc:thalia', name: 'Thalia', ac: 16, maxHp: 30 }
  const actions = setup([], [character])
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'thalia' } })
  fireEvent.click(await screen.findByRole('option', { name: /Thalia/ }))
  expect(actions.onAddCharacter).not.toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Add to encounter' }))
  expect(actions.onAddCharacter).toHaveBeenCalledWith(character)
  expect(actions.onClose).toHaveBeenCalledOnce()
})

it('keeps tab focus inside search and restores it when unmounted', () => {
  const trigger = document.createElement('button')
  document.body.appendChild(trigger)
  trigger.focus()
  setup()
  const input = screen.getByRole('combobox')
  fireEvent.keyDown(input, { key: 'Tab' })
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))
  fireEvent.keyDown(document.activeElement!, { key: 'Tab', shiftKey: true })
  expect(document.activeElement).toBe(input)
  cleanup()
  expect(document.activeElement).toBe(trigger)
  trigger.remove()
})

it('shows a condition without an apply action', async () => {
  const actions = setup()
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'prone' } })
  fireEvent.click(await screen.findByRole('option', { name: /Prone/ }))
  expect(screen.getByText(/Restricted Movement/)).toBeTruthy()
  expect(screen.queryByRole('button', { name: /Apply/ })).toBeNull()
  expect(actions.dispatch).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  expect(actions.onClose).toHaveBeenCalledOnce()
})

it('reports a failed library load and lets the GM retry', async () => {
  vi.mocked(loadLibraries).mockRejectedValueOnce(new Error('offline'))
  setup()
  await screen.findByRole('alert')
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'goblin' } })
  expect(await screen.findByRole('option', { name: /Goblin/ })).toBeTruthy()
  expect(screen.queryByRole('alert')).toBeNull()
})

it('opens a spell as reference without logging, concentration, or casting in an empty encounter', async () => {
  const actions = setup()
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'fire' } })
  fireEvent.click(await screen.findByRole('option', { name: /Fireball/ }))
  expect(screen.getByRole('button', { name: 'Cast' }).hasAttribute('disabled')).toBe(true)
  expect(actions.onNote).not.toHaveBeenCalled()
  expect(actions.dispatch).not.toHaveBeenCalled()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(actions.onClose).toHaveBeenCalledOnce()
})
