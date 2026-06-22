// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

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
    render(<Compendium onCreateCreature={() => {}} />)
    await waitFor(() => expect(screen.getByText('Aboleth')).toBeInTheDocument())
    expect(screen.getByText('Goblin')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Search creatures'), {
      target: { value: 'gob' },
    })
    expect(screen.queryByText('Aboleth')).toBeNull()
    expect(screen.getByText('Goblin')).toBeInTheDocument()
  })

  it('shows a stat block when a creature is selected', async () => {
    render(<Compendium onCreateCreature={() => {}} />)
    await waitFor(() => screen.getByText('Aboleth'))
    fireEvent.click(screen.getByText('Aboleth'))
    expect(screen.getByText(/Large aberration · CR 10/)).toBeInTheDocument()
  })

  it('switches to the spells tab and opens a spell', async () => {
    render(<Compendium onCreateCreature={() => {}} />)
    await waitFor(() => screen.getByText('Goblin'))
    fireEvent.click(screen.getByText('Spells'))
    await waitFor(() => screen.getByText('Fireball'))
    fireEvent.click(screen.getByText('Fireball'))
    expect(screen.getByText('3rd-level Evocation')).toBeInTheDocument()
  })

  it('lists and searches campaigns, and creates one through the modal', async () => {
    const onCreateCampaign = vi.fn()
    render(
      <Compendium
        onCreateCreature={() => {}}
        campaigns={[
          { id: 'c1', name: 'Curse of Strahd', edition: '5.5' },
          { id: 'c2', name: 'Tomb of Annihilation', edition: '5.0' },
        ]}
        onCreateCampaign={onCreateCampaign}
      />,
    )
    await waitFor(() => screen.getByText('Goblin'))
    fireEvent.click(screen.getByText('Campaigns'))
    expect(screen.getByText('Curse of Strahd')).toBeInTheDocument()
    expect(screen.getByText('Tomb of Annihilation')).toBeInTheDocument()

    // The shared search box filters the campaign list, like the other tabs.
    fireEvent.change(screen.getByLabelText('Search campaigns'), { target: { value: 'strahd' } })
    expect(screen.getByText('Curse of Strahd')).toBeInTheDocument()
    expect(screen.queryByText('Tomb of Annihilation')).toBeNull()

    // No sidebar "New campaign" button; create opens a modal from the empty state.
    expect(screen.queryByRole('button', { name: 'New campaign' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Create campaign' }))
    const dialog = screen.getByRole('dialog', { name: 'New campaign' })
    fireEvent.change(within(dialog).getByLabelText('Campaign name'), {
      target: { value: 'Out of the Abyss' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create campaign' }))

    expect(onCreateCampaign).toHaveBeenCalledTimes(1)
    expect(onCreateCampaign.mock.calls[0][0].name).toBe('Out of the Abyss')
  })

  it('views a campaign read-only and edits it from the source row', async () => {
    const onUpdateCampaign = vi.fn()
    render(
      <Compendium
        onCreateCreature={() => {}}
        campaigns={[{ id: 'c1', name: 'Curse of Strahd', edition: '5.5' }]}
        onUpdateCampaign={onUpdateCampaign}
      />,
    )
    await waitFor(() => screen.getByText('Goblin'))
    fireEvent.click(screen.getByText('Campaigns'))

    // Clicking the campaign shows the read-only card (no form fields yet).
    fireEvent.click(screen.getByRole('button', { name: /Curse of Strahd/ }))
    expect(screen.getByText('DnD 5.5 (2024)')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()

    // Edit in the source row reopens the modal, prefilled.
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit campaign' })
    fireEvent.change(within(dialog).getByLabelText('Campaign name'), {
      target: { value: 'Curse of Strahd (revised)' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(onUpdateCampaign).toHaveBeenCalledTimes(1)
    expect(onUpdateCampaign.mock.calls[0][0]).toMatchObject({
      id: 'c1',
      name: 'Curse of Strahd (revised)',
    })
  })

  it('deletes a campaign from the source row', async () => {
    const onDeleteCampaign = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(
      <Compendium
        onCreateCreature={() => {}}
        campaigns={[{ id: 'c1', name: 'Curse of Strahd', edition: '5.5' }]}
        onDeleteCampaign={onDeleteCampaign}
      />,
    )
    await waitFor(() => screen.getByText('Goblin'))
    fireEvent.click(screen.getByText('Campaigns'))
    fireEvent.click(screen.getByRole('button', { name: /Curse of Strahd/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onDeleteCampaign).toHaveBeenCalledWith('c1')
    vi.restoreAllMocks()
  })

  it('lists roster PCs and creates one through the modal', async () => {
    const onCreatePc = vi.fn()
    render(
      <Compendium
        onCreateCreature={() => {}}
        campaigns={[{ id: 'camp-1', name: 'Curse of Strahd', edition: '5.5' }]}
        rosterPcs={[{ id: 'p1', name: 'Thalia', ac: 16, maxHp: 38 }]}
        onCreatePc={onCreatePc}
      />,
    )
    await waitFor(() => screen.getByText('Goblin'))
    fireEvent.click(screen.getByText('Characters'))
    expect(screen.getByText('Thalia')).toBeInTheDocument()

    // The shared search box filters the roster too.
    fireEvent.change(screen.getByLabelText('Search characters'), { target: { value: 'zzz' } })
    expect(screen.queryByText('Thalia')).toBeNull()
    fireEvent.change(screen.getByLabelText('Search characters'), { target: { value: '' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add player character' }))
    const dialog = screen.getByRole('dialog', { name: 'New player character' })
    fireEvent.change(within(dialog).getByLabelText('PC name'), { target: { value: 'Grog' } })
    // The campaign dropdown is populated from the user's campaigns.
    expect(within(dialog).getByRole('option', { name: 'Curse of Strahd' })).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create PC' }))

    expect(onCreatePc).toHaveBeenCalledTimes(1)
    expect(onCreatePc.mock.calls[0][0].name).toBe('Grog')
  })

  it('adds a roster PC to the encounter, edits, and deletes it from the card', async () => {
    const onAddPcToEncounter = vi.fn()
    const onUpdatePc = vi.fn()
    const onDeletePc = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(
      <Compendium
        onCreateCreature={() => {}}
        rosterPcs={[{ id: 'p1', name: 'Thalia', ac: 16, maxHp: 38 }]}
        onAddPcToEncounter={onAddPcToEncounter}
        onUpdatePc={onUpdatePc}
        onDeletePc={onDeletePc}
      />,
    )
    await waitFor(() => screen.getByText('Goblin'))
    fireEvent.click(screen.getByText('Characters'))
    fireEvent.click(screen.getByRole('button', { name: /Thalia/ }))

    fireEvent.click(screen.getByRole('button', { name: 'Add to encounter' }))
    expect(onAddPcToEncounter).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }))

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit player character' })
    fireEvent.change(within(dialog).getByLabelText('PC name'), { target: { value: 'Thalia II' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(onUpdatePc.mock.calls[0][0]).toMatchObject({ id: 'p1', name: 'Thalia II' })

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDeletePc).toHaveBeenCalledWith('p1')
    vi.restoreAllMocks()
  })

  it('gates the players tab for anonymous users', async () => {
    const onGated = vi.fn()
    render(<Compendium onCreateCreature={() => {}} createGated onGated={onGated} />)
    await waitFor(() => screen.getByText('Goblin'))
    fireEvent.click(screen.getByText('Characters'))
    expect(screen.getByText(/Sign in to build and reuse a party roster/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(onGated).toHaveBeenCalled()
  })

  it('prompts sign-in on the campaigns tab when gated', async () => {
    const onGated = vi.fn()
    const onCreateCampaign = vi.fn()
    render(
      <Compendium
        onCreateCreature={() => {}}
        createGated
        onGated={onGated}
        onCreateCampaign={onCreateCampaign}
      />,
    )
    await waitFor(() => screen.getByText('Goblin'))
    fireEvent.click(screen.getByText('Campaigns'))
    expect(screen.getByText(/Sign in to create and manage campaigns/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(onGated).toHaveBeenCalled()
    expect(onCreateCampaign).not.toHaveBeenCalled()
  })
})
