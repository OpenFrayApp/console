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
})

const encounter = (over: Record<string, unknown> = {}) => ({
  status: 'ok' as const,
  kind: 'encounter',
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

    await waitFor(() => expect(screen.getByText('Goblin ambush')).toBeInTheDocument())
    expect(screen.getByText(/Encounter by Bob · 4 creatures/)).toBeInTheDocument()
    expect(screen.getByText('Goblin')).toBeInTheDocument()
    expect(screen.getByText('×4')).toBeInTheDocument()
  })

  it('opens on the note, with the words that say whose it is', async () => {
    share.result = encounter({ note: 'They wait in the rafters.' })
    render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)

    await waitFor(() => expect(screen.getByText(/They wait in the rafters/)).toBeInTheDocument())
    // Provenance, not a warning about links — the allowlist already made them unclickable.
    expect(screen.getByText(/Written by whoever shared this link, not by OpenFray/)).toBeTruthy()
  })

  it('opens on the first creature when there is no note', async () => {
    share.result = encounter()
    render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)
    await waitFor(() => expect(screen.getAllByText('Goblin').length).toBeGreaterThan(1))
    expect(screen.queryByText('Notes')).toBeNull()
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

  it('says a dead link is dead, and why it might be', async () => {
    share.result = { status: 'missing' }
    render(<SharedEncounterPage code="k7mqx3rt9p" onAdd={vi.fn()} />)
    await waitFor(() => expect(screen.getByText(/isn’t here any more/)).toBeInTheDocument())
    expect(screen.getByText(/after 60 days/)).toBeInTheDocument()
  })

  it('refuses a payload that isn’t a readable encounter', async () => {
    share.result = { status: 'ok', kind: 'encounter', data: { v: 1, name: '', entries: [] } }
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

/**
 * The spell-coverage gate, read backwards.
 *
 * Forwards it says every spell the app *ships* has a verdict, because a missing one is
 * otherwise invisible (`tests/combat/spellCoverage.test.ts`). Backwards the question is a
 * different one: an embedded creature names spell refs, and the recipient may have no entry
 * for them. That is deliberately still silent — nothing on this page casts anything, and on
 * the board the cast modal already says "No compendium entry for this spell" rather than
 * failing quietly.
 *
 * What was *not* deliberate is this: the page fetched only the libraries its `ref` entries
 * named, and an embedded creature contributes none. A homebrew boss casting Fireball would
 * therefore resolve nothing at all — not because the reader lacked the spell, but because
 * the page never asked for the file it lives in.
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
