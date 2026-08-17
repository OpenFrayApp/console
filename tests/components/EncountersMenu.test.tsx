// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { EncountersMenu } from '../../src/components/EncountersMenu.tsx'
import type { SavedFights } from '../../src/state/cloudEncounter.ts'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const FIGHTS: SavedFights = {
  status: 'ok',
  fights: [
    {
      id: 'row-1',
      name: 'Goblin ambush',
      campaignId: 'camp-1',
      savedAt: '2026-08-11T20:00:00.000Z',
    },
  ],
}

const CAMPAIGNS = [{ id: 'camp-1', name: 'The Waking Garden', edition: '5.5' as const }]

/** Render the menu with sensible defaults, already open. */
function open(props: Partial<Parameters<typeof EncountersMenu>[0]> = {}) {
  const handlers = {
    onSave: vi.fn().mockResolvedValue('ok'),
    onRestore: vi.fn().mockResolvedValue(true),
    onAddCast: vi.fn().mockResolvedValue({ added: 4, missing: [] }),
    onDelete: vi.fn(),
    onSignIn: vi.fn(),
    onOpen: vi.fn(),
    onShare: vi.fn().mockResolvedValue({ status: 'ok', code: 'k7mqx3rt9p' }),
    onUnpublish: vi.fn(),
  }
  render(
    <EncountersMenu
      fights={FIGHTS}
      campaigns={CAMPAIGNS}
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
  it('asks for a fresh list when it opens, rather than at startup', () => {
    const { onOpen } = open()
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('saves the board under a typed name and says so', async () => {
    const { onSave } = open()
    fireEvent.change(screen.getByLabelText('Save this fight'), {
      target: { value: '  Before the boss  ' },
    })
    fireEvent.click(screen.getByText('Save'))
    expect(onSave).toHaveBeenCalledWith('Before the boss')
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Before the boss'))
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

  it('lists a saved fight with its campaign', () => {
    open()
    expect(screen.getByText('Goblin ambush')).toBeTruthy()
    expect(screen.getByText('The Waking Garden')).toBeTruthy()
  })

  it('confirms before a restore replaces the board, and names what goes', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { onRestore } = open()
    fireEvent.click(screen.getByText('Restore'))
    expect(onRestore).not.toHaveBeenCalled()
    expect(confirm.mock.calls[0][0]).toContain('Goblin ambush')
    expect(confirm.mock.calls[0][0]).toContain('isn’t saved')

    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByText('Restore'))
    await waitFor(() => expect(onRestore).toHaveBeenCalledWith('row-1'))
  })

  it('adds the cast without a confirmation, because it only adds', async () => {
    const confirm = vi.spyOn(window, 'confirm')
    const { onAddCast } = open()
    fireEvent.click(screen.getByText('Add creatures'))
    await waitFor(() => expect(onAddCast).toHaveBeenCalledWith('row-1'))
    expect(confirm).not.toHaveBeenCalled()
  })

  it('never silently shorts a Game Master a monster', async () => {
    // Finding out mid-fight that the ogre didn't arrive is the failure this avoids.
    open({
      onAddCast: vi.fn().mockResolvedValue({ added: 3, missing: ['kobold-press-tob9:wyrm'] }),
    })
    fireEvent.click(screen.getByText('Add creatures'))
    await waitFor(() => {
      const said = screen.getByRole('status').textContent ?? ''
      expect(said).toContain('Added 3')
      expect(said).toContain('One creature')
    })
  })

  it('confirms a delete by name', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { onDelete } = open()
    fireEvent.click(screen.getByText('Delete'))
    expect(confirm.mock.calls[0][0]).toContain('Goblin ambush')
    expect(onDelete).toHaveBeenCalledWith('row-1')
  })

  it('says the SQL is pending rather than pretending nothing is saved', () => {
    open({ fights: { status: 'unavailable' } })
    expect(screen.getByText(/aren’t set up on this server yet/)).toBeTruthy()
    expect(
      screen.queryByText('No saved encounters yet. Build a board, then save it here.'),
    ).toBeNull()
  })

  it('tells a Game Master with nothing saved what to do next', () => {
    open({ fights: { status: 'ok', fights: [] } })
    expect(
      screen.getByText('No saved encounters yet. Build a board, then save it here.'),
    ).toBeTruthy()
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
