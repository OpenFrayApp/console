// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SharedLinksPanel } from '../../src/components/SharedLinksPanel.tsx'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const LINKS = {
  status: 'ok' as const,
  shares: [{ code: 'k7mqx3rt9p', name: 'Goblin ambush', createdAt: '2026-08-11T20:00:00.000Z' }],
}

describe('SharedLinksPanel', () => {
  it('shows each published link in full, so it can be read or copied by hand', () => {
    render(<SharedLinksPanel shares={LINKS} onUnpublish={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Goblin ambush')).toBeTruthy()
    expect(screen.getByText(/\/s\/k7mqx3rt9p$/)).toBeTruthy()
  })

  it('confirms by name before taking a link down', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const onUnpublish = vi.fn()
    render(<SharedLinksPanel shares={LINKS} onUnpublish={onUnpublish} onClose={vi.fn()} />)

    fireEvent.click(screen.getByText('Unpublish'))
    expect(confirm.mock.calls[0][0]).toContain('Goblin ambush')
    expect(onUnpublish).not.toHaveBeenCalled()

    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByText('Unpublish'))
    expect(onUnpublish).toHaveBeenCalledWith('k7mqx3rt9p')
  })

  it('tells a Game Master with no links where they would come from', () => {
    render(
      <SharedLinksPanel
        shares={{ status: 'ok', shares: [] }}
        onUnpublish={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText(/Share an encounter from the board/)).toBeTruthy()
  })

  it('keeps an empty list apart from a database that hasn’t been set up', () => {
    render(
      <SharedLinksPanel
        shares={{ status: 'unavailable' }}
        onUnpublish={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText(/isn’t set up on this server yet/)).toBeTruthy()
  })
})
