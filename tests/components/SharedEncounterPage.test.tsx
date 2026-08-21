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

const share = vi.hoisted(() => ({ result: null as FetchedShare | null }))
/** Which libraries the page decided its cast needs — see the spell-refs case at the foot. */
const asked = vi.hoisted(() => ({ sources: [] as string[] }))

vi.mock('../../src/state/shares.ts', () => ({
  fetchShare: () => Promise.resolve(share.result),
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
  loadLibraries: (sources: string[]) => {
    asked.sources = [...sources]
    return Promise.resolve({ creatures: [GOBLIN], spells: [] })
  },
  sourceOfId: (id: string) => id.slice(0, id.indexOf(':')),
  loadSrdCreatures: () => Promise.resolve([GOBLIN]),
  loadSrdSpells: () => Promise.resolve([]),
}))

const { SharedEncounterPage } = await import('../../src/components/SharedEncounterPage.tsx')

afterEach(() => {
  cleanup()
  share.result = null
  asked.sources = []
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
    expect(screen.getByText(/Shared by Bob · 4 creatures/)).toBeInTheDocument()
    expect(screen.getByText('Goblin')).toBeInTheDocument()
    expect(screen.getByText('×4')).toBeInTheDocument()
  })

  it('tells a stranger nothing about a page having been taken down', async () => {
    share.result = { status: 'takenDown' }
    render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)

    // The same sentence a mistyped code gets. Whether somebody's work was moderated is not a
    // stranger's business, so the two are deliberately indistinguishable here.
    await waitFor(() =>
      expect(screen.getByText(/no longer exists or it never did/)).toBeInTheDocument(),
    )
    expect(screen.queryByText(/taken down|breach|reported/i)).not.toBeInTheDocument()
  })

  it('stops short of sending them to ask for a page that is not coming back', async () => {
    share.result = { status: 'takenDown' }
    render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)
    await waitFor(() =>
      expect(screen.getByText(/no longer exists or it never did/)).toBeInTheDocument(),
    )
    expect(screen.queryByText(/ask them to create the encounter again/)).not.toBeInTheDocument()
  })

  it('does send them to ask when the code may simply be wrong', async () => {
    share.result = { status: 'missing' }
    render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)
    await waitFor(() =>
      expect(screen.getByText(/ask them to create the encounter again/)).toBeInTheDocument(),
    )
  })

  it('offers a way to report the words, beside the name on them', async () => {
    share.result = encounter({ by: 'Bob', note: 'They wait in the rafters.' })
    render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)
    const report = await screen.findByRole('button', { name: /Report this/ })
    // On the line the byline is on, since that is what a report is about, and next to the
    // caution: between them they say whose words these are and what to do about them.
    expect(report.closest('div')?.textContent).toContain('with caution')
    expect(report.closest('div')?.parentElement?.textContent).toContain('Shared by Bob')
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

  describe('what the page says about reuse', () => {
    it('records that nobody spoke, rather than calling it free or reserved', async () => {
      // Copyright reserves everything by default, so an absent license is neither. The
      // line says nobody said, which is the only true thing available.
      share.result = encounter()
      render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)
      // Read across the whole footer: the byline, the totals and the license share it,
      // and where each sits on the line is the maintainer's to arrange.
      const line = (await screen.findByText(/creatures? ·/)).closest('div')!
      expect(line.textContent).toContain('No public license stated')
    })

    it('names the encounter’s own license when its author gave one', async () => {
      share.result = encounter({ license: 'cc-by-4.0' })
      render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)
      const line = (await screen.findByText(/creatures? ·/)).closest('div')!
      expect(line.textContent).toContain('CC BY 4.0')
      // The cast is all unstated, so the whole is unknown and no summary is claimed for it.
      expect(line.textContent).not.toContain('Strictest here')
    })

    it('never summarizes the whole as looser than something in it', async () => {
      // The encounter says CC BY; a creature in it says all rights reserved. Summarizing
      // as CC BY would tell a reader they may reuse a stat block whose author said no.
      share.result = {
        status: 'ok',
        kind: 'encounter',
        official: false,
        data: {
          v: 1,
          name: 'Mixed',
          license: 'cc-by-4.0',
          entries: [
            {
              creature: { ...GOBLIN, id: 'custom:1', source: 'custom', license: 'reserved' },
              count: 1,
              side: 'foe',
            },
          ],
        },
      }
      render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)
      const line = (await screen.findByText(/creatures? ·/)).closest('div')!
      expect(line.textContent).toContain('Strictest here: All rights reserved')
      // The cast row says what the creature is, not what it may be reused for: that is the
      // stat block's own source line to state, once, where somebody reading it will be.
      const row = screen.getByRole('button', { name: /Goblin/ })
      expect(row.textContent).not.toContain('All rights reserved')
    })
  })

  describe('a shared creature, the second kind under /s/', () => {
    const shared = (over: Record<string, unknown> = {}, official = false) => ({
      status: 'ok' as const,
      kind: 'creature',
      official,
      data: { v: 1, ref: 'srd-5.2:goblin', ...over },
    })

    it('shows the stat block and offers it, without a cast to browse', async () => {
      share.result = shared({ note: 'Runs at half hit points.', by: 'Bob' })
      const onAdd = vi.fn()
      render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={onAdd} />)
      await waitFor(() => expect(screen.getByText('Goblin')).toBeInTheDocument())
      expect(screen.getByText(/Runs at half hit points/)).toBeTruthy()
      // The byline shares its line with what the creature says it may be reused for.
      // Shared by, not "creature by": publishing a creature is not a claim to have written
      // it, and the SRD goblin here was written by somebody else entirely. The license is
      // the stat block's to state, and is not repeated beside the byline.
      expect(screen.getByText('Shared by Bob').textContent).not.toContain('CC BY')

      // Adding one creature is adding an encounter of one, so the staging the console
      // already does for a cast carries it without knowing there was a difference.
      fireEvent.click(screen.getByRole('button', { name: 'Use this creature' }))
      expect(onAdd.mock.calls[0][0]).toMatchObject({
        v: 1,
        entries: [{ ref: 'srd-5.2:goblin', count: 1, side: 'foe' }],
      })
    })

    it('names a creature this version can’t resolve rather than showing nothing', async () => {
      // A reference resolves against the compendium the app ships, not against what the
      // reader has switched on — so this is the library-we-don't-carry case, not a setting.
      share.result = shared({ ref: 'some-book-we-never-shipped:wyrm' })
      render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)
      await waitFor(() =>
        expect(screen.getByText(/isn’t in this version of the compendium/)).toBeTruthy(),
      )
      // Nothing to add, because there is nothing resolved to add.
      expect(screen.queryByRole('button', { name: 'Use this creature' })).toBeNull()
    })

    it('refuses a creature payload that isn’t one', async () => {
      share.result = { status: 'ok', kind: 'creature', official: false, data: { v: 1 } }
      render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)
      await waitFor(() => expect(screen.getByText(/can’t be read/)).toBeInTheDocument())
    })
  })

  describe('a creature its author asked nobody reuse', () => {
    const reserved = {
      creature: { ...GOBLIN, id: 'custom:1', source: 'custom', license: 'reserved' },
      count: 1,
      side: 'foe',
    }

    /** A cast with one creature its author reserved, and one anybody may take. */
    const mixed = () => ({
      status: 'ok' as const,
      kind: 'encounter',
      official: false,
      data: {
        v: 1,
        name: 'Mixed',
        entries: [reserved, { ref: 'srd-5.2:goblin', count: 2, side: 'foe' }],
      },
    })

    it('asks before adding, at the moment the reader is deciding', async () => {
      // Not a notice somewhere above the button: what they are about to get is less than
      // what is on screen, and that is worth saying where the decision is made.
      const onAdd = vi.fn()
      share.result = mixed()
      render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={onAdd} />)
      await waitFor(() => screen.getByText('Mixed'))
      // Nothing is said until they reach for it.
      expect(screen.queryByText(/stay behind/)).toBeNull()

      fireEvent.click(screen.getByRole('button', { name: 'Use this encounter' }))
      const dialog = screen.getByRole('dialog')
      expect(dialog.textContent).toContain('Some creatures stay behind')
      // Named in the dialog, so the reader knows which of the cast is staying put.
      expect(dialog.querySelector('li')?.textContent).toBe('Goblin')
      expect(onAdd).not.toHaveBeenCalled()
    })

    it('adds nothing at all when the reader cancels', async () => {
      const onAdd = vi.fn()
      share.result = mixed()
      render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={onAdd} />)
      await waitFor(() => screen.getByText('Mixed'))
      fireEvent.click(screen.getByRole('button', { name: 'Use this encounter' }))
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(onAdd).not.toHaveBeenCalled()
      expect(screen.queryByText('Some creatures stay behind')).toBeNull()
    })

    it('adds the rest, without the one that was reserved', async () => {
      const onAdd = vi.fn()
      share.result = mixed()
      render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={onAdd} />)
      await waitFor(() => screen.getByText('Mixed'))
      fireEvent.click(screen.getByRole('button', { name: 'Use this encounter' }))
      fireEvent.click(screen.getByRole('button', { name: 'Use the rest' }))
      expect(onAdd.mock.calls[0][0].entries).toEqual([
        { ref: 'srd-5.2:goblin', count: 2, side: 'foe' },
      ])
    })

    it('offers nothing at all when the whole cast is reserved', async () => {
      // The button would have nothing to do, and offering it only to explain that it does
      // nothing is worse than not offering it. The encounter still reads.
      share.result = {
        status: 'ok',
        kind: 'encounter',
        official: false,
        data: { v: 1, name: 'All reserved', entries: [reserved] },
      }
      render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)
      await waitFor(() => screen.getByText('All reserved'))
      expect(screen.queryByRole('button', { name: 'Use this encounter' })).toBeNull()
      // Still readable: publishing it was the author's choice, and reading is not copying.
      expect(screen.getByText('Encounter Details')).toBeTruthy()
    })

    it('asks nothing when every creature may be copied', async () => {
      const onAdd = vi.fn()
      share.result = encounter()
      render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={onAdd} />)
      await waitFor(() => screen.getByText('Goblin ambush'))
      fireEvent.click(screen.getByRole('button', { name: 'Use this encounter' }))
      expect(onAdd).toHaveBeenCalledTimes(1)
    })

    it('offers no way to take a copy of a shared creature', async () => {
      share.result = {
        status: 'ok',
        kind: 'creature',
        official: false,
        data: {
          v: 1,
          creature: { ...GOBLIN, id: 'custom:1', source: 'custom', license: 'reserved' },
        },
      }
      render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)
      await waitFor(() => expect(screen.getByText('Goblin')).toBeInTheDocument())
      expect(screen.queryByRole('button', { name: 'Use this encounter' })).toBeNull()
    })
  })

  it('adds nothing until the reader says so', async () => {
    const onAdd = vi.fn()
    share.result = encounter()
    render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={onAdd} />)
    await waitFor(() => screen.getByText('Goblin ambush'))
    expect(onAdd).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Use this encounter' }))
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
    expect(buttons.filter((b) => b.textContent === 'Use this encounter')).toHaveLength(1)
    // The stat block renders read-only: no hit points to edit, no action to resolve.
    expect(screen.queryByLabelText(/hit points/i)).toBeNull()
  })
})

/**
 * The spell-coverage gate read backwards: an embedded creature names spell refs the recipient
 * may have no entry for. That stays silent deliberately — nothing here casts, and on the board
 * the cast modal already says "No compendium entry for this spell".
 *
 * What wasn't deliberate: the page fetched only the libraries its `ref` entries named, and an
 * embedded creature contributes none, so a homebrew boss casting Fireball resolved nothing.
 */
describe('SharedEncounterPage — the libraries a cast needs', () => {
  const homebrew = (over: Record<string, unknown> = {}) => ({
    id: 'custom:boss',
    source: 'custom',
    name: 'Ash Warden',
    size: 'Large',
    type: 'elemental',
    ac: 16,
    maxHp: 90,
    speed: { walk: 30 },
    abilities: { str: 18, dex: 12, con: 16, int: 10, wis: 14, cha: 10 },
    senses: { passivePerception: 12 },
    ...over,
  })

  it('asks for the library an embedded creature’s spells live in', async () => {
    share.result = encounter({
      entries: [
        {
          creature: homebrew({
            spellcasting: {
              groups: [
                {
                  usage: { type: 'perDay', per: 2 },
                  spells: [{ name: 'Fireball', ref: 'srd-5.2:fireball' }],
                },
              ],
            },
          }),
          count: 1,
          side: 'foe',
        },
      ],
    })
    render(<SharedEncounterPage code="abc" onAdd={vi.fn()} />)
    await screen.findAllByText('Ash Warden')
    // Without this the cast is all homebrew, so nothing would be fetched and a spell the
    // reader plainly has would show no card.
    await waitFor(() => expect(asked.sources).toEqual(['srd-5.2']))
  })

  it('still asks for nothing when a homebrew cast names no spells at all', async () => {
    share.result = encounter({ entries: [{ creature: homebrew(), count: 1, side: 'foe' }] })
    render(<SharedEncounterPage code="abc" onAdd={vi.fn()} />)
    await screen.findAllByText('Ash Warden')
    // The whole point of the targeted loader: a public page doesn't pull five megabytes of
    // compendium to draw one stat block it already carries.
    await waitFor(() => expect(asked.sources).toEqual([]))
  })

  it('asks once for a library both a ref and an embedded spell name', async () => {
    share.result = encounter({
      entries: [
        { ref: 'srd-5.2:goblin', count: 2, side: 'foe' },
        {
          creature: homebrew({
            spellcasting: {
              groups: [
                { usage: { type: 'atWill' }, spells: [{ name: 'Light', ref: 'srd-5.2:light' }] },
              ],
            },
          }),
          count: 1,
          side: 'foe',
        },
      ],
    })
    render(<SharedEncounterPage code="abc" onAdd={vi.fn()} />)
    await screen.findAllByText('Ash Warden')
    await waitFor(() => expect(asked.sources).toEqual(['srd-5.2']))
  })
})
