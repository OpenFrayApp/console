// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SharedLinksPage } from '../../../src/components/share/SharedLinksPage.tsx'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

/** `count` links, newest first, alternating what kind of thing each one is. */
const many = (count: number) => ({
  status: 'ok' as const,
  shares: Array.from({ length: count }, (_, i) => ({
    code: `code${String(i).padStart(6, '0')}`,
    kind: i % 2 === 0 ? 'encounter' : 'creature',
    name: `Link ${i}`,
    createdAt: '2026-08-11T20:00:00.000Z',
  })),
})

describe('SharedLinksPage', () => {
  it('shows each link in full, with what it is and when it went out', () => {
    render(<SharedLinksPage shares={many(1)} onUnpublish={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Link 0')).toBeTruthy()
    expect(screen.getByText('Encounter')).toBeTruthy()
    expect(screen.getByText(/\/s\/code000000$/)).toBeTruthy()
    expect(screen.getByText(/Shared .*2026/)).toBeTruthy()
  })

  it('says which kind each link is, since the two read differently', () => {
    render(<SharedLinksPage shares={many(2)} onUnpublish={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Encounter')).toBeTruthy()
    expect(screen.getByText('Creature')).toBeTruthy()
  })

  it('pages rather than scrolling forty links past the reader', () => {
    render(<SharedLinksPage shares={many(25)} onUnpublish={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Link 0')).toBeTruthy()
    expect(screen.queryByText('Link 10')).toBeNull()
    expect(screen.getByText('1–10 of 25')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Link 10')).toBeTruthy()
    expect(screen.queryByText('Link 0')).toBeNull()
    expect(screen.getByText('11–20 of 25')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('21–25 of 25')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('offers no paging when everything fits on one', () => {
    render(<SharedLinksPage shares={many(3)} onUnpublish={vi.fn()} onClose={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()
  })

  it('opens each link in a new tab, so checking one doesn’t leave the board', () => {
    render(<SharedLinksPage shares={many(1)} onUnpublish={vi.fn()} onClose={vi.fn()} />)
    const open = screen.getByRole('link', { name: /Open/ })
    expect(open.getAttribute('target')).toBe('_blank')
    expect(open.getAttribute('href')).toMatch(/\/s\/code000000$/)
  })

  it('confirms by name before taking a link down', () => {
    // It can't be put back: the code is drawn fresh every time, so republishing makes a
    // different link and anywhere the old one was pasted stays broken.
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const onUnpublish = vi.fn()
    render(<SharedLinksPage shares={many(1)} onUnpublish={onUnpublish} onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /Unpublish/ }))
    expect(confirm.mock.calls[0][0]).toContain('Link 0')
    expect(onUnpublish).not.toHaveBeenCalled()

    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: /Unpublish/ }))
    expect(onUnpublish).toHaveBeenCalledWith('code000000')
  })

  it('promises no expiry, because an owned link has none', () => {
    // Everything listed here carries an owner, and an owner's link stands until they take
    // it down or a moderator does. Nothing ages out.
    const { container } = render(
      <SharedLinksPage shares={many(1)} onUnpublish={vi.fn()} onClose={vi.fn()} />,
    )
    expect(container.textContent).not.toMatch(/expire|60 days/i)
    expect(screen.getByText(/stand until you take them down/)).toBeTruthy()
  })

  it('tells a Game Master with no links where they would come from', () => {
    render(
      <SharedLinksPage
        shares={{ status: 'ok', shares: [] }}
        onUnpublish={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText(/Nothing published yet/)).toBeTruthy()
  })

  it('says a server without sharing is a server without sharing', () => {
    render(
      <SharedLinksPage
        shares={{ status: 'unavailable' }}
        onUnpublish={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText(/isn’t set up on this server/)).toBeTruthy()
  })
})
