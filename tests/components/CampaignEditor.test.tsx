// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CampaignEditor } from '../../src/components/CampaignEditor.tsx'
import type { Campaign } from '../../src/schema/campaign.ts'

afterEach(cleanup)

describe('CampaignEditor', () => {
  it('creates a campaign with a name and edition', () => {
    const onSave = vi.fn()
    render(<CampaignEditor onSave={onSave} onCancel={() => {}} />)

    fireEvent.change(screen.getByLabelText('Campaign name'), {
      target: { value: 'Curse of Strahd' },
    })
    fireEvent.change(screen.getByLabelText('Campaign edition'), {
      target: { value: '5.0' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create campaign' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    const saved = onSave.mock.calls[0][0] as Campaign
    expect(saved.name).toBe('Curse of Strahd')
    expect(saved.edition).toBe('5.0')
    expect(typeof saved.id).toBe('string')
    expect(saved.id.length).toBeGreaterThan(0)
  })

  it('will not create a campaign without a name', () => {
    const onSave = vi.fn()
    render(<CampaignEditor onSave={onSave} onCancel={() => {}} />)
    // Blank name → submit button is disabled and submitting is a no-op.
    expect(screen.getByRole('button', { name: 'Create campaign' })).toBeDisabled()
    fireEvent.submit(screen.getByLabelText('Campaign name').closest('form')!)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('edits an existing campaign in place, keeping its id', () => {
    const campaign: Campaign = { id: 'camp-1', name: 'Old Name', edition: '5.5' }
    const onSave = vi.fn()
    render(<CampaignEditor campaign={campaign} onSave={onSave} onDelete={() => {}} onCancel={() => {}} />)

    fireEvent.change(screen.getByLabelText('Campaign name'), {
      target: { value: 'New Name' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(onSave).toHaveBeenCalledWith({ id: 'camp-1', name: 'New Name', edition: '5.5' })
  })

  it('deletes the campaign being edited', () => {
    const campaign: Campaign = { id: 'camp-1', name: 'Doomed', edition: '5.5' }
    const onDelete = vi.fn()
    render(<CampaignEditor campaign={campaign} onSave={() => {}} onDelete={onDelete} onCancel={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledWith('camp-1')
  })

  it('offers no Delete when creating a new campaign', () => {
    render(<CampaignEditor onSave={() => {}} onCancel={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull()
  })
})
