// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const shares = vi.hoisted(() => ({
  unpublish: vi.fn().mockResolvedValue('ok' as const),
}))
vi.mock('../../../src/state/shares.ts', () => ({ unpublish: shares.unpublish }))

import { PublishedLink } from '../../../src/components/share/sharePieces.tsx'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  shares.unpublish.mockClear()
  shares.unpublish.mockResolvedValue('ok')
})

/** The published state with the three link buttons, as a dialog renders it. */
function published(onUnpublished = vi.fn()) {
  render(
    <PublishedLink
      link="https://openfray.app/s/k7mqx3rt9p"
      code="k7mqx3rt9p"
      name="Goblin ambush"
      onDone={vi.fn()}
      onUnpublished={onUnpublished}
    >
      Published.
    </PublishedLink>,
  )
  return onUnpublished
}

describe('PublishedLink', () => {
  it('carries the links page buttons: copy, open in a new tab, unpublish', () => {
    published()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
    const open = screen.getByRole('link', { name: 'Open' })
    expect(open).toHaveAttribute('href', 'https://openfray.app/s/k7mqx3rt9p')
    expect(open).toHaveAttribute('target', '_blank')
    expect(screen.getByRole('button', { name: 'Unpublish' })).toBeInTheDocument()
  })

  it('takes the link down only after the named confirm', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const onUnpublished = published()
    fireEvent.click(screen.getByRole('button', { name: 'Unpublish' }))
    expect(confirm).toHaveBeenCalledWith('Take down the link to “Goblin ambush”? It stops working.')
    expect(shares.unpublish).not.toHaveBeenCalled()

    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Unpublish' }))
    await waitFor(() => expect(onUnpublished).toHaveBeenCalledTimes(1))
    expect(shares.unpublish).toHaveBeenCalledWith('k7mqx3rt9p')
  })

  it('says when the takedown failed, and keeps the link on screen', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    shares.unpublish.mockResolvedValue('failed')
    const onUnpublished = published()
    fireEvent.click(screen.getByRole('button', { name: 'Unpublish' }))
    await waitFor(() => expect(screen.getByText(/Couldn’t take that down/)).toBeInTheDocument())
    expect(onUnpublished).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: 'Open' })).toBeInTheDocument()
  })
})
