// @vitest-environment jsdom
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Encounter } from '../../src/schema/encounter.ts'
import { playerBoard } from '../../src/combat/playerView.ts'
import { DEFAULT_PLAYER_VIEW } from '../../src/state/settings.ts'
import {
  INITIAL_PLAYER_PROTOCOL_STATE,
  sendGameMasterMessage,
} from '../../src/state/playerProtocol.ts'
import {
  lockedChannelName,
  useBoardBroadcast,
  usePlayerBoard,
} from '../../src/state/playerChannel.ts'
import { makeRealtimeStub } from './supabaseMock.ts'

const supa = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('../../src/lib/supabase.ts', () => ({
  get supabase() {
    return supa.client
  },
}))

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
  supa.client = null
})

function encounter(overrides: Partial<Encounter> = {}): Encounter {
  return {
    encounterId: 'local',
    ownerId: null,
    round: 1,
    activeIndex: 0,
    combatants: [],
    log: [],
    ...overrides,
  }
}

/** Build the complete privacy projection accepted on the wire. */
function wireBoard(round: number) {
  return playerBoard(encounter({ round }), DEFAULT_PLAYER_VIEW)
}

describe('useBoardBroadcast — the Game Master side', () => {
  it('opens no channel at all while sharing is off', () => {
    const { channels } = makeRealtimeStub()
    supa.client = { channel: () => ({}), removeChannel: () => Promise.resolve('ok') }
    renderHook(() => useBoardBroadcast(null, encounter(), DEFAULT_PLAYER_VIEW))
    expect(channels).toHaveLength(0)
  })

  it('joins the channel named for the code and announces itself as the GM', () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    renderHook(() => useBoardBroadcast('tuesday-game', encounter(), DEFAULT_PLAYER_VIEW))
    expect(channels[0].name).toBe('player:tuesday-game')
    act(() => channels[0].ready())
    expect(channels[0].tracked).toEqual([{ role: 'gm' }])
  })

  it('sends the board straight away once subscribed, so nobody waits on a debounce', () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    renderHook(() => useBoardBroadcast('code', encounter({ round: 3 }), DEFAULT_PLAYER_VIEW))
    act(() => channels[0].ready())
    const sent = channels[0].sends.filter((s) => s.event === 'board')
    expect(sent).toHaveLength(1)
    expect(sent[0].payload).toMatchObject({ round: 3 })
  })

  it('coalesces a burst of changes into one send carrying the latest board', () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    const { rerender } = renderHook(
      ({ e }: { e: Encounter }) => useBoardBroadcast('code', e, DEFAULT_PLAYER_VIEW),
      { initialProps: { e: encounter({ round: 1 }) } },
    )
    act(() => channels[0].ready())
    const before = channels[0].sends.filter((s) => s.event === 'board').length
    // Three board changes inside one debounce window — a turn advancing and two hits.
    rerender({ e: encounter({ round: 2 }) })
    rerender({ e: encounter({ round: 3 }) })
    rerender({ e: encounter({ round: 4 }) })
    act(() => void vi.advanceTimersByTime(300))
    const sent = channels[0].sends.filter((s) => s.event === 'board')
    expect(sent).toHaveLength(before + 1)
    expect(sent.at(-1)?.payload).toMatchObject({ round: 4 })
  })

  it('answers a late player`s hello with the board as it stands', () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    renderHook(() => useBoardBroadcast('code', encounter({ round: 7 }), DEFAULT_PLAYER_VIEW))
    act(() => channels[0].ready())
    act(() => channels[0].emit('hello'))
    const boards = channels[0].sends.filter((s) => s.event === 'board')
    expect(boards.at(-1)?.payload).toMatchObject({ round: 7 })
  })

  it('says goodbye and drops the channel when sharing stops', () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    const { unmount } = renderHook(() =>
      useBoardBroadcast('code', encounter(), DEFAULT_PLAYER_VIEW),
    )
    act(() => channels[0].ready())
    unmount()
    expect(channels[0].sends.at(-1)?.event).toBe('closed')
    expect(channels[0].removed).toBe(true)
  })
})

describe('usePlayerBoard — the player side', () => {
  it('reports the view as unavailable when the app has no Supabase project', () => {
    const { result } = renderHook(() => usePlayerBoard('code'))
    expect(result.current.status).toBe('unavailable')
  })

  it('asks for the board as soon as it is subscribed', () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    renderHook(() => usePlayerBoard('code'))
    act(() => channels[0].ready())
    expect(channels[0].sends.map((message) => message.event)).toEqual([
      'player-view-protocol',
      'hello',
    ])
    expect(channels[0].sends[0].payload).toMatchObject({
      senderRole: 'viewer',
      messageType: 'hello',
      sequence: 0,
    })
  })

  it('goes live on the first board it receives', () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    const { result } = renderHook(() => usePlayerBoard('code'))
    act(() => channels[0].ready())
    act(() =>
      channels[0].emit('board', { round: 2, paused: false, activeId: null, rows: [], log: [] }),
    )
    expect(result.current.status).toBe('live')
    expect(result.current.board?.round).toBe(2)
  })

  it('accepts current protocol boards and rejects duplicate or reordered traffic', () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    const { result } = renderHook(() => usePlayerBoard('code'))
    act(() => channels[0].ready())
    const envelope = (sequence: number, round: number) =>
      sendGameMasterMessage(
        { ...INITIAL_PLAYER_PROTOCOL_STATE, nextSequence: sequence },
        { type: 'board', board: wireBoard(round) },
        100,
      ).envelope

    act(() => channels[0].emit('player-view-protocol', envelope(4, 2)))
    expect(result.current.board?.round).toBe(2)
    act(() => channels[0].emit('player-view-protocol', envelope(4, 9)))
    act(() => channels[0].emit('player-view-protocol', envelope(3, 8)))
    expect(result.current.board?.round).toBe(2)
    act(() => channels[0].emit('player-view-protocol', envelope(5, 3)))
    expect(result.current.board?.round).toBe(3)
  })

  it('keeps malformed current and rollback traffic out of viewer state', () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    const { result } = renderHook(() => usePlayerBoard('code'))
    act(() => channels[0].ready())
    act(() =>
      channels[0].emit('player-view-protocol', {
        kind: 'player-view',
        protocolVersion: 1,
        senderRole: 'gm',
        sequence: 0,
        sentAt: 100,
        messageType: 'board',
        payload: { round: 'wrong' },
      }),
    )
    act(() => channels[0].emit('board', { round: 99 }))
    expect(result.current.status).toBe('connecting')
    expect(result.current.board).toBeNull()
  })

  it('waits when nobody answers within the timeout', () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    const { result } = renderHook(() => usePlayerBoard('code'))
    act(() => channels[0].ready())
    expect(result.current.status).toBe('connecting')
    act(() => void vi.advanceTimersByTime(5000))
    expect(result.current.status).toBe('waiting')
  })

  // A board left on screen after the GM leaves reads as live, and a table acting on
  // stale hit points is worse off than one told to ask.
  it('drops the board, not just the status, when the Game Master stops sharing', () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    const { result } = renderHook(() => usePlayerBoard('code'))
    act(() => channels[0].ready())
    act(() =>
      channels[0].emit('board', { round: 1, paused: false, activeId: null, rows: [], log: [] }),
    )
    act(() => channels[0].emit('closed'))
    expect(result.current.status).toBe('waiting')
    expect(result.current.board).toBeNull()
  })

  it('notices a Game Master who just closed the tab, via presence', () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    const { result } = renderHook(() => usePlayerBoard('code'))
    act(() => channels[0].ready())
    channels[0].presence = { gm: [{ role: 'gm' }] }
    act(() =>
      channels[0].emit('board', { round: 1, paused: false, activeId: null, rows: [], log: [] }),
    )
    expect(result.current.status).toBe('live')
    channels[0].presence = {}
    act(() => channels[0].emitPresence('sync'))
    expect(result.current.status).toBe('waiting')
    expect(result.current.board).toBeNull()
  })

  it('asks again when a Game Master appears', () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    renderHook(() => usePlayerBoard('code'))
    act(() => channels[0].ready())
    act(() => channels[0].emitPresence('join'))
    expect(channels[0].sends.filter((s) => s.event === 'hello')).toHaveLength(2)
  })

  it('never sends a board — the player side is read-only', () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    const { unmount } = renderHook(() => usePlayerBoard('code'))
    act(() => channels[0].ready())
    act(() => channels[0].emitPresence('join'))
    unmount()
    expect(
      channels[0].sends.every(
        (message) =>
          message.event === 'hello' ||
          (message.event === 'player-view-protocol' &&
            (message.payload as { messageType?: string }).messageType === 'hello'),
      ),
    ).toBe(true)
  })
})

describe('a PIN-locked share', () => {
  it('answers the lobby with locked and keeps the board on the derived channel', async () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    renderHook(() =>
      useBoardBroadcast(
        'code',
        encounter(),
        DEFAULT_PLAYER_VIEW,
        null,
        undefined,
        undefined,
        '1234',
      ),
    )
    await act(async () => {})
    const derived = await lockedChannelName('code', '1234')
    expect(channels.map((c) => c.name)).toEqual(['player:code', derived])

    const [lobby, board] = channels
    act(() => {
      lobby.ready()
      board.ready()
    })
    // A hello at the door is told the view is locked — never given the board.
    act(() => {
      lobby.emit('hello')
    })
    expect(lobby.sends.filter((s) => s.event === 'board')).toHaveLength(0)
    expect(lobby.sends.some((s) => s.event === 'locked')).toBe(true)
    // The board flows only where the PIN points.
    expect(board.sends.some((s) => s.event === 'board')).toBe(true)
  })

  it('derives a stable channel per PIN, and a different one per PIN', async () => {
    expect(await lockedChannelName('code', '1234')).toBe(await lockedChannelName('code', '1234'))
    expect(await lockedChannelName('code', '1234')).not.toBe(
      await lockedChannelName('code', '4321'),
    )
    expect(await lockedChannelName('other', '1234')).not.toBe(
      await lockedChannelName('code', '1234'),
    )
  })
})

describe('usePlayerBoard — a locked link', () => {
  it('reports locked from the lobby, then goes live once the right PIN answers', async () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    const { result, rerender } = renderHook(
      ({ pin }: { pin: string | null }) => usePlayerBoard('code', pin),
      { initialProps: { pin: null as string | null } },
    )
    act(() => channels[0].ready())
    act(() => channels[0].emit('locked'))
    expect(result.current.status).toBe('locked')

    rerender({ pin: '1234' })
    // Awaiting a digest queued after the hook's guarantees the hook's .then ran first.
    await act(async () => {
      await lockedChannelName('code', '1234')
    })
    expect(channels).toHaveLength(2)
    expect(channels[1].name).toBe(await lockedChannelName('code', '1234'))
    act(() => channels[1].ready())
    act(() => channels[1].emit('board', wireBoard(2)))
    expect(result.current.status).toBe('live')
    expect(result.current.board).toEqual(wireBoard(2))
    expect(result.current.pinRejected).toBe(false)
  })

  it('calls a silent channel a wrong PIN, and a later board clears the call', async () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    const { result, rerender } = renderHook(
      ({ pin }: { pin: string | null }) => usePlayerBoard('code', pin),
      { initialProps: { pin: null as string | null } },
    )
    act(() => channels[0].ready())
    act(() => channels[0].emit('locked'))

    rerender({ pin: '9999' })
    await act(async () => {
      await lockedChannelName('code', '9999')
    })
    act(() => channels[1].ready())
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current.pinRejected).toBe(true)
    expect(result.current.status).toBe('locked')

    // A board that limps in late is still the board — the verdict retracts.
    act(() => channels[1].emit('board', wireBoard(1)))
    expect(result.current.pinRejected).toBe(false)
    expect(result.current.status).toBe('live')
  })
})
