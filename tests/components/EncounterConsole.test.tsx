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

  it('applies damage through the controls', async () => {
    render(<App />)
    await addGoblin()
    fireEvent.change(screen.getByLabelText(/HP amount/), { target: { value: '3' } })
    fireEvent.click(screen.getByText('Damage'))
    expect(screen.getByText('4/7')).toBeInTheDocument() // 7 - 3
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
