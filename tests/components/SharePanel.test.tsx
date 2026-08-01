// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SharePanel } from '../../src/components/SharePanel.tsx'

afterEach(cleanup)

/** Render the panel with its popover already open, which is where everything lives. */
function open(props: Partial<Parameters<typeof SharePanel>[0]> = {}) {
  const onToggleShare = vi.fn()
  const onSignIn = vi.fn()
  render(
    <SharePanel
      code={props.code === undefined ? 'tuesday-game' : props.code}
      sharing={props.sharing ?? false}
      onToggleShare={onToggleShare}
      onClaim={props.onClaim}
      onSignIn={onSignIn}
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

  it('shows the full link for the code it was given', () => {
    open()
    const field = screen.getByLabelText('Link') as HTMLInputElement
    expect(field.value.endsWith('/play/tuesday-game')).toBe(true)
  })

  it('shows no link at all before a code exists', () => {
    open({ code: null })
    expect(screen.queryByLabelText('Link')).toBeNull()
  })

  it('warns that anyone with the link can watch', () => {
    open()
    expect(screen.getByText(/Anyone with the link can watch/)).toBeInTheDocument()
  })
})

describe('SharePanel — naming the link', () => {
  it('sends the normalized name to be claimed', async () => {
    const onClaim = vi.fn().mockResolvedValue('ok')
    open({ onClaim })
    fireEvent.change(screen.getByLabelText('Name the link'), { target: { value: 'Tuesday Game' } })
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => expect(onClaim).toHaveBeenCalledWith('tuesday-game'))
  })

  it('rejects a name the database would never see, without a round trip', async () => {
    const onClaim = vi.fn()
    open({ onClaim })
    fireEvent.change(screen.getByLabelText('Name the link'), { target: { value: 'ab' } })
    fireEvent.click(screen.getByText('Save'))
    await screen.findByText(/at least 3/)
    expect(onClaim).not.toHaveBeenCalled()
  })

  // A rejected claim must leave the working link alone — the GM may already have read
  // it out to the table.
  it('reports a taken name and keeps the current link on screen', async () => {
    const onClaim = vi.fn().mockResolvedValue('taken')
    open({ onClaim })
    fireEvent.change(screen.getByLabelText('Name the link'), { target: { value: 'dragons' } })
    fireEvent.click(screen.getByText('Save'))
    await screen.findByText('That name is taken. Try another.')
    const link = (screen.getByLabelText('Link') as HTMLInputElement).value
    expect(link.endsWith('/play/tuesday-game')).toBe(true)
  })

  // Retrying can't fix a column that was never added, so the GM is told what is
  // actually wrong and reassured their existing link still works.
  it('says the feature is not set up rather than asking for a retry', async () => {
    const onClaim = vi.fn().mockResolvedValue('unavailable')
    open({ onClaim })
    fireEvent.change(screen.getByLabelText('Name the link'), { target: { value: 'nico' } })
    fireEvent.click(screen.getByText('Save'))
    await screen.findByText(/isn’t set up on this server yet/)
    expect(screen.queryByText(/Try again/)).toBeNull()
  })

  it('says so when the claim could not be saved at all', async () => {
    const onClaim = vi.fn().mockResolvedValue('failed')
    open({ onClaim })
    fireEvent.change(screen.getByLabelText('Name the link'), { target: { value: 'dragons' } })
    fireEvent.click(screen.getByText('Save'))
    await screen.findByText(/Couldn’t save that name/)
  })

  it('points an anonymous GM at signing in instead of offering the field', () => {
    const { onSignIn } = open({ onClaim: undefined })
    expect(screen.queryByLabelText('Name the link')).toBeNull()
    fireEvent.click(screen.getByText('Sign in'))
    expect(onSignIn).toHaveBeenCalled()
  })
})
