// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CampaignFormModal } from '../../src/components/CampaignFormModal.tsx'
import type { Campaign } from '../../src/schema/campaign.ts'

afterEach(cleanup)

describe('CampaignFormModal', () => {
  it('renders nothing when closed', () => {
    render(<CampaignFormModal open={false} onClose={() => {}} onSubmit={() => {}} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('creates a campaign with default house rules and closes', () => {
    const onSubmit = vi.fn()
    const onClose = vi.fn()
    render(<CampaignFormModal open onClose={onClose} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText('Campaign name'), {
      target: { value: 'Curse of Strahd' },
    })
    fireEvent.change(screen.getByLabelText('Edition'), { target: { value: '5.0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create campaign' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const saved = onSubmit.mock.calls[0][0] as Campaign
    expect(saved.name).toBe('Curse of Strahd')
    expect(saved.edition).toBe('5.0')
    expect(typeof saved.id).toBe('string')
    expect(saved.rules).toEqual({
      crit: 'double-dice',
      surprise: 'disadvantage',
      hp: 'average',
      initiativeTiebreak: 'dex',
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('saves edited house rules without changing the id', () => {
    const campaign: Campaign = {
      id: 'camp-1',
      name: 'Gritty',
      edition: '5.0',
      rules: { crit: 'double-total', surprise: 'skip', hp: 'max', initiativeTiebreak: 'manual' },
    }
    const onSubmit = vi.fn()
    render(<CampaignFormModal open campaign={campaign} onClose={() => {}} onSubmit={onSubmit} />)

    expect(screen.getByRole('dialog', { name: 'Edit campaign' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Critical hit damage'), {
      target: { value: 'max-plus-roll' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    const saved = onSubmit.mock.calls[0][0] as Campaign
    expect(saved.id).toBe('camp-1')
    expect(saved.rules).toMatchObject({ crit: 'max-plus-roll', surprise: 'skip' })
  })

  it('will not submit without a name', () => {
    const onSubmit = vi.fn()
    render(<CampaignFormModal open onClose={() => {}} onSubmit={onSubmit} />)
    expect(screen.getByRole('button', { name: 'Create campaign' })).toBeDisabled()
    fireEvent.submit(screen.getByRole('dialog'))
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
