// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CampaignCard } from '../../src/components/CampaignCard.tsx'
import type { Campaign } from '../../src/schema/campaign.ts'

afterEach(cleanup)

const campaign: Campaign = {
  id: 'camp-1',
  name: 'Curse of Strahd',
  edition: '5.5',
  rules: { crit: 'max-plus-roll', surprise: 'skip', hp: 'roll', initiativeTiebreak: 'pcs-first' },
}

describe('CampaignCard', () => {
  it('shows the name, edition, and house rules as readable labels', () => {
    render(<CampaignCard campaign={campaign} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('Curse of Strahd')).toBeInTheDocument()
    expect(screen.getByText('DnD 5.5 (2024)')).toBeInTheDocument()
    expect(screen.getByText('Max normal dice + roll crit dice')).toBeInTheDocument()
    expect(screen.getByText('Skip the first turn (5.0)')).toBeInTheDocument()
    expect(screen.getByText('Roll')).toBeInTheDocument()
    expect(screen.getByText('Players first')).toBeInTheDocument()
  })

  it('falls back to default rules for a campaign saved before the rules block', () => {
    const legacy: Campaign = { id: 'c2', name: 'Old', edition: '5.0' }
    render(<CampaignCard campaign={legacy} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('Double the dice (standard)')).toBeInTheDocument()
    expect(screen.getByText('Average')).toBeInTheDocument()
  })

  it('wires Edit and Delete', () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    render(<CampaignCard campaign={campaign} onEdit={onEdit} onDelete={onDelete} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
