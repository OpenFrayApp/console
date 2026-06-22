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
    fireEvent.change(screen.getByLabelText('Initiative modifier'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('DEX'), { target: { value: '14' } })
    fireEvent.change(screen.getByLabelText('Campaign'), { target: { value: 'camp-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create PC' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const saved = onSubmit.mock.calls[0][0] as RosterPc
    expect(saved.name).toBe('Thalia')
    expect(saved.ac).toBe(16)
    expect(saved.maxHp).toBe(38)
    expect(saved.initiativeMod).toBe(2)
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
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    const saved = onSubmit.mock.calls[0][0] as RosterPc
    expect(saved.id).toBe('pc-9')
    expect(saved.name).toBe('Thalia the Bold')
    expect(saved.abilities).toMatchObject({ dex: 14, cha: 16 })
  })

  it('will not submit without a name', () => {
    const onSubmit = vi.fn()
    render(<PcFormModal open campaigns={campaigns} onClose={() => {}} onSubmit={onSubmit} />)
    expect(screen.getByRole('button', { name: 'Create PC' })).toBeDisabled()
    fireEvent.submit(screen.getByRole('dialog'))
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
