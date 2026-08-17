// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
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
  rules: {
    crit: 'max-plus-roll',
    surprise: 'skip',
    hp: 'roll',
    initiativeTiebreak: 'pcs-first',
    leveling: 'milestone',
  },
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
    expect(screen.getByText('Milestone')).toBeInTheDocument()
  })

  it('falls back to default rules for a campaign saved before the rules block', () => {
    const legacy: Campaign = { id: 'c2', name: 'Old', edition: '5.0' }
    render(<CampaignCard campaign={legacy} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('Double the dice (standard)')).toBeInTheDocument()
    expect(screen.getByText('Average')).toBeInTheDocument()
    // A campaign with no leveling field reads as XP.
    expect(screen.getByText('Experience points (XP)')).toBeInTheDocument()
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

describe('the campaign notes', () => {
  /** The card with notes editable — what a signed-in Game Master sees. */
  const editable = (over: Partial<Campaign> = {}, onEditNotes = vi.fn()) => {
    render(
      <CampaignCard
        campaign={{ ...campaign, ...over }}
        onEdit={() => {}}
        onEditNotes={onEditNotes}
        onDelete={() => {}}
      />,
    )
    return onEditNotes
  }

  it('edits inline and commits on blur, without opening the form', () => {
    const onEdit = vi.fn()
    const onEditNotes = vi.fn()
    render(
      <CampaignCard
        campaign={{ ...campaign, notes: 'Old note' }}
        onEdit={onEdit}
        onEditNotes={onEditNotes}
        onDelete={() => {}}
      />,
    )
    fireEvent.click(screen.getByTitle(/Click to edit/))
    const textarea = screen.getByLabelText('Campaign notes')
    fireEvent.change(textarea, { target: { value: 'The burgomaster is lying' } })
    fireEvent.blur(textarea)
    expect(onEditNotes).toHaveBeenCalledWith('The burgomaster is lying')
    // The form never opened — the whole point of editing it here.
    expect(onEdit).not.toHaveBeenCalled()
  })

  it('prompts when empty, in the middle of a sentence', () => {
    editable()
    expect(screen.getByText('Add campaign notes…')).toBeInTheDocument()
  })

  it('says the note is kept on the campaign', () => {
    editable({ notes: 'A note' })
    expect(screen.getByTitle('Click to edit — saved to this campaign')).toBeInTheDocument()
  })

  it('renders the notes as markdown', () => {
    editable({ notes: 'Beware **Strahd**' })
    expect(screen.getByText('Strahd').tagName).toBe('STRONG')
  })

  it('reads the notes back without offering to edit them for a viewer who cannot', () => {
    render(
      <CampaignCard
        campaign={{ ...campaign, notes: 'Read only' }}
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    )
    expect(screen.getByText('Read only')).toBeInTheDocument()
    expect(screen.queryByTitle(/Click to edit/)).toBeNull()
  })

  it('leaves the section out entirely when there is nothing to show or edit', () => {
    render(<CampaignCard campaign={campaign} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.queryByText('Campaign notes')).toBeNull()
  })

  it('keeps an escaped edit from committing', () => {
    const onEditNotes = editable({ notes: 'Keep me' })
    fireEvent.click(screen.getByTitle(/Click to edit/))
    const textarea = screen.getByLabelText('Campaign notes')
    fireEvent.change(textarea, { target: { value: 'discard this' } })
    fireEvent.keyDown(textarea, { key: 'Escape' })
    expect(onEditNotes).not.toHaveBeenCalled()
    expect(screen.getByText('Keep me')).toBeInTheDocument()
  })
})
