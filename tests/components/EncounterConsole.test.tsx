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

const { EncounterConsole } = await import('../../src/components/EncounterConsole.tsx')

afterEach(cleanup)

async function addGoblin() {
  fireEvent.click(screen.getByText('+ Add creature'))
  await waitFor(() => screen.getByText('Goblin'))
  fireEvent.click(screen.getByText('Goblin'))
}

describe('EncounterConsole', () => {
  it('starts empty with Begin disabled', () => {
    render(<EncounterConsole />)
    expect(screen.getByText(/Add creatures to build the encounter/)).toBeInTheDocument()
    expect(screen.getByText('Begin')).toBeDisabled()
  })

  it('adds a creature from the compendium and begins the encounter', async () => {
    render(<EncounterConsole />)
    await addGoblin()

    // The combatant row now shows the goblin (the picker has closed).
    expect(screen.getByText('Goblin')).toBeInTheDocument()
    expect(screen.getByText('Begin')).toBeEnabled()

    fireEvent.click(screen.getByText('Begin'))
    expect(screen.getByText('Round 1')).toBeInTheDocument()
    expect(screen.getByText('Next turn')).toBeInTheDocument()
  })

  it('applies damage through the controls', async () => {
    render(<EncounterConsole />)
    await addGoblin()
    fireEvent.change(screen.getByLabelText(/HP amount/), { target: { value: '3' } })
    fireEvent.click(screen.getByText('Damage'))
    expect(screen.getByText('4/7')).toBeInTheDocument() // 7 - 3
  })

  it('logs a quick roll', () => {
    render(<EncounterConsole />)
    expect(screen.getByText('No rolls yet.')).toBeInTheDocument()
    fireEvent.click(screen.getByText('d20'))
    expect(screen.getByText('1d20')).toBeInTheDocument()
    expect(screen.queryByText('No rolls yet.')).toBeNull()
  })
})
