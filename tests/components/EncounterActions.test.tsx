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
  fireEvent.click(screen.getByLabelText('Save this encounter'))
  return handlers
}

/** Open the share control, already unfolded. */
function openShare(props: Partial<Parameters<typeof ShareEncounterButton>[0]> = {}) {
  const handlers = {
    onShare: vi.fn().mockResolvedValue({ status: 'ok', code: 'k7mqx3rt9p' }),
    onSignIn: vi.fn(),
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
  it('says what travels, and warns against putting a secret in the note', () => {
    // The wording is the maintainer's; what has to hold is that a publisher is told the
    // link is public and that the note goes with it, before they have written one.
    openShare()
    expect(screen.getByText(/Share a public link/)).toBeTruthy()
    expect(screen.getByText(/Do not share passwords/)).toBeTruthy()
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
        // Nobody chose one, and the dialog says so rather than picking on their behalf.
        license: 'unstated',
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

  it('picks up the account’s name when it arrives after the board has rendered', () => {
    // The session resolves long after this control mounts, so a value seeded once at mount
    // left the field empty for every signed-in Game Master.
    const { rerender } = render(
      <ShareEncounterButton
        canShare
        signedIn
        defaultByline=""
        onShare={vi.fn().mockResolvedValue({ status: 'ok', code: 'k7mqx3rt9p' })}
        onSignIn={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByLabelText('Share this encounter'))
    expect((screen.getByLabelText('Your name (optional)') as HTMLInputElement).value).toBe('')

    rerender(
      <ShareEncounterButton
        canShare
        signedIn
        defaultByline="Nico Mustone"
        onShare={vi.fn().mockResolvedValue({ status: 'ok', code: 'k7mqx3rt9p' })}
        onSignIn={vi.fn()}
      />,
    )
    expect((screen.getByLabelText('Your name (optional)') as HTMLInputElement).value).toBe(
      'Nico Mustone',
    )
  })

  it('leaves a typed name alone when the account’s arrives late', () => {
    // Once the Game Master has typed, the field is theirs.
    const { rerender } = render(
      <ShareEncounterButton
        canShare
        signedIn
        defaultByline=""
        onShare={vi.fn().mockResolvedValue({ status: 'ok', code: 'k7mqx3rt9p' })}
        onSignIn={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByLabelText('Share this encounter'))
    fireEvent.change(screen.getByLabelText('Your name (optional)'), {
      target: { value: 'Bob' },
    })
    rerender(
      <ShareEncounterButton
        canShare
        signedIn
        defaultByline="Nico Mustone"
        onShare={vi.fn().mockResolvedValue({ status: 'ok', code: 'k7mqx3rt9p' })}
        onSignIn={vi.fn()}
      />,
    )
    expect((screen.getByLabelText('Your name (optional)') as HTMLInputElement).value).toBe('Bob')
  })

  it('lets a granted publisher use a reserved name', () => {
    // The database says who holds those names; this component is only told yes or no.
    render(
      <ShareEncounterButton
        canShare
        signedIn
        allowReserved
        defaultByline="OpenFray"
        onShare={vi.fn().mockResolvedValue({ status: 'ok', code: 'k7mqx3rt9p' })}
        onSignIn={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByLabelText('Share this encounter'))
    expect(screen.queryByText('That name is reserved. Publish under your own.')).toBeNull()
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ambush' } })
    expect(screen.getByText('Publish')).not.toBeDisabled()
  })

  /** Publish, and wait for the panel to show the link it got back. */
  const publish = async () => {
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ambush' } })
    fireEvent.click(screen.getByText('Publish'))
    await waitFor(() => expect(screen.getByLabelText('Share link')).toBeTruthy())
  }

  it('asks a signed-out Game Master to make an account, rather than refusing them', () => {
    // The moment somebody wants to hand an encounter to a friend is the moment an account is
    // worth the most to them, so the dialog opens as usual and makes the case.
    const { onSignIn } = openShare({ signedIn: false })
    expect(screen.getByText(/Sharing an encounter needs an account/)).toBeTruthy()
    expect(screen.queryByLabelText('Name')).toBeNull()
    expect(screen.queryByText('Publish')).toBeNull()

    fireEvent.click(screen.getByText('Sign in to share'))
    expect(onSignIn).toHaveBeenCalled()
    // And the dialog goes with it. The account screen opens over the app, so one left behind
    // is still sitting there when they come back from signing in.
    expect(screen.queryByText(/Sharing an encounter needs an account/)).toBeNull()
  })

  it('says what the account changes about the link', () => {
    openShare({ signedIn: false })
    expect(screen.getByText(/stands until you take it down/)).toBeTruthy()
    expect(screen.getByText(/listed in one place/)).toBeTruthy()
  })

  it('starts on unstated when the account has nothing to remember', async () => {
    openShare({ signedIn: true, defaultLicense: 'unstated' })
    expect(screen.getByLabelText('Encounter license')).toHaveValue('unstated')
  })

  it('is seeded by the account default, and follows it when it arrives late', () => {
    // The session resolves after the board has rendered, so a control seeded once at mount
    // would sit on the value that existed before the account did.
    const { rerender } = render(
      <ShareEncounterButton
        canShare
        signedIn
        defaultByline=""
        defaultLicense="unstated"
        onShare={vi.fn()}
        onSignIn={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByLabelText('Share this encounter'))
    rerender(
      <ShareEncounterButton
        canShare
        signedIn
        defaultByline=""
        defaultLicense="cc-by-4.0"
        onShare={vi.fn()}
        onSignIn={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('Encounter license')).toHaveValue('cc-by-4.0')
  })

  it('lets a publisher override the default without changing it', async () => {
    // The default fills the control; it never replaces it. Overriding here publishes the
    // override and writes nothing back to the account.
    const { onShare } = openShare({ signedIn: true, defaultLicense: 'cc-by-4.0' })
    expect(screen.getByLabelText('Encounter license')).toHaveValue('cc-by-4.0')
    fireEvent.change(screen.getByLabelText('Encounter license'), {
      target: { value: 'reserved' },
    })
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ambush' } })
    fireEvent.click(screen.getByText('Publish'))
    await waitFor(() => expect(onShare).toHaveBeenCalled())
    expect(onShare.mock.calls[0][0]).toMatchObject({ license: 'reserved' })
  })

  it('leaves out the creatures that may not be passed on, and says which', async () => {
    // Every import from the browser extension lands on all rights reserved, because what it
    // reads is a paid book. An encounter carrying one would publish that stat block just as
    // surely as sharing it alone, so it goes rather than being offered as a choice.
    const { onShare } = openShare({ restricted: ['Ghast of Leng', 'Pale Nurse'] })
    expect(screen.getByText(/not allowed to republish/)).toBeTruthy()
    expect(screen.getByText('Ghast of Leng, Pale Nurse')).toBeTruthy()
    expect(screen.queryByText(/Publish without/)).toBeNull()

    fireEvent.click(screen.getByText('Publish'))
    await waitFor(() => expect(onShare).toHaveBeenCalled())
  })

  it('refuses to publish when they are the whole cast', async () => {
    // What is left would be an empty encounter, which is not worth a link.
    openShare({ restricted: ['Ghast of Leng'], canDropRestricted: false })
    expect(screen.getByText(/nothing left to share/)).toBeTruthy()
    expect(screen.getByText('Publish')).toBeDisabled()
  })

  it('says nothing at all when every creature is the publisher’s to share', async () => {
    openShare()
    expect(screen.queryByText(/may not be passed on/)).toBeNull()
  })

  it('publishes a board that has no name typed for it', async () => {
    // The board having a cast is the only thing that was ever really required. The name it
    // is stored under is decided where the template is written, not here.
    const { onShare } = openShare({ signedIn: true })
    expect(screen.getByText('Publish')).not.toBeDisabled()
    fireEvent.click(screen.getByText('Publish'))
    await waitFor(() => expect(onShare).toHaveBeenCalled())
    expect(onShare.mock.calls[0][0]).toMatchObject({ name: '' })
  })

  it('hands out one link and no secret to keep', async () => {
    // A takedown link nobody saves is a takedown nobody has. Publishing gives out the
    // share link and nothing else; the way back is the report form, which reaches a person.
    openShare({ signedIn: true })
    await publish()
    expect((screen.getByLabelText('Share link') as HTMLInputElement).value).toBe(
      'http://localhost:3000/s/k7mqx3rt9p',
    )
    expect(screen.queryByLabelText('Takedown link')).toBeNull()
    expect(Object.keys(sessionStorage).filter((k) => k.includes('revoke'))).toEqual([])
  })

  it('points a signed-in publisher at the list on their account', async () => {
    openShare({ signedIn: true })
    await publish()
    expect(screen.getByText(/account menu/)).toBeTruthy()
  })

  it('has no deadline to warn about, now that every link has an owner', () => {
    // The sixty days belonged to rows nobody owned: unlistable, untakeable-down, so ageing
    // out was their only end. Publishing needs an account, so no such row exists.
    openShare({ signedIn: true })
    expect(screen.queryByText(/60 days/)).toBeNull()
    cleanup()
    openShare({ signedIn: false })
    expect(screen.queryByText(/60 days/)).toBeNull()
  })

  it('tells a signed-in publisher their link stands until they take it down', async () => {
    openShare({ signedIn: true })
    await publish()
    expect(screen.getByText(/stands until you take it down/)).toBeTruthy()
    expect(screen.queryByText(/60 days/)).toBeNull()
  })

  it('has nothing to share from a board with no creatures', () => {
    render(
      <ShareEncounterButton
        canShare={false}
        signedIn
        defaultByline=""
        onShare={vi.fn().mockResolvedValue({ status: 'ok', code: 'x' })}
        onSignIn={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('Share this encounter')).toBeDisabled()
  })
})
