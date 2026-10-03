// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { act, cleanup, render, screen, within } from '@testing-library/react'
import { page } from 'vitest/browser'
import '../../src/index.css'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { playerBoard } from '../../src/combat/playerView.ts'
import { PlayerView } from '../../src/components/player/PlayerView.tsx'
import {
  INITIAL_PLAYER_PROTOCOL_STATE,
  sendGameMasterMessage,
} from '../../src/state/playerProtocol.ts'
import { DEFAULT_PLAYER_VIEW } from '../../src/state/settings.ts'
import {
  LIVE_VIEW_CAPABILITY_BYTES,
  liveViewTopics,
  mintLiveViewCapability,
} from '../../src/state/liveViewAuthority.ts'
import { makeRealtimeStub } from './supabaseMock.ts'

const supa = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('../../src/lib/supabase.ts', () => ({
  supabase: new Proxy(
    {},
    {
      get: (_target, property) => (supa.client as Record<PropertyKey, unknown>)[property],
    },
  ),
}))

const capability = mintLiveViewCapability(new Uint8Array(LIVE_VIEW_CAPABILITY_BYTES).fill(8))
const board = playerBoard(
  {
    encounterId: 'browser-reconnect',
    ownerId: null,
    round: 3,
    activeIndex: 0,
    combatants: [
      {
        isPC: true,
        combatantId: 'thalia',
        name: 'Thalia',
        initiative: 18,
        ac: 16,
        status: 'active',
        hp: { current: 24, max: 30, temp: 0 },
        concentration: null,
        effects: [],
      },
    ],
    log: [],
  },
  DEFAULT_PLAYER_VIEW,
)

/** Build one current owner board envelope for the browser transport journey. */
function ownerBoard(sequence: number, sentAt = Date.now(), currentBoard = board) {
  return sendGameMasterMessage(
    { ...INITIAL_PLAYER_PROTOCOL_STATE, nextSequence: sequence },
    'gm-browser',
    { type: 'board', board: currentBoard },
    sentAt,
  ).envelope
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(async () => {
  await page.viewport(1280, 720)
  cleanup()
  vi.useRealTimers()
  supa.client = null
})

describe('player-view reconnect browser journey', () => {
  it.each([390, 1024])(
    'moves dead creatures below the turn order at %i px and restores them when revived',
    async (width) => {
      await page.viewport(width, 844)
      const { client, channels } = makeRealtimeStub()
      supa.client = client
      render(createElement(PlayerView, { code: 'browser', capability }))
      await act(async () => {
        await liveViewTopics(capability, null)
        await Promise.resolve()
      })
      const current = {
        ...board,
        rows: [...board.rows, { ...board.rows[0], id: 'ogre', name: 'Ogre', isFoe: true }],
      }
      act(() => {
        channels[0].ready()
        channels[0].emit('player-view-protocol', ownerBoard(0, Date.now(), current))
      })
      expect(
        within(screen.getByRole('list', { name: 'Turn order' })).getByText('Ogre'),
      ).not.toBeNull()
      act(() =>
        channels[0].emit(
          'player-view-protocol',
          ownerBoard(1, Date.now(), {
            ...current,
            rows: current.rows.map((row) =>
              row.id === 'ogre' ? { ...row, status: 'dead' as const } : row,
            ),
          }),
        ),
      )
      const order = screen.getByRole('list', { name: 'Turn order' })
      const dead = screen.getByRole('list', { name: 'Dead' })
      expect(within(order).queryByText('Ogre')).toBeNull()
      expect(within(dead).getByText('Ogre')).not.toBeNull()
      expect(dead.getBoundingClientRect().top).toBeGreaterThan(order.getBoundingClientRect().bottom)
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(innerWidth)
      act(() => channels[0].emit('player-view-protocol', ownerBoard(2, Date.now(), current)))
      expect(screen.queryByRole('heading', { name: 'Dead' })).toBeNull()
      expect(
        within(screen.getByRole('list', { name: 'Turn order' })).getByText('Ogre'),
      ).not.toBeNull()
    },
  )

  it('covers a stale board and restores Live only after a fresh validated update', async () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    render(createElement(PlayerView, { code: 'browser', capability }))
    await act(async () => {
      await liveViewTopics(capability, null)
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(channels).toHaveLength(2)
    act(() => channels[0].ready())

    act(() => channels[0].emit('player-view-protocol', ownerBoard(0)))
    expect(screen.getByText('Live')).not.toBeNull()
    expect(screen.getAllByText('Thalia')).toHaveLength(2)

    act(() => channels[0].status('TIMED_OUT', new Error('transport failure')))
    act(() => void vi.advanceTimersByTime(20_000))
    expect(screen.getByText('Reconnecting')).not.toBeNull()
    expect(screen.getByText('· Last update 20 seconds ago')).not.toBeNull()
    expect(screen.getAllByText('Thalia')).toHaveLength(2)

    act(() => void vi.advanceTimersByTime(10_000))
    expect(screen.getByText('Connection lost')).not.toBeNull()
    expect(screen.queryAllByText('Thalia')).toHaveLength(0)

    act(() => channels[0].emit('player-view-protocol', ownerBoard(0, Date.now() - 30_001)))
    expect(screen.getByText('Connection lost')).not.toBeNull()

    act(() => channels[0].emit('player-view-protocol', ownerBoard(1, Date.now() - 604_800_000)))
    expect(screen.getByText('Live')).not.toBeNull()
    expect(screen.getAllByText('Thalia')).toHaveLength(2)
  })
})
