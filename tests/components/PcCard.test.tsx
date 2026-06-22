// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PcCard } from '../../src/components/PcCard.tsx'
import type { RosterPc } from '../../src/schema/roster.ts'

afterEach(cleanup)

const pc: RosterPc = {
  id: 'pc-1',
  name: 'Thalia',
  ac: 16,
  maxHp: 38,
  passivePerception: 14,
  languages: ['Common'],
  speed: { walk: 30, climb: 15 },
  resistances: ['fire'],
  abilities: { str: 10, dex: 14, con: 12, int: 13, wis: 11, cha: 16 },
  campaignId: 'camp-1',
}

const noop = () => {}

describe('PcCard', () => {
  it('shows the durable board facts, ability scores, and campaign', () => {
    render(
      <PcCard pc={pc} campaignName="Curse of Strahd" onAddToEncounter={noop} onEdit={noop} onDelete={noop} />,
    )
    expect(screen.getByText('Thalia')).toBeInTheDocument()
    expect(screen.getByText('Player character · Curse of Strahd')).toBeInTheDocument()
    expect(screen.getByText('Armor Class')).toBeInTheDocument()
    expect(screen.getByText('Hit Points')).toBeInTheDocument()
    expect(screen.getByText('38')).toBeInTheDocument() // HP (unique)
    expect(screen.getByText('Walk 30 ft., Climb 15 ft.')).toBeInTheDocument()
    expect(screen.getByText('Resistant to fire')).toBeInTheDocument()
    // Ability block with a derived modifier (CHA 16 → +3, unique here).
    expect(screen.getByText('DEX')).toBeInTheDocument()
    expect(screen.getByText('+3')).toBeInTheDocument()
  })

  it('omits the campaign suffix when unassigned', () => {
    render(
      <PcCard pc={{ ...pc, campaignId: null }} onAddToEncounter={noop} onEdit={noop} onDelete={noop} />,
    )
    expect(screen.getByText('Player character')).toBeInTheDocument()
  })

  it('wires Add to encounter, Edit, and Delete', () => {
    const onAddToEncounter = vi.fn()
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    render(
      <PcCard pc={pc} onAddToEncounter={onAddToEncounter} onEdit={onEdit} onDelete={onDelete} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add to encounter' }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onAddToEncounter).toHaveBeenCalledTimes(1)
    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('renders without ability scores (none stored)', () => {
    const lean: RosterPc = { ...pc }
    delete lean.abilities
    render(<PcCard pc={lean} onAddToEncounter={noop} onEdit={noop} onDelete={noop} />)
    expect(screen.getByText('Thalia')).toBeInTheDocument()
    expect(screen.queryByText('DEX')).toBeNull()
  })
})
