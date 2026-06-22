// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CampaignPicker } from '../../src/components/CampaignPicker.tsx'
import type { Campaign } from '../../src/schema/campaign.ts'

afterEach(cleanup)

const campaigns: Campaign[] = [
  { id: 'c1', name: 'Curse of Strahd', edition: '5.5' },
  { id: 'c2', name: 'Tomb of Annihilation', edition: '5.0' },
]

describe('CampaignPicker', () => {
  it('renders nothing when there are no campaigns', () => {
    const { container } = render(
      <CampaignPicker campaigns={[]} activeId={null} onChange={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('lists the campaigns plus a "Choose a campaign…" option and reflects the active one', () => {
    render(<CampaignPicker campaigns={campaigns} activeId="c2" onChange={() => {}} />)
    const select = screen.getByLabelText('Active campaign') as HTMLSelectElement
    expect(select.value).toBe('c2')
    expect([...select.options].map((o) => o.text)).toEqual([
      'Choose a campaign…',
      'Curse of Strahd',
      'Tomb of Annihilation',
    ])
  })

  it('emits the selected campaign id', () => {
    const onChange = vi.fn()
    render(<CampaignPicker campaigns={campaigns} activeId={null} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Active campaign'), { target: { value: 'c1' } })
    expect(onChange).toHaveBeenCalledWith('c1')
  })

  it('emits null when "No campaign" is chosen', () => {
    const onChange = vi.fn()
    render(<CampaignPicker campaigns={campaigns} activeId="c1" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Active campaign'), { target: { value: '' } })
    expect(onChange).toHaveBeenCalledWith(null)
  })
})
