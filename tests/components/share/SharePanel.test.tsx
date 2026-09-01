// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SharePanel } from '../../../src/components/share/SharePanel.tsx'

afterEach(cleanup)

/** Render the panel with its popover already open, which is where everything lives. */
function open(props: Partial<Parameters<typeof SharePanel>[0]> = {}) {
  const onToggleShare = vi.fn()
  const onSignIn = vi.fn()
  render(
    <SharePanel
      code={props.code === undefined ? 'tuesday-game' : props.code}
      capability={props.capability === undefined ? 'secret-capability' : props.capability}
      sharing={props.sharing ?? false}
      onToggleShare={onToggleShare}
      onClaim={props.onClaim}
      onSignIn={onSignIn}
      pin={props.pin ?? null}
      onSetPin={props.onSetPin}
      backdrop={props.backdrop ?? null}
      onSetBackdrop={props.onSetBackdrop}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: /Share with players|Sharing with players/ }))
  return { onToggleShare, onSignIn }
}

describe('SharePanel', () => {
  it('offers to start sharing, and to stop once it is on', () => {
    const { onToggleShare } = open()
    fireEvent.click(screen.getByText('Start sharing'))
    expect(onToggleShare).toHaveBeenCalled()
    cleanup()
    open({ sharing: true })
    expect(screen.getByText('Stop sharing')).toBeInTheDocument()
  })

  it('shows the link as its fixed part plus the code, and opens the whole of it', () => {
    open({ onClaim: vi.fn() })
    expect(screen.getByText('http://localhost:3000/p/')).toBeInTheDocument()
    expect((screen.getByLabelText('Link name') as HTMLInputElement).value).toBe('tuesday-game')
    expect(screen.getByRole('link', { name: /Open the player view/ })).toHaveAttribute(
      'href',
      'http://localhost:3000/p/tuesday-game#live=secret-capability',
    )
  })

  it('shows an anonymous GM the code as text, with nothing to edit', () => {
    open()
    expect(screen.getByText('http://localhost:3000/p/')).toBeInTheDocument()
    expect(screen.getByText('tuesday-game')).toBeInTheDocument()
    expect(screen.queryByLabelText('Link name')).toBeNull()
  })

  it('shows no link at all before a code exists', () => {
    open({ code: null })
    expect(screen.queryByText('http://localhost:3000/p/')).toBeNull()
  })

  it('warns that anyone with the link can watch', () => {
    open()
    expect(screen.getByText(/Anyone with the link can watch/)).toBeInTheDocument()
  })

  // Both controls are icon-only, so the accessible name is the only name they have.
  it('puts the link on the clipboard and confirms it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Copy the link' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/p/')))
    await screen.findByRole('button', { name: 'Copied' })
    vi.unstubAllGlobals()
  })

  it('says so when the clipboard is blocked, rather than claiming it copied', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Copy the link' }))
    await screen.findByText(/Select the link and copy it yourself/)
    expect(screen.queryByRole('button', { name: 'Copied' })).toBeNull()
    vi.unstubAllGlobals()
  })

  it('opens the player view in a new tab, as a real link', () => {
    open()
    const link = screen.getByRole('link', { name: 'Open the player view in a new tab' })
    expect(link.getAttribute('href')).toBe(
      'http://localhost:3000/p/tuesday-game#live=secret-capability',
    )
    expect(link).toHaveAttribute('target', '_blank')
  })
})

describe('SharePanel — naming the link', () => {
  it('normalizes what is typed and claims that', async () => {
    const onClaim = vi.fn().mockResolvedValue('ok')
    open({ onClaim })
    fireEvent.change(screen.getByLabelText('Link name'), { target: { value: 'Dragons Rest!' } })
    // Typing normalizes in place, so the field reads as the link will.
    expect((screen.getByLabelText('Link name') as HTMLInputElement).value).toBe('dragons-rest')
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => expect(onClaim).toHaveBeenCalledWith('dragons-rest'))
  })

  it('offers nothing to save while the name is the one the link already has', () => {
    open({ onClaim: vi.fn() })
    expect(screen.queryByText('Save')).toBeNull()
    fireEvent.change(screen.getByLabelText('Link name'), { target: { value: 'Tuesday Game' } })
    expect(screen.queryByText('Save')).toBeNull()
  })

  it('rejects a name the database would never see, without a round trip', async () => {
    const onClaim = vi.fn()
    open({ onClaim })
    fireEvent.change(screen.getByLabelText('Link name'), { target: { value: 'ab' } })
    fireEvent.click(screen.getByText('Save'))
    await screen.findByText(/at least 3/)
    expect(onClaim).not.toHaveBeenCalled()
  })

  // A rejected claim must leave the working link alone — the GM may already have read
  // it out to the table.
  it('reports a taken name and keeps the current link on screen', async () => {
    const onClaim = vi.fn().mockResolvedValue('taken')
    open({ onClaim })
    fireEvent.change(screen.getByLabelText('Link name'), { target: { value: 'dragons' } })
    fireEvent.click(screen.getByText('Save'))
    await screen.findByText('That name is taken. Try another.')
    expect(screen.getByRole('link', { name: /Open the player view/ })).toHaveAttribute(
      'href',
      'http://localhost:3000/p/tuesday-game#live=secret-capability',
    )
  })

  // Retrying can't fix a column that was never added, so the GM is told what is
  // actually wrong and reassured their existing link still works.
  it('says the feature is not set up rather than asking for a retry', async () => {
    const onClaim = vi.fn().mockResolvedValue('unavailable')
    open({ onClaim })
    fireEvent.change(screen.getByLabelText('Link name'), { target: { value: 'nico' } })
    fireEvent.click(screen.getByText('Save'))
    await screen.findByText(/isn’t set up on this server yet/)
    expect(screen.queryByText(/Try again/)).toBeNull()
  })

  it('says so when the claim could not be saved at all', async () => {
    const onClaim = vi.fn().mockResolvedValue('failed')
    open({ onClaim })
    fireEvent.change(screen.getByLabelText('Link name'), { target: { value: 'dragons' } })
    fireEvent.click(screen.getByText('Save'))
    await screen.findByText(/Couldn’t save that name/)
  })

  it('points an anonymous GM at signing in instead of offering the field', () => {
    const { onSignIn } = open({ onClaim: undefined })
    expect(screen.queryByLabelText('Link name')).toBeNull()
    fireEvent.click(screen.getByText('Sign in'))
    expect(onSignIn).toHaveBeenCalled()
  })
})

describe('SharePanel — the PIN', () => {
  const box = (n: number) => screen.getByLabelText(`PIN digit ${n}`)

  it('keeps the section off a panel nobody wired', () => {
    open()
    expect(screen.queryByLabelText('PIN digit 1')).toBeNull()
  })

  it('sets the PIN at the fourth digit', () => {
    const onSetPin = vi.fn()
    open({ onSetPin })
    fireEvent.change(box(1), { target: { value: '1' } })
    fireEvent.change(box(2), { target: { value: '2' } })
    fireEvent.change(box(3), { target: { value: '3' } })
    expect(onSetPin).not.toHaveBeenCalled()
    fireEvent.change(box(4), { target: { value: '4' } })
    expect(onSetPin).toHaveBeenCalledWith('1234')
    expect(screen.getByText(/PIN set/)).toBeInTheDocument()
  })

  it('lifts the lock from Remove', () => {
    const onSetPin = vi.fn()
    open({ pin: '1234', onSetPin })
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(onSetPin).toHaveBeenCalledWith(null)
    expect(screen.getByText('PIN removed.')).toBeInTheDocument()
  })
})

describe('SharePanel — the backdrop', () => {
  it('stays off an unwired panel, sets from a tile, and None takes it off', () => {
    open()
    expect(screen.queryByRole('radiogroup', { name: 'Backdrop' })).toBeNull()

    cleanup()
    const onSetBackdrop = vi.fn()
    open({ onSetBackdrop })
    fireEvent.click(screen.getByRole('radio', { name: 'Mountain fortress' }))
    expect(onSetBackdrop).toHaveBeenCalledWith('mountain-fortress')

    cleanup()
    const clear = vi.fn()
    open({ backdrop: 'mountain-fortress', onSetBackdrop: clear })
    expect(screen.getByRole('radio', { name: 'Mountain fortress' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    fireEvent.click(screen.getByRole('radio', { name: 'None' }))
    expect(clear).toHaveBeenCalledWith(null)
  })
})
