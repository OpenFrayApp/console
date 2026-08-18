// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SaveFightButton, ShareEncounterButton } from '../../src/components/EncounterActions.tsx'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

/** Open the save control, already unfolded. */
function openSave(props: Partial<Parameters<typeof SaveFightButton>[0]> = {}) {
  const handlers = { onSave: vi.fn().mockResolvedValue('ok'), onSignIn: vi.fn() }
  render(<SaveFightButton canSave signedIn {...handlers} {...props} />)
  fireEvent.click(screen.getByLabelText('Save this fight'))
  return handlers
}

/** Open the share control, already unfolded. */
function openShare(props: Partial<Parameters<typeof ShareEncounterButton>[0]> = {}) {
  const handlers = {
    onShare: vi.fn().mockResolvedValue({ status: 'ok', code: 'k7mqx3rt9p' }),
  }
  render(<ShareEncounterButton canShare signedIn defaultByline="" {...handlers} {...props} />)
  fireEvent.click(screen.getByLabelText('Share this encounter'))
  return handlers
}

describe('SaveFightButton', () => {
  it('saves the board under a typed name, and says where it went', async () => {
    const { onSave } = openSave()
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '  Before the boss  ' } })
    fireEvent.click(screen.getByText('Save'))
    expect(onSave).toHaveBeenCalledWith('Before the boss')
    // The moment after saving is the only moment a Game Master looks for the shelf.
    await waitFor(() => {
      const said = screen.getByRole('status').textContent ?? ''
      expect(said).toContain('Before the boss')
      expect(said).toContain('compendium')
    })
  })

  it('won’t save an empty board or an unnamed fight', () => {
    openSave({ canSave: false })
    expect(screen.getByText('Save')).toBeDisabled()
    expect(screen.getByText('Add someone to the board first.')).toBeTruthy()

    cleanup()
    openSave()
    expect(screen.getByText('Save')).toBeDisabled()
  })

  it('sends an anonymous Game Master to sign in instead of saving', () => {
    const { onSignIn } = openSave({ signedIn: false })
    expect(screen.queryByLabelText('Name')).toBeNull()
    fireEvent.click(screen.getByText('Sign in'))
    expect(onSignIn).toHaveBeenCalled()
  })

  it('says the columns are missing rather than asking for another go', async () => {
    openSave({ onSave: vi.fn().mockResolvedValue('unavailable') })
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ambush' } })
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('aren’t set up on this server yet'),
    )
  })

  it('lists nothing — the saved shelf is the compendium’s', () => {
    openSave()
    for (const gone of ['Restore', 'Add creatures', 'Delete']) {
      expect(screen.queryByText(gone), gone).toBeNull()
    }
  })
})

describe('ShareEncounterButton', () => {
  it('says what travels before it asks for anything', () => {
    openShare()
    expect(screen.getByText(/no hit points, no effects, no players, no log/)).toBeTruthy()
  })

  it('publishes the cast and shows the link', async () => {
    const { onShare } = openShare()
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

  it('points a signed-in publisher at their account for the list', async () => {
    openShare()
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ambush' } })
    fireEvent.click(screen.getByText('Publish'))
    await waitFor(() =>
      expect(screen.getByText(/account menu, under Shared encounters/)).toBeTruthy(),
    )
  })

  it('refuses a byline that breaks the rules, and says which rule', () => {
    const { onShare } = openShare({ defaultByline: 'OpenFray' })
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ambush' } })
    expect(screen.getByText('That name is reserved. Publish under your own.')).toBeTruthy()
    fireEvent.click(screen.getByText('Publish'))
    expect(onShare).not.toHaveBeenCalled()
  })

  it('warns a signed-out publisher that the link expires and can’t be taken down', () => {
    openShare({ signedIn: false })
    expect(screen.getByText(/stops working after 60 days/)).toBeTruthy()
  })

  it('has nothing to share from a board with no creatures', () => {
    render(
      <ShareEncounterButton
        canShare={false}
        signedIn
        defaultByline=""
        onShare={vi.fn().mockResolvedValue({ status: 'ok', code: 'x' })}
      />,
    )
    expect(screen.getByLabelText('Share this encounter')).toBeDisabled()
  })
})
