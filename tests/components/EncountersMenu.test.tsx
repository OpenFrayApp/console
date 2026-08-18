// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { EncountersMenu } from '../../src/components/EncountersMenu.tsx'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

/** Render the menu with sensible defaults, already open. */
function open(props: Partial<Parameters<typeof EncountersMenu>[0]> = {}) {
  const handlers = {
    onSave: vi.fn().mockResolvedValue('ok'),
    onSignIn: vi.fn(),
    onShare: vi.fn().mockResolvedValue({ status: 'ok', code: 'k7mqx3rt9p' }),
    onUnpublish: vi.fn(),
  }
  render(
    <EncountersMenu
      canSave
      signedIn
      canShare
      shares={{ status: 'ok', shares: [] }}
      defaultByline=""
      {...handlers}
      {...props}
    />,
  )
  fireEvent.click(screen.getByLabelText('Saved encounters'))
  return handlers
}

describe('EncountersMenu', () => {
  it('saves the board under a typed name and says so', async () => {
    const { onSave } = open()
    fireEvent.change(screen.getByLabelText('Save this fight'), {
      target: { value: '  Before the boss  ' },
    })
    fireEvent.click(screen.getByText('Save'))
    expect(onSave).toHaveBeenCalledWith('Before the boss')
    // And says where it went: this menu puts a fight away, the compendium is where the
    // shelf is, and the moment after saving is when that matters.
    await waitFor(() => {
      const said = screen.getByRole('status').textContent ?? ''
      expect(said).toContain('Before the boss')
      expect(said).toContain('compendium')
    })
  })

  it('says the columns are missing rather than asking for another go', async () => {
    open({ onSave: vi.fn().mockResolvedValue('unavailable') })
    fireEvent.change(screen.getByLabelText('Save this fight'), { target: { value: 'Ambush' } })
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('aren’t set up on this server yet'),
    )
  })

  it('shows no saved list — that shelf lives in the compendium', () => {
    open()
    for (const gone of ['Restore', 'Add creatures', 'Delete']) {
      expect(screen.queryByText(gone), gone).toBeNull()
    }
  })

  it('won’t save an empty board or an unnamed fight', () => {
    open({ canSave: false })
    expect(screen.getByText('Save')).toBeDisabled()
    expect(screen.getByText('Add someone to the board first.')).toBeTruthy()

    cleanup()
    open()
    // Named nothing: still disabled, so a blank row can't reach the account.
    expect(screen.getByText('Save')).toBeDisabled()
  })

  it('sends an anonymous Game Master to sign in instead of saving', () => {
    const { onSignIn } = open({ signedIn: false })
    expect(screen.queryByLabelText('Save this fight')).toBeNull()
    fireEvent.click(screen.getByText('Sign in'))
    expect(onSignIn).toHaveBeenCalled()
  })

  describe('sharing', () => {
    it('says what travels before it asks for anything', () => {
      open()
      fireEvent.click(screen.getByText('Share encounter'))
      // A Game Master should never have to guess what they just handed a stranger.
      expect(screen.getByText(/no hit points, no effects, no players, no log/)).toBeTruthy()
    })

    it('publishes the cast and shows the link', async () => {
      const { onShare } = open()
      fireEvent.click(screen.getByText('Share encounter'))
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: '  Goblin ambush  ' } })
      fireEvent.change(screen.getByLabelText('Note (optional)'), {
        target: { value: 'They wait in the rafters.' },
      })
      fireEvent.click(screen.getByText('Publish'))

      await waitFor(() =>
        expect(onShare).toHaveBeenCalledWith({
          name: 'Goblin ambush',
          note: 'They wait in the rafters.',
          by: '',
        }),
      )
      await waitFor(() =>
        expect((screen.getByLabelText('Share link') as HTMLInputElement).value).toContain(
          '/s/k7mqx3rt9p',
        ),
      )
    })

    it('refuses a byline that breaks the rules, and says which rule', async () => {
      const { onShare } = open({ defaultByline: 'OpenFray' })
      fireEvent.click(screen.getByText('Share encounter'))
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ambush' } })
      expect(screen.getByText('That name is reserved. Publish under your own.')).toBeTruthy()
      fireEvent.click(screen.getByText('Publish'))
      expect(onShare).not.toHaveBeenCalled()
    })

    it('warns a signed-out publisher that the link expires and can’t be taken down', async () => {
      open({ signedIn: false })
      fireEvent.click(screen.getByText('Share encounter'))
      expect(screen.getByText(/stops working after 60 days/)).toBeTruthy()
    })

    it('lists the publisher’s links and confirms before taking one down', () => {
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
      const { onUnpublish } = open({
        shares: {
          status: 'ok',
          shares: [{ code: 'k7mqx3rt9p', name: 'Goblin ambush', createdAt: '2026-08-11' }],
        },
      })
      fireEvent.click(screen.getByText('Unpublish'))
      expect(confirm.mock.calls[0][0]).toContain('Goblin ambush')
      expect(onUnpublish).toHaveBeenCalledWith('k7mqx3rt9p')
    })

    it('has nothing to share from an empty board', () => {
      open({ canShare: false })
      expect(screen.getByText('Share encounter')).toBeDisabled()
    })
  })
})
