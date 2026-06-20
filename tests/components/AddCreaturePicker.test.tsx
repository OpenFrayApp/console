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

const { AddCreaturePicker } = await import('../../src/components/AddCreaturePicker.tsx')

afterEach(cleanup)

describe('AddCreaturePicker', () => {
  it('opens, searches, and picks a creature', async () => {
    const onPick = vi.fn()
    render(<AddCreaturePicker onPick={onPick} />)

    fireEvent.click(screen.getByText('Add creature'))
    await waitFor(() => screen.getByText('Goblin'))
    fireEvent.change(screen.getByLabelText('Search SRD creatures'), {
      target: { value: 'gob' },
    })
    fireEvent.click(screen.getByText('Goblin'))

    expect(onPick).toHaveBeenCalledOnce()
    expect(onPick.mock.calls[0][0].name).toBe('Goblin')
  })
})
