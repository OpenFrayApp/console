// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { PlayerBoard } from '../../../src/combat/playerView.ts'
import type { PlayerLinkStatus } from '../../../src/state/playerChannel.ts'
import { PlayerView } from '../../../src/components/player/PlayerView.tsx'

const link = vi.hoisted(() => ({
  status: 'connecting' as PlayerLinkStatus,
  board: null as PlayerBoard | null,
  pinRejected: false,
}))

vi.mock('../../../src/state/playerChannel.ts', () => ({
  usePlayerBoard: () => link,
}))

afterEach(() => {
  cleanup()
  link.status = 'connecting'
  link.board = null
  link.pinRejected = false
})

function board(overrides: Partial<PlayerBoard> = {}): PlayerBoard {
  return {
    round: 2,
    paused: false,
    activeId: 'm',
    rows: [
      {
        id: 'p',
        initiative: 17,
        name: 'Thalia',
        isFoe: false,
        status: 'active',
        hp: { kind: 'exact', current: 22, max: 40, temp: 0 },
        ac: 16,
        effects: [],
        concentrating: false,
      },
      {
        id: 'm',
        initiative: 12,
        name: 'Ogre',
        isFoe: true,
        status: 'active',
        hp: { kind: 'tier', tier: 'bloodied' },
        effects: [{ id: 'e1', label: 'Frightened', icon: 'condition' }],
        concentrating: false,
      },
    ],
    log: [{ id: '2-0', round: 2, category: 'turn', message: 'Round 2' }],
    ...overrides,
  }
}

describe('PlayerView — before a board arrives', () => {
  it('says it is connecting while the link is opening', () => {
    render(<PlayerView code="tuesday-game" />)
    expect(screen.getByText('Connecting…')).toBeInTheDocument()
  })

  it('tells the reader to wait, and names the link they are on', () => {
    link.status = 'waiting'
    render(<PlayerView code="tuesday-game" />)
    expect(screen.getByText('Waiting for the Game Master.')).toBeInTheDocument()
    expect(screen.getByText('tuesday-game')).toBeInTheDocument()
  })

  it('says plainly when this copy of the app has no sharing at all', () => {
    link.status = 'unavailable'
    render(<PlayerView code="x" />)
    expect(screen.getByText(/aren’t available on this copy/)).toBeInTheDocument()
  })
})

describe('PlayerView — live', () => {
  it('shows the round, whose turn it is, and the tracker', () => {
    link.status = 'live'
    link.board = board()
    render(<PlayerView code="x" />)
    // "Round 2" reads twice on purpose — the standing line and the log's own entry —
    // and the active creature's name appears in both the standing line and its row.
    expect(screen.getAllByText(/Round 2/)).toHaveLength(2)
    expect(screen.getAllByText('Ogre')).toHaveLength(2)
    expect(screen.getByText('’s turn', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('Thalia')).toBeInTheDocument()
  })

  it('renders a creature`s wound as a word and a character`s as numbers', () => {
    link.status = 'live'
    link.board = board()
    render(<PlayerView code="x" />)
    expect(screen.getByText('Bloodied')).toBeInTheDocument()
    expect(screen.getByText('22')).toBeInTheDocument()
    expect(screen.getByText('/40')).toBeInTheDocument()
  })

  it('shows an armor class only for the rows that carry one', () => {
    link.status = 'live'
    link.board = board()
    render(<PlayerView code="x" />)
    expect(screen.getByText('AC 16')).toBeInTheDocument()
    expect(screen.queryByText('AC 11')).toBeNull()
  })

  it('asks for the PIN when the link is locked, and names a wrong try', () => {
    link.status = 'locked'
    render(<PlayerView code="x" />)
    expect(screen.getByText('This view is locked.')).toBeInTheDocument()
    expect(screen.getByLabelText('PIN digit 1')).toBeInTheDocument()
    expect(screen.queryByText(/doesn’t match/)).toBeNull()

    cleanup()
    link.status = 'locked'
    link.pinRejected = true
    render(<PlayerView code="x" />)
    expect(screen.getByText(/That PIN doesn’t match/)).toBeInTheDocument()
  })

  it('paints a bundled backdrop behind a live board, and nothing for an unknown id', () => {
    link.status = 'live'
    link.board = { ...board(), background: 'mountain-fortress' }
    const { container } = render(<PlayerView code="x" />)
    expect(container.querySelector('[data-backdrop="mountain-fortress"]')).not.toBeNull()

    cleanup()
    link.status = 'live'
    link.board = { ...board(), background: 'not-shipped' }
    const { container: bare } = render(<PlayerView code="x" />)
    expect(bare.querySelector('[data-backdrop]')).toBeNull()
  })

  it('heads the screen with the campaign and Game Master when the board carries them', () => {
    link.status = 'live'
    link.board = { ...board(), campaign: 'Curse of Strahd', gm: 'Nico' }
    render(<PlayerView code="x" />)
    expect(screen.getByText('Curse of Strahd')).toBeInTheDocument()
    expect(screen.getByText('Run by Nico')).toBeInTheDocument()
  })

  it('shows neither identity line when the board carries no names', () => {
    link.status = 'live'
    link.board = board()
    render(<PlayerView code="x" />)
    expect(screen.queryByText(/Run by/)).toBeNull()
  })

  it('says the fight is held rather than showing a stale turn', () => {
    link.status = 'live'
    link.board = board({ paused: true, activeId: null })
    render(<PlayerView code="x" />)
    expect(screen.getByText(/Paused/)).toBeInTheDocument()
    expect(screen.queryByText(/’s turn/)).toBeNull()
  })

  it('shows the summary of the fight the GM just ended', () => {
    link.status = 'live'
    link.board = board({
      round: 0,
      activeId: null,
      log: [],
      recap: {
        outcome: 'victory',
        difficulty: 'hard',
        rounds: 3,
        inGameSeconds: 18,
        activeMs: 60_000,
        totalXp: 450,
        partySize: 3,
        xpPerPlayer: 150,
        damageDealtTotal: 88,
        damageTakenTotal: 41,
        spellsCast: 0,
        effectsApplied: 0,
        knockouts: 1,
        awards: [{ title: 'Biggest hit', label: 'Thalia', amount: 22 }],
        showXp: true,
      },
    })
    render(<PlayerView code="x" />)
    expect(screen.getByText('How the encounter went')).toBeInTheDocument()
    expect(screen.getByText('Victory')).toBeInTheDocument()
    expect(screen.getByText('450')).toBeInTheDocument()
    expect(screen.getByText('Biggest hit')).toBeInTheDocument()
  })

  it('leaves experience out of a milestone campaign`s summary', () => {
    link.status = 'live'
    const shown = board()
    link.board = board({
      recap: {
        outcome: 'inconclusive',
        difficulty: null,
        rounds: 1,
        inGameSeconds: 6,
        activeMs: 1000,
        totalXp: 450,
        partySize: 3,
        xpPerPlayer: 150,
        damageDealtTotal: 0,
        damageTakenTotal: 0,
        spellsCast: 0,
        effectsApplied: 0,
        knockouts: 0,
        awards: [],
        showXp: false,
      },
      rows: shown.rows,
    })
    render(<PlayerView code="x" />)
    expect(screen.queryByText('Experience')).toBeNull()
    expect(screen.getByText('Combat ended')).toBeInTheDocument()
  })

  it('ticks the fight`s clocks when the GM shares them', () => {
    link.status = 'live'
    link.board = board({ timers: { activeMs: 90_000, runningSince: null } })
    render(<PlayerView code="x" />)
    expect(screen.getByText('1:30')).toBeInTheDocument() // real time, paused clock
    expect(screen.getByText('0:12')).toBeInTheDocument() // in-game: round 2 × 6s
  })

  it('shows no clocks when the board carries none', () => {
    link.status = 'live'
    link.board = board()
    render(<PlayerView code="x" />)
    expect(screen.queryByText(/In-game/)).toBeNull()
  })

  it('has no summary while the fight is running', () => {
    link.status = 'live'
    link.board = board()
    render(<PlayerView code="x" />)
    expect(screen.queryByText('How the encounter went')).toBeNull()
  })

  it('says so when nobody is on the board yet', () => {
    link.status = 'live'
    link.board = board({ rows: [], round: 0, activeId: null })
    render(<PlayerView code="x" />)
    expect(screen.getByText('Nobody is on the board yet.')).toBeInTheDocument()
    expect(screen.getByText('Not started')).toBeInTheDocument()
  })
})
