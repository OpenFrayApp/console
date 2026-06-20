// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

vi.mock('../../src/compendium/srd.ts', () => ({
  loadSrdCreatures: () =>
    Promise.resolve([
      {
        id: 'c1',
        name: 'Goblin',
        source: 'srd-5.2',
        size: 'Small',
        type: 'humanoid',
        ac: 15,
        maxHp: 10,
        speed: { walk: 30 },
        abilities: { str: 8, dex: 15, con: 10, int: 10, wis: 8, cha: 8 },
        senses: { passivePerception: 9 },
        cr: 0.25,
        actions: [],
      },
      {
        id: 'c2',
        name: 'Aboleth',
        source: 'srd-5.2',
        size: 'Large',
        type: 'aberration',
        ac: 17,
        maxHp: 150,
        speed: { walk: 10 },
        abilities: { str: 21, dex: 9, con: 15, int: 18, wis: 15, cha: 18 },
        senses: { passivePerception: 20 },
        cr: 10,
        actions: [],
      },
    ]),
  loadSrdSpells: () =>
    Promise.resolve([
      {
        id: 's1',
        name: 'Fireball',
        source: 'srd-5.2',
        level: 3,
        school: 'Evocation',
        castingTime: 'action',
        range: '150 feet',
        components: { verbal: true, somatic: true, material: true },
        duration: 'instantaneous',
        concentration: false,
        ritual: false,
        text: 'boom',
      },
    ]),
}))

const { Compendium } = await import('../../src/components/Compendium.tsx')

afterEach(cleanup)

describe('Compendium', () => {
  it('lists creatures and filters by search', async () => {
    render(<Compendium />)
    await waitFor(() => expect(screen.getByText('Aboleth')).toBeInTheDocument())
    expect(screen.getByText('Goblin')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Search creatures'), {
      target: { value: 'gob' },
    })
    expect(screen.queryByText('Aboleth')).toBeNull()
    expect(screen.getByText('Goblin')).toBeInTheDocument()
  })

  it('shows a stat block when a creature is selected', async () => {
    render(<Compendium />)
    await waitFor(() => screen.getByText('Aboleth'))
    fireEvent.click(screen.getByText('Aboleth'))
    expect(screen.getByText(/Large aberration · CR 10/)).toBeInTheDocument()
  })

  it('switches to the spells tab and opens a spell', async () => {
    render(<Compendium />)
    await waitFor(() => screen.getByText('Goblin'))
    fireEvent.click(screen.getByText('Spells'))
    await waitFor(() => screen.getByText('Fireball'))
    fireEvent.click(screen.getByText('Fireball'))
    expect(screen.getByText('3rd-level Evocation')).toBeInTheDocument()
  })
})
