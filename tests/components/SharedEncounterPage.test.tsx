// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { FetchedShare } from '../../src/state/shares.ts'

/**
 * The page a stranger's link opens. Two things are being protected here: that nothing
 * reaches anyone's board until they say so, and that the screen stays a reading surface —
 * no control on it may run a fight.
 */

const share = vi.hoisted(() => ({
  result: null as FetchedShare | null,
  resolved: 'ok' as 'ok' | 'wrong' | 'unavailable' | 'failed',
  resolveCalls: [] as string[][],
}))

vi.mock('../../src/state/shares.ts', () => ({
  fetchShare: () => Promise.resolve(share.result),
  resolveReport: (code: string, secret: string, decision: string) => {
    share.resolveCalls.push([code, secret, decision])
    return Promise.resolve(share.resolved)
  },
}))

const GOBLIN = {
  id: 'srd-5.2:goblin',
  source: 'srd-5.2',
  name: 'Goblin',
  size: 'Small',
  type: 'humanoid',
  ac: 15,
  maxHp: 7,
  cr: 0.25,
  speed: { walk: 30 },
  abilities: { str: 8, dex: 15, con: 10, int: 10, wis: 8, cha: 8 },
  senses: { passivePerception: 9 },
  actions: [],
}

vi.mock('../../src/compendium/srd.ts', () => ({
  loadLibraries: () => Promise.resolve({ creatures: [GOBLIN], spells: [] }),
  sourceOfId: (id: string) => id.slice(0, id.indexOf(':')),
  loadSrdCreatures: () => Promise.resolve([GOBLIN]),
  loadSrdSpells: () => Promise.resolve([]),
}))

const { SharedEncounterPage } = await import('../../src/components/SharedEncounterPage.tsx')

afterEach(() => {
  cleanup()
  share.result = null
  share.resolved = 'ok'
  share.resolveCalls = []
  window.location.hash = ''
  delete (window as { fathom?: unknown }).fathom
})

/** Stand in for Fathom, which the real `track` calls through when the script has loaded. */
function countEvents() {
  const trackEvent = vi.fn()
  ;(window as { fathom?: unknown }).fathom = { trackEvent }
  return trackEvent
}

const encounter = (over: Record<string, unknown> = {}, official = false) => ({
  status: 'ok' as const,
  kind: 'encounter',
  official,
  data: {
    v: 1,
    name: 'Goblin ambush',
    entries: [{ ref: 'srd-5.2:goblin', count: 4, side: 'foe' }],
    ...over,
  },
})

describe('SharedEncounterPage', () => {
  it('shows the encounter, its cast and who published it', async () => {
    share.result = encounter({ by: 'Bob', note: 'They **wait** in the rafters.' })
    render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)

    // The name leads the details pane, where the note that explains it is; the byline and
    // the totals close it, on one line.
    await waitFor(() => expect(screen.getByText('Goblin ambush')).toBeInTheDocument())
    expect(screen.getByText(/Encounter by Bob · 4 creatures/)).toBeInTheDocument()
    expect(screen.getByText('Goblin')).toBeInTheDocument()
    expect(screen.getByText('×4')).toBeInTheDocument()
  })

  it('offers a way to report the words, beside the name on them', async () => {
    share.result = encounter({ by: 'Bob', note: 'They wait in the rafters.' })
    render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)
    const report = await screen.findByRole('button', { name: /Report this/ })
    // On the line the byline is on, since that is what a report is about, and next to the
    // caution: between them they say whose words these are and what to do about them.
    expect(report.closest('div')?.textContent).toContain('with caution')
    expect(report.closest('div')?.parentElement?.textContent).toContain('Encounter by Bob')
  })

  it('adds up what beating the encounter is worth', async () => {
    // The goblin's own number, four times over — a reader sizing up a link wants the whole
    // encounter, not a stat block each.
    share.result = encounter()
    render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)
    // Set apart from the rest of the line, because it is the number somebody sizing up a
    // link reads first.
    await waitFor(() => expect(screen.getByText('200 XP').tagName).toBe('STRONG'))
    expect(screen.getByText(/4 creatures ·/)).toBeInTheDocument()
  })

  it('opens on the note, with the words that say whose it is', async () => {
    share.result = encounter({ note: 'They wait in the rafters.' })
    render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)

    await waitFor(() => expect(screen.getByText(/They wait in the rafters/)).toBeInTheDocument())
    // The wording is the maintainer's; what holds is that a stranger's words are marked as
    // needing care, and that the line sits with the report rather than over the prose.
    expect(screen.getByText(/with caution/)).toBeTruthy()
  })

  it('drops the stranger’s-words line from our own encounters', async () => {
    // The flag comes from the database, which knows whose account the row came from — a
    // byline reading "OpenFray" proves nothing, so the page never asks it.
    share.result = encounter({ by: 'OpenFray', note: 'They wait in the rafters.' }, true)
    render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)
    await waitFor(() => expect(screen.getByText(/They wait in the rafters/)).toBeInTheDocument())
    expect(screen.queryByText(/with caution/)).toBeNull()
  })

  it('keeps it on anyone else’s, however they signed the byline', async () => {
    share.result = encounter({ by: 'OpenFray', note: 'They wait in the rafters.' }, false)
    render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)
    await waitFor(() => expect(screen.getByText(/with caution/)).toBeInTheDocument())
  })

  it('keeps the details pane even when nobody wrote a note', async () => {
    // The name and the author line live there, so the row is not the note's to own.
    share.result = encounter()
    render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('Encounter Details')).toBeInTheDocument())
    expect(screen.getByText('Goblin ambush')).toBeInTheDocument()
    // The wording is the maintainer's; what holds is that the absence is stated rather
    // than left as a blank pane the reader has to interpret.
    expect(screen.getByText(/didn’t leave|left no notes/)).toBeInTheDocument()
  })

  it('lets a stranger read it in either theme', async () => {
    // The page is somebody's first contact with OpenFray, and it opens dark by default.
    // The switch is the player view's, in the same corner, so both shared screens agree.
    share.result = encounter()
    render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)
    const toggle = await screen.findByRole('button', { name: /Switch to (light|dark) mode/ })
    fireEvent.click(toggle)
    expect(screen.getByRole('button', { name: /Switch to (light|dark) mode/ })).toBeInTheDocument()
  })

  it('counts a link that resolved, and the reader reaching for the report form', async () => {
    const trackEvent = countEvents()
    share.result = encounter()
    render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)
    await waitFor(() => expect(trackEvent).toHaveBeenCalledWith('Shared encounter opened'))

    fireEvent.click(screen.getByRole('button', { name: /Report this/ }))
    expect(trackEvent).toHaveBeenCalledWith('Report form opened')
  })

  it('counts nothing for a code that resolved to nothing', async () => {
    // A dead link and a reader who got what the link promised are the two outcomes the
    // number has to tell apart, so it is counted where the encounter parsed.
    const trackEvent = countEvents()
    share.result = { status: 'missing' }
    render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)
    await waitFor(() =>
      expect(screen.getByText(/no longer exists|expired|deleted/i)).toBeInTheDocument(),
    )
    expect(trackEvent).not.toHaveBeenCalled()
  })

  describe('the takedown in a report’s mail', () => {
    /** Arrive the way the maintainer does: from the report link, token in the fragment. */
    const withToken = async (token = '3f7a1c92-5b4e-4d81-9a63-0e2c8d5f71ab') => {
      window.location.hash = `#m=${token}`
      share.result = encounter()
      render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)
      await waitFor(() => expect(screen.getByText('Goblin ambush')).toBeInTheDocument())
    }

    it('offers nothing to a reader arriving without one', async () => {
      // Everyone else must not learn the control exists, let alone that a token would work.
      share.result = encounter()
      render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)
      await waitFor(() => expect(screen.getByText('Goblin ambush')).toBeInTheDocument())
      expect(screen.queryByRole('button', { name: /Take it down/ })).toBeNull()
      expect(screen.queryByRole('button', { name: /Leave it up/ })).toBeNull()
    })

    it('ignores a fragment that isn’t shaped like a token', async () => {
      await withToken('nope')
      expect(screen.queryByRole('button', { name: /Take it down/ })).toBeNull()
    })

    it('notices a token pasted into a tab that is already open', async () => {
      // Changing only the fragment reloads nothing, so the token has to be re-read on the
      // event rather than once at mount. This is the shape of a real arrival: the page is
      // up, and the link goes into the address bar of that same tab.
      share.result = encounter()
      render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)
      await waitFor(() => expect(screen.getByText('Goblin ambush')).toBeInTheDocument())
      expect(screen.queryByRole('button', { name: /Take it down/ })).toBeNull()

      window.location.hash = '#m=3f7a1c92-5b4e-4d81-9a63-0e2c8d5f71ab'
      fireEvent(window, new HashChangeEvent('hashchange'))
      expect(screen.getByRole('button', { name: /Take it down/ })).toBeTruthy()
    })

    it('confirms by name, then sends the code and the token', async () => {
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
      await withToken()
      fireEvent.click(screen.getByRole('button', { name: /Take it down/ }))
      expect(confirm.mock.calls[0][0]).toContain('Goblin ambush')
      expect(share.resolveCalls).toEqual([])

      confirm.mockReturnValue(true)
      fireEvent.click(screen.getByRole('button', { name: /Take it down/ }))
      await waitFor(() =>
        expect(screen.getByText('This encounter has been taken down.')).toBeTruthy(),
      )
      expect(share.resolveCalls).toEqual([
        ['k7mqx3rt9p', '3f7a1c92-5b4e-4d81-9a63-0e2c8d5f71ab', 'taken_down'],
      ])
      // Spent: a reload must not offer it again, and it must leave the tab's history.
      expect(window.location.hash).toBe('')
      confirm.mockRestore()
    })

    it('leaves the encounter standing when the report is dismissed', async () => {
      // The other half of a decision, and the one that has to keep the page: nothing was
      // deleted, so the reader stays where they are and only the controls are answered.
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
      await withToken()
      fireEvent.click(screen.getByRole('button', { name: /Leave it up/ }))
      await waitFor(() => expect(screen.getByText(/stays up/)).toBeTruthy())
      expect(share.resolveCalls[0][2]).toBe('dismissed')
      // The encounter is still readable, and the decision cannot be made twice.
      expect(screen.getByText('Goblin ambush')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Take it down/ })).toBeNull()
      expect(window.location.hash).toBe('')
      confirm.mockRestore()
    })

    it('says a token that didn’t work didn’t work, and never why', async () => {
      // Expired, already down, or simply wrong are one sentence to whoever holds the link.
      // Telling them apart would tell a stranger with a guessed token what to try next.
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
      share.resolved = 'wrong'
      await withToken()
      fireEvent.click(screen.getByRole('button', { name: /Take it down/ }))
      await waitFor(() => expect(screen.getByText(/Couldn’t answer this report/)).toBeTruthy())
      expect(screen.queryByText('This encounter has been taken down.')).toBeNull()
      confirm.mockRestore()
    })
  })

  it('adds nothing until the reader says so', async () => {
    const onAdd = vi.fn()
    share.result = encounter()
    render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={onAdd} />)
    await waitFor(() => screen.getByText('Goblin ambush'))
    expect(onAdd).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Add to my board' }))
    expect(onAdd).toHaveBeenCalledTimes(1)
    // The parsed template, not the raw payload: whatever reaches a board went through the door.
    expect(onAdd.mock.calls[0][0]).toMatchObject({ v: 1, name: 'Goblin ambush' })
  })

  it('names a creature it can’t resolve rather than quietly dropping it', async () => {
    share.result = {
      status: 'ok',
      kind: 'encounter',
      official: false,
      data: {
        v: 1,
        name: 'Ambush',
        entries: [
          { ref: 'srd-5.2:goblin', count: 1, side: 'foe' },
          { ref: 'kobold-press-tob9:wyrm', count: 1, side: 'foe' },
        ],
      },
    }
    render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)
    await waitFor(() => expect(screen.getByText(/One creature isn’t/)).toBeInTheDocument())
  })

  it('says a dead link is dead, and what to do about it', async () => {
    // The wording is the maintainer's to tune; what has to hold is that a code resolving to
    // nothing reads as gone rather than broken, and points somewhere.
    share.result = { status: 'missing' }
    render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)
    await waitFor(() =>
      expect(screen.getByText(/no longer exists|expired|deleted/i)).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: 'Open the console' })).toBeInTheDocument()
  })

  it('refuses a payload that isn’t a readable encounter', async () => {
    share.result = {
      status: 'ok',
      kind: 'encounter',
      official: false,
      data: { v: 1, name: '', entries: [] },
    }
    render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)
    await waitFor(() => expect(screen.getByText(/can’t be read/)).toBeInTheDocument())
  })

  it('is a reading surface: nothing on it can run a fight', async () => {
    share.result = encounter({ note: 'Wait.' })
    render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)
    await waitFor(() => screen.getByText('Goblin ambush'))

    // Every control is either navigation (which pane to read) or the one deliberate action.
    // Nothing that rolls, damages, heals, edits or advances a turn may appear here — this
    // fails the day the read-only screen grows a live button by accident.
    const combat = /roll|damage|heal|apply|begin|next turn|cast|recharge|edit|delete|remove|save/i
    const buttons = screen.getAllByRole('button')
    for (const button of buttons) {
      expect(button.textContent ?? '', 'a control that runs a fight').not.toMatch(combat)
    }
    expect(buttons.filter((b) => b.textContent === 'Add to my board')).toHaveLength(1)
    // The stat block renders read-only: no hit points to edit, no action to resolve.
    expect(screen.queryByLabelText(/hit points/i)).toBeNull()
  })
})
