// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

vi.mock('../../src/compendium/srd.ts', () => ({
  loadSrdCreatures: () =>
    Promise.resolve([
      {
        id: 'srd-5.2:goblin',
        name: 'Goblin',
        source: 'srd-5.2',
        size: 'Small',
        type: 'humanoid',
        ac: 15,
        maxHp: 7,
        speed: { walk: 30 },
        abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
        senses: { passivePerception: 9 },
        cr: 0.25,
      },
      {
        id: 'srd-5.2:ogre',
        name: 'Ogre',
        source: 'srd-5.2',
        size: 'Large',
        type: 'giant',
        ac: 11,
        maxHp: 59,
        speed: { walk: 40 },
        abilities: { str: 19, dex: 8, con: 16, int: 5, wis: 7, cha: 7 },
        senses: { passivePerception: 8 },
        cr: 2,
      },
    ]),
  loadSrdSpells: () => Promise.resolve([]),
}))

// The encounter flow spans the header toolbar (App) and the console body.
const { default: App } = await import('../../src/App.tsx')

afterEach(cleanup)

const begin = () => screen.getByRole('button', { name: 'Begin' })

async function addGoblin() {
  fireEvent.click(screen.getByText('+ Add creature'))
  await waitFor(() => screen.getByText('Goblin'))
  fireEvent.click(screen.getByText('Goblin'))
}

async function addCreature(name: string) {
  // The picker stays open across picks, so only open it if it isn't already.
  if (!screen.queryByLabelText('Search SRD creatures')) {
    fireEvent.click(screen.getByText('+ Add creature'))
  }
  await waitFor(() => screen.getByText(name))
  fireEvent.click(screen.getByText(name))
}

describe('Encounter flow', () => {
  it('starts empty with Begin disabled', () => {
    render(<App />)
    expect(screen.getByText(/Add creatures to build the encounter/)).toBeInTheDocument()
    expect(begin()).toBeDisabled()
  })

  it('adds a creature and runs the playback controls', async () => {
    render(<App />)
    await addGoblin()

    // The goblin appears in the tracker row and the center stat block.
    expect(screen.getAllByText('Goblin').length).toBeGreaterThan(0)
    expect(begin()).toBeEnabled()

    fireEvent.click(begin())
    expect(screen.getByText('Round 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next turn' })).toBeInTheDocument()

    // Pause holds (resumable), then Stop resets to setup.
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
    expect(begin()).toBeInTheDocument()
  })

  it('Next turn moves the selection to the active combatant', async () => {
    const { container } = render(<App />)
    await addCreature('Goblin')
    await addCreature('Ogre')
    fireEvent.click(begin())

    // The center section's stat-block heading reflects the active combatant.
    const centerName = () =>
      container.querySelectorAll('section')[1]?.querySelector('h3')?.textContent
    const before = centerName()
    fireEvent.click(screen.getByRole('button', { name: 'Next turn' }))
    const after = centerName()

    expect(before).not.toBe(after)
    expect([before, after].sort()).toEqual(['Goblin', 'Ogre'])
  })

  it('edits HP by clicking it in the stat block (+N / -N / set)', async () => {
    const { container } = render(<App />)
    await addGoblin()
    // Click the HP widget, type a delta, commit with Enter.
    fireEvent.click(screen.getByTitle(/Set HP/))
    const input = container.querySelector('input.w-14') as HTMLInputElement
    fireEvent.change(input, { target: { value: '-3' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getAllByText('4/7').length).toBeGreaterThan(0) // 7 - 3
  })

  it('logs a quick roll', () => {
    render(<App />)
    expect(screen.getByText('No rolls yet.')).toBeInTheDocument()
    fireEvent.click(screen.getByText('d20'))
    expect(screen.getByText('1d20')).toBeInTheDocument()
    expect(screen.queryByText('No rolls yet.')).toBeNull()
  })

  it('applies an effect from the picker to a combatant', async () => {
    render(<App />)
    await addGoblin()
    fireEvent.click(screen.getByText('+ Effect'))
    fireEvent.click(screen.getByText('Prone'))
    expect(screen.getByRole('button', { name: 'Prone' })).toBeInTheDocument() // badge on the row
  })
})
