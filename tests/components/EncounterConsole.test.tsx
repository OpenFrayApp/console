// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

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

// Clear sessionStorage too: the debounced autosave can fire during longer tests and
// would otherwise restore stale combatants/log into the next test's fresh App.
afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

const begin = () => screen.getByRole('button', { name: 'Begin' })

// Begin now opens the Roll Initiative modal; confirm it to actually start combat.
const beginCombat = () => {
  fireEvent.click(begin())
  fireEvent.click(screen.getByRole('button', { name: 'Start combat' }))
}

async function addGoblin() {
  fireEvent.click(screen.getByText('Add creature'))
  await waitFor(() => screen.getByText('Goblin'))
  fireEvent.click(screen.getByText('Goblin'))
}

async function addCreature(name: string) {
  // The picker stays open across picks, so only open it if it isn't already.
  if (!screen.queryByLabelText('Search SRD creatures')) {
    fireEvent.click(screen.getByText('Add creature'))
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

    expect(screen.getAllByText('Goblin').length).toBeGreaterThan(0)
    expect(begin()).toBeEnabled()

    beginCombat()
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
    beginCombat()

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
    // The tracker row and the stat block both have an HP editor; target the stat block.
    const center = container.querySelectorAll('section')[1]
    fireEvent.click(center.querySelector('button[title^="Set HP"]') as HTMLElement)
    const input = center.querySelector('input.w-14') as HTMLInputElement
    fireEvent.change(input, { target: { value: '-3' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getAllByText('4').length).toBeGreaterThan(0) // current HP: 7 - 3
  })

  it('rolls initiative for a combatant added mid-combat', async () => {
    const { container } = render(<App />)
    await addGoblin()
    beginCombat()
    // A reinforcement joins mid-fight — it should roll initiative, not sit at 0. The
    // picker stays open; click its Goblin (scoped, since the tracker also shows one).
    const picker = screen.getByLabelText('Search SRD creatures').parentElement as HTMLElement
    fireEvent.click(within(picker).getByText('Goblin')) // auto-labelled "Goblin 2"
    // Read the new combatant's initiative from its tracker row (the stat block also
    // shows the name, so scope to the left section).
    const tracker = container.querySelector('section') as HTMLElement
    const row = within(tracker).getByText('Goblin 2').closest('[role="button"]') as HTMLElement
    const init = Number(row.querySelector('.w-7')?.textContent)
    expect(init).toBeGreaterThan(0) // Goblin's +2 init mod → d20+2, always ≥ 3
  })

  it('logs a quick roll', () => {
    render(<App />)
    expect(screen.getByText('No rolls yet.')).toBeInTheDocument()
    fireEvent.click(screen.getByText('d20'))
    expect(screen.getByText('1d20')).toBeInTheDocument()
    expect(screen.queryByText('No rolls yet.')).toBeNull()
  })

  it('applies an effect from the modal to a combatant', async () => {
    render(<App />)
    await addGoblin()
    fireEvent.click(screen.getByText('Apply effect'))
    fireEvent.click(screen.getByRole('button', { name: 'Prone' })) // condition chip in the modal
    fireEvent.click(screen.getByRole('button', { name: 'Done' })) // close the modal (stays open for multiple)
    expect(screen.getByRole('button', { name: 'Prone' })).toBeInTheDocument() // badge on the row
  })

  it('surfaces a save-ends effect with its DC and clears it when saved', async () => {
    render(<App />)
    await addGoblin()
    fireEvent.click(screen.getByText('Apply effect'))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Duration'), { target: { value: 'save' } })
    fireEvent.change(within(dialog).getByLabelText('Save DC'), { target: { value: '15' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Frightened' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Done' }))

    // The controls now remind the GM a save is owed, with its ability + DC.
    expect(screen.getByText('Save ends')).toBeInTheDocument()
    expect(screen.getByText(/Frightened.*DEX save DC 15/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Saved — clear' }))
    expect(screen.queryByText('Save ends')).toBeNull()
  })

  it('auto-rolls a monster save-ends effect at the end of its turn', async () => {
    render(<App />)
    await addGoblin()
    fireEvent.click(screen.getByText('Apply effect'))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Duration'), { target: { value: 'save' } })
    fireEvent.change(within(dialog).getByLabelText('Save DC'), { target: { value: '12' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Frightened' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Done' }))

    beginCombat()
    // Ending the goblin's turn rolls its end-of-turn save automatically (logged).
    fireEvent.click(screen.getByRole('button', { name: 'Next turn' }))
    expect(screen.getByText(/Goblin: Frightened \(DEX save\)/)).toBeInTheDocument()
  })

  it('rolls one save for conditions that share it', async () => {
    render(<App />)
    await addGoblin()
    fireEvent.click(screen.getByText('Apply effect'))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Duration'), { target: { value: 'save' } })
    fireEvent.change(within(dialog).getByLabelText('Save DC'), { target: { value: '12' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Frightened' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Restrained' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Done' }))

    // The controls list both conditions on one save-ends line, not two.
    expect(screen.getByText(/Frightened, Restrained — DEX save DC 12/)).toBeInTheDocument()

    beginCombat()
    fireEvent.click(screen.getByRole('button', { name: 'Next turn' }))
    // One combined roll for both, not a separate die each.
    expect(screen.getByText(/Goblin: Frightened, Restrained \(DEX save\)/)).toBeInTheDocument()
  })
})
