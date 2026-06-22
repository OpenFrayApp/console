// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PcFormModal } from '../../src/components/PcFormModal.tsx'
import type { RosterPc } from '../../src/schema/roster.ts'
import type { Campaign } from '../../src/schema/campaign.ts'

afterEach(cleanup)

const campaigns: Campaign[] = [
  { id: 'camp-1', name: 'Curse of Strahd', edition: '5.5' },
  { id: 'camp-2', name: 'Tomb of Annihilation', edition: '5.0' },
]

describe('PcFormModal', () => {
  it('renders nothing when closed', () => {
    render(<PcFormModal open={false} onClose={() => {}} onSubmit={() => {}} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('creates a roster PC with ability scores and a campaign tag', () => {
    const onSubmit = vi.fn()
    const onClose = vi.fn()
    render(<PcFormModal open campaigns={campaigns} onClose={onClose} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText('PC name'), { target: { value: 'Thalia' } })
    fireEvent.change(screen.getByLabelText('AC'), { target: { value: '16' } })
    fireEvent.change(screen.getByLabelText('Max HP'), { target: { value: '38' } })
    fireEvent.change(screen.getByLabelText('DEX'), { target: { value: '14' } })
    fireEvent.change(screen.getByLabelText('Campaign'), { target: { value: 'camp-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create PC' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const saved = onSubmit.mock.calls[0][0] as RosterPc
    expect(saved.name).toBe('Thalia')
    expect(saved.ac).toBe(16)
    expect(saved.maxHp).toBe(38)
    // No Init field — the modifier is derived from DEX at instantiation time.
    expect('initiativeMod' in saved).toBe(false)
    expect(saved.abilities).toEqual({ str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10 })
    expect(saved.campaignId).toBe('camp-1')
    expect(typeof saved.id).toBe('string')
    expect(onClose).toHaveBeenCalled()
  })

  it('defaults to no campaign and full default ability scores', () => {
    const onSubmit = vi.fn()
    render(<PcFormModal open campaigns={campaigns} onClose={() => {}} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText('PC name'), { target: { value: 'Grog' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create PC' }))
    const saved = onSubmit.mock.calls[0][0] as RosterPc
    expect(saved.campaignId).toBeNull()
    expect(saved.abilities).toEqual({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 })
  })

  it('edits an existing PC, keeping its id', () => {
    const pc: RosterPc = {
      id: 'pc-9',
      name: 'Thalia',
      ac: 16,
      maxHp: 38,
      abilities: { str: 10, dex: 14, con: 12, int: 13, wis: 11, cha: 16 },
      campaignId: 'camp-1',
    }
    const onSubmit = vi.fn()
    render(<PcFormModal open pc={pc} campaigns={campaigns} onClose={() => {}} onSubmit={onSubmit} />)

    expect(screen.getByRole('dialog', { name: 'Edit player character' })).toBeInTheDocument()
    expect((screen.getByLabelText('PC name') as HTMLInputElement).value).toBe('Thalia')
    expect((screen.getByLabelText('Campaign') as HTMLSelectElement).value).toBe('camp-1')
    fireEvent.change(screen.getByLabelText('PC name'), { target: { value: 'Thalia the Bold' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    const saved = onSubmit.mock.calls[0][0] as RosterPc
    expect(saved.id).toBe('pc-9')
    expect(saved.name).toBe('Thalia the Bold')
    expect(saved.abilities).toMatchObject({ dex: 14, cha: 16 })
  })

  it('captures edition, structured speed, and senses', () => {
    const onSubmit = vi.fn()
    render(<PcFormModal open campaigns={campaigns} onClose={() => {}} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText('PC name'), { target: { value: 'Thalia' } })
    fireEvent.change(screen.getByLabelText('Edition'), { target: { value: '5.0' } })
    fireEvent.change(screen.getByLabelText('walk speed'), { target: { value: '30' } })
    fireEvent.change(screen.getByLabelText('climb speed'), { target: { value: '20' } })
    fireEvent.change(screen.getByLabelText('Darkvision'), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText('WIS'), { target: { value: '14' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create PC' }))

    const saved = onSubmit.mock.calls[0][0] as RosterPc
    expect(saved.edition).toBe('5.0')
    expect(saved.speed).toEqual({ walk: 30, climb: 20 })
    // Passive Perception defaults to 10 + Wis mod (14 → +2) when left blank.
    expect(saved.senses).toEqual({ passivePerception: 12, darkvision: 60 })
  })

  it('offers only the nine alignments plus none (no "typically…" hedges)', () => {
    render(<PcFormModal open onClose={() => {}} onSubmit={() => {}} />)
    const select = screen.getByLabelText('Alignment') as HTMLSelectElement
    const options = [...select.options].map((o) => o.textContent)
    expect(options).toEqual([
      'No alignment',
      'Lawful Good',
      'Neutral Good',
      'Chaotic Good',
      'Lawful Neutral',
      'Neutral',
      'Chaotic Neutral',
      'Lawful Evil',
      'Neutral Evil',
      'Chaotic Evil',
    ])
  })

  it('shows one roleplay line per category by default', () => {
    render(<PcFormModal open onClose={() => {}} onSubmit={() => {}} />)
    expect(screen.getByLabelText('Personality Traits 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Ideals 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Bonds 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Flaws 1')).toBeInTheDocument()
  })

  it('captures alignment, roleplay lines, and markdown backstory', () => {
    const onSubmit = vi.fn()
    render(<PcFormModal open campaigns={campaigns} onClose={() => {}} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText('PC name'), { target: { value: 'Thalia' } })
    fireEvent.change(screen.getByLabelText('Race'), { target: { value: 'Half-Elf' } })
    fireEvent.change(screen.getByLabelText('Alignment'), { target: { value: 'lawful good' } })
    fireEvent.change(screen.getByLabelText('Faith'), { target: { value: 'Lathander' } })
    fireEvent.change(screen.getByLabelText('DM notes'), { target: { value: 'Owes the party 50gp' } })

    // Each roleplay category is a repeatable list: Add a line, then fill it.
    fireEvent.click(screen.getByRole('button', { name: '+ Add trait' }))
    fireEvent.change(screen.getByLabelText('Personality Traits 1'), { target: { value: 'Brave' } })
    fireEvent.click(screen.getByRole('button', { name: '+ Add bond' }))
    fireEvent.change(screen.getByLabelText('Bonds 1'), { target: { value: 'My village' } })

    fireEvent.change(screen.getByLabelText('Backstory and goals'), {
      target: { value: 'Raised in **Neverwinter**.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create PC' }))

    const saved = onSubmit.mock.calls[0][0] as RosterPc
    expect(saved.race).toBe('Half-Elf')
    expect(saved.alignment).toBe('lawful good')
    expect(saved.faith).toBe('Lathander')
    expect(saved.dmNotes).toBe('Owes the party 50gp')
    expect(saved.personalityTraits).toEqual(['Brave'])
    expect(saved.bonds).toEqual(['My village'])
    expect(saved.ideals).toBeUndefined() // empty categories are dropped
    expect(saved.backstory).toBe('Raised in **Neverwinter**.')
  })

  it('removes a roleplay line with its ✕ button', () => {
    const onSubmit = vi.fn()
    render(<PcFormModal open campaigns={campaigns} onClose={() => {}} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText('PC name'), { target: { value: 'Grog' } })
    fireEvent.click(screen.getByRole('button', { name: '+ Add flaw' }))
    fireEvent.change(screen.getByLabelText('Flaws 1'), { target: { value: 'Greedy' } })
    fireEvent.click(screen.getByRole('button', { name: 'Remove Flaws 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create PC' }))
    expect((onSubmit.mock.calls[0][0] as RosterPc).flaws).toBeUndefined()
  })

  it('will not submit without a name', () => {
    const onSubmit = vi.fn()
    render(<PcFormModal open campaigns={campaigns} onClose={() => {}} onSubmit={onSubmit} />)
    expect(screen.getByRole('button', { name: 'Create PC' })).toBeDisabled()
    fireEvent.submit(screen.getByRole('dialog'))
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
