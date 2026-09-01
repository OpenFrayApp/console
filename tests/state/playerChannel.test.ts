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
import { useBoardBroadcast, usePlayerBoard } from '../../src/state/playerChannel.ts'
import {
  LIVE_VIEW_CAPABILITY_BYTES,
  liveViewTopics,
  mintLiveViewCapability,
  type ActiveLiveView,
} from '../../src/state/liveViewAuthority.ts'
import { makeRealtimeStub } from './supabaseMock.ts'

const supa = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('../../src/lib/supabase.ts', () => ({
  get supabase() {
    return supa.client
  },
}))

const capability = mintLiveViewCapability(new Uint8Array(LIVE_VIEW_CAPABILITY_BYTES).fill(3))
const session: ActiveLiveView = {
  status: 'ok',
  capability,
  capabilityHash: 'a'.repeat(64),
  generation: 1,
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
  supa.client = null
})

/** Build one minimal encounter for the live-view adapter. */
function encounter(round = 1): Encounter {
  return {
    encounterId: 'local',
    ownerId: null,
    round,
    activeIndex: 0,
    combatants: [],
    log: [],
  }
}

/** Build a current owner envelope for viewer adapter tests. */
function ownerMessage(
  sequence: number,
  message: Parameters<typeof sendGameMasterMessage>[2],
  senderId = 'gm-session',
  sentAt = Date.now(),
) {
  return sendGameMasterMessage(
    { ...INITIAL_PLAYER_PROTOCOL_STATE, nextSequence: sequence },
    senderId,
    message,
    sentAt,
  ).envelope
}

/** Let capability hashing and channel setup finish. */
async function flushChannelSetup(): Promise<void> {
  await act(async () => {
    await liveViewTopics(capability, null)
    await Promise.resolve()
  })
}

describe('useBoardBroadcast — owner publication', () => {
  it('opens no channel without an active owner capability', () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    renderHook(() => useBoardBroadcast(null, encounter(), DEFAULT_PLAYER_VIEW))
    expect(channels).toHaveLength(0)
  })

  it('publishes only on a private capability topic and announces owner presence', async () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    renderHook(() => useBoardBroadcast(session, encounter(3), DEFAULT_PLAYER_VIEW))
    await flushChannelSetup()

    const topics = await liveViewTopics(capability, null)
    expect(channels[0].name).toBe(topics.board)
    expect(channels[0].config).toMatchObject({
      config: { private: true, broadcast: { ack: true }, presence: { key: 'gm' } },
    })
    act(() => channels[0].ready())
    expect(channels[0].tracked).toEqual([{ role: 'gm' }])
    expect(channels[0].sends).toHaveLength(1)
    expect(channels[0].sends[0]).toMatchObject({
      event: 'player-view-protocol',
      payload: { senderRole: 'gm', messageType: 'board', payload: { round: 3 } },
    })
  })

  it('sends a fresh heartbeat while the board is unchanged', async () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    renderHook(() => useBoardBroadcast(session, encounter(3), DEFAULT_PLAYER_VIEW))
    await flushChannelSetup()
    act(() => {
      channels[0].ready()
      vi.advanceTimersByTime(250)
    })
    const before = channels[0].sends.length

    act(() => void vi.advanceTimersByTime(10_000))

    expect(channels[0].sends).toHaveLength(before + 1)
    expect(channels[0].sends.at(-1)?.payload).toMatchObject({ messageType: 'board' })
  })

  it('coalesces a burst of viewer presence joins into one bounded reply', async () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    renderHook(() => useBoardBroadcast(session, encounter(4), DEFAULT_PLAYER_VIEW))
    await flushChannelSetup()
    act(() => {
      channels[0].ready()
      channels[1].ready()
      vi.advanceTimersByTime(250)
    })
    const before = channels[0].sends.length

    act(() => {
      channels[1].emitPresence('join')
      channels[1].emitPresence('join')
      channels[1].emitPresence('join')
      vi.advanceTimersByTime(249)
    })
    expect(channels[0].sends).toHaveLength(before)
    act(() => void vi.advanceTimersByTime(1))
    expect(channels[0].sends).toHaveLength(before + 1)
  })

  it('changes the PIN without ending the live capability', async () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    const { rerender } = renderHook(
      ({ pin }: { pin: string | null }) =>
        useBoardBroadcast(
          session,
          encounter(),
          DEFAULT_PLAYER_VIEW,
          null,
          undefined,
          undefined,
          pin,
        ),
      { initialProps: { pin: null as string | null } },
    )
    await flushChannelSetup()
    act(() => channels[0].ready())

    rerender({ pin: '1234' })
    await flushChannelSetup()

    expect(channels[0].removed).toBe(true)
    expect(
      channels[0].sends.some(({ payload }) => JSON.stringify(payload).includes('closed')),
    ).toBe(false)
  })

  it('sends a lifecycle close and leaves the old topic on rotation', async () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    const rotated: ActiveLiveView = {
      ...session,
      capability: mintLiveViewCapability(new Uint8Array(LIVE_VIEW_CAPABILITY_BYTES).fill(4)),
      generation: 2,
    }
    const { rerender } = renderHook(
      ({ active }: { active: ActiveLiveView }) =>
        useBoardBroadcast(active, encounter(), DEFAULT_PLAYER_VIEW),
      { initialProps: { active: session } },
    )
    await flushChannelSetup()
    act(() => channels[0].ready())

    rerender({ active: rotated })
    await flushChannelSetup()
    expect(channels[0].removed).toBe(true)
    expect(channels[0].sends.at(-1)).toMatchObject({
      event: 'player-view-protocol',
      payload: { messageType: 'closed' },
    })
    expect(channels[1].name).not.toBe(channels[0].name)
  })

  it('keeps a PIN on a separate private board topic while the lobby says locked', async () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    renderHook(() =>
      useBoardBroadcast(
        session,
        encounter(),
        DEFAULT_PLAYER_VIEW,
        null,
        undefined,
        undefined,
        '1234',
      ),
    )
    await flushChannelSetup()
    const topics = await liveViewTopics(capability, '1234')

    expect(channels.map(({ name }) => name)).toEqual([topics.board, topics.lobby, topics.join])
    act(() => {
      channels[0].ready()
      channels[1].ready()
      channels[2].ready()
    })
    expect(channels[1].sends.at(-1)?.payload).toMatchObject({ messageType: 'locked' })
    expect(channels[0].sends.at(-1)?.payload).toMatchObject({ messageType: 'board' })
  })
})

describe('usePlayerBoard — read-only viewer', () => {
  it('ends access without a capability and opens no guessable code channel', () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    const { result } = renderHook(() => usePlayerBoard('tuesday-game', null))
    expect(result.current.status).toBe('ended')
    expect(channels).toHaveLength(0)
  })

  it('joins the private capability topic using presence and never broadcasts', async () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    renderHook(() => usePlayerBoard('tuesday-game', capability))
    await flushChannelSetup()

    expect(channels[0].config).toMatchObject({ config: { private: true } })
    act(() => {
      channels[0].ready()
      channels[1].ready()
    })
    expect(channels[0].tracked).toEqual([])
    expect(channels[1].tracked).toEqual([{ role: 'viewer' }])
    expect(channels.every((channel) => channel.sends.length === 0)).toBe(true)
  })

  it('ends access when Realtime denies a stale or revoked capability', async () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    const { result } = renderHook(() => usePlayerBoard('code', capability))
    await flushChannelSetup()

    act(() =>
      channels[0].status(
        'CHANNEL_ERROR',
        new Error('channel error', { cause: { status: 403, reason: 'Unauthorized' } }),
      ),
    )

    expect(result.current).toMatchObject({ status: 'ended', board: null })
  })

  it('ends access immediately when authorization fails after a live board', async () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    const { result } = renderHook(() => usePlayerBoard('code', capability))
    await flushChannelSetup()
    act(() => channels[0].ready())
    act(() =>
      channels[0].emit(
        'player-view-protocol',
        ownerMessage(0, { type: 'board', board: playerBoard(encounter(2), DEFAULT_PLAYER_VIEW) }),
      ),
    )

    act(() =>
      channels[0].status(
        'CHANNEL_ERROR',
        new Error('channel error', { cause: { status: 403, reason: 'Unauthorized' } }),
      ),
    )

    expect(result.current).toMatchObject({ status: 'ended', board: null })
  })

  it('treats an unconfirmed initial channel error as connection loss', async () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    const { result } = renderHook(() => usePlayerBoard('code', capability))
    await flushChannelSetup()

    act(() => channels[0].status('CHANNEL_ERROR', new Error('transport failure')))

    expect(result.current).toMatchObject({ status: 'connection-lost', board: null })
  })

  it('accepts owner board traffic and rejects replayed or impersonated traffic', async () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    const { result } = renderHook(() => usePlayerBoard('code', capability))
    await flushChannelSetup()
    act(() => channels[0].ready())
    const board = playerBoard(encounter(2), DEFAULT_PLAYER_VIEW)

    act(() => channels[0].emit('player-view-protocol', ownerMessage(4, { type: 'board', board })))
    expect(result.current.board?.round).toBe(2)
    const replay = ownerMessage(4, {
      type: 'board',
      board: playerBoard(encounter(9), DEFAULT_PLAYER_VIEW),
    })
    act(() => channels[0].emit('player-view-protocol', replay))
    act(() =>
      channels[0].emit('player-view-protocol', {
        ...ownerMessage(5, { type: 'closed' }),
        senderRole: 'viewer',
      }),
    )
    expect(result.current.board?.round).toBe(2)
  })

  it('keeps a recent board while reconnecting, then covers it after 30 seconds', async () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    const { result } = renderHook(() => usePlayerBoard('code', capability))
    await flushChannelSetup()
    act(() => channels[0].ready())
    channels[0].presence = { gm: [{ role: 'gm' }] }
    act(() =>
      channels[0].emit(
        'player-view-protocol',
        ownerMessage(0, { type: 'board', board: playerBoard(encounter(2), DEFAULT_PLAYER_VIEW) }),
      ),
    )
    expect(result.current.status).toBe('live')

    channels[0].presence = {}
    act(() => channels[0].emitPresence('sync'))
    expect(result.current).toMatchObject({ status: 'reconnecting', board: { round: 2 } })

    act(() => void vi.advanceTimersByTime(20_000))
    expect(result.current).toMatchObject({
      status: 'reconnecting',
      board: { round: 2 },
      lastUpdateAgeSeconds: 20,
    })

    act(() => void vi.advanceTimersByTime(10_001))
    expect(result.current).toMatchObject({ status: 'connection-lost', board: { round: 2 } })
  })

  it('ends access immediately on confirmed lifecycle termination', async () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    const { result } = renderHook(() => usePlayerBoard('code', capability))
    await flushChannelSetup()
    act(() => channels[0].ready())
    act(() =>
      channels[0].emit(
        'player-view-protocol',
        ownerMessage(0, { type: 'board', board: playerBoard(encounter(2), DEFAULT_PLAYER_VIEW) }),
      ),
    )

    act(() => channels[0].emit('player-view-protocol', ownerMessage(1, { type: 'closed' })))

    expect(result.current).toMatchObject({ status: 'ended', board: null })
  })

  it('does not let delayed traffic restore a lost board', async () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    const { result } = renderHook(() => usePlayerBoard('code', capability))
    await flushChannelSetup()
    act(() => channels[0].ready())
    act(() =>
      channels[0].emit(
        'player-view-protocol',
        ownerMessage(0, { type: 'board', board: playerBoard(encounter(2), DEFAULT_PLAYER_VIEW) }),
      ),
    )
    act(() => {
      channels[0].status('TIMED_OUT')
      vi.advanceTimersByTime(30_001)
    })

    act(() =>
      channels[0].emit(
        'player-view-protocol',
        ownerMessage(
          1,
          { type: 'board', board: playerBoard(encounter(9), DEFAULT_PLAYER_VIEW) },
          'gm-session',
          Date.now() - 30_001,
        ),
      ),
    )

    expect(result.current).toMatchObject({ status: 'connection-lost', board: { round: 2 } })
  })

  it('opens the PIN gate only after a validated owner lock message', async () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    const { result } = renderHook(() => usePlayerBoard('code', capability))
    await flushChannelSetup()
    act(() => channels[0].ready())

    act(() => channels[0].emit('player-view-protocol', ownerMessage(0, { type: 'locked' })))

    expect(result.current).toMatchObject({ status: 'locked', board: null })
  })

  it('clears a live board when the Game Master adds a PIN', async () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    const { result } = renderHook(() => usePlayerBoard('code', capability))
    await flushChannelSetup()
    act(() => channels[0].ready())
    act(() =>
      channels[0].emit(
        'player-view-protocol',
        ownerMessage(0, { type: 'board', board: playerBoard(encounter(2), DEFAULT_PLAYER_VIEW) }),
      ),
    )

    act(() => channels[0].emit('player-view-protocol', ownerMessage(1, { type: 'locked' })))

    expect(result.current).toMatchObject({ status: 'locked', board: null })
  })

  it('ignores a local PIN-channel close while changing the entered PIN', async () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    const { result, rerender } = renderHook(
      ({ pin }: { pin: string | null }) => usePlayerBoard('code', capability, pin),
      { initialProps: { pin: '1111' } },
    )
    await act(async () => {
      await liveViewTopics(capability, '1111')
      await Promise.resolve()
    })
    expect(channels).toHaveLength(3)

    rerender({ pin: '2222' })
    await act(async () => {
      await liveViewTopics(capability, '2222')
      await Promise.resolve()
    })

    expect(result.current.status).not.toBe('ended')
  })

  it('uses a PIN-derived private topic and rejects a silent wrong PIN', async () => {
    const { client, channels } = makeRealtimeStub()
    supa.client = client
    const { result } = renderHook(() => usePlayerBoard('code', capability, '9999'))
    await flushChannelSetup()
    const topics = await liveViewTopics(capability, '9999')
    expect(channels.map(({ name }) => name)).toEqual([topics.lobby, topics.join, topics.board])

    act(() => channels[2].ready())
    act(() => void vi.advanceTimersByTime(2000))
    expect(result.current.pinRejected).toBe(true)

    act(() =>
      channels[2].emit(
        'player-view-protocol',
        ownerMessage(0, { type: 'board', board: playerBoard(encounter(5), DEFAULT_PLAYER_VIEW) }),
      ),
    )
    expect(result.current).toMatchObject({ status: 'live', pinRejected: false })
  })
})
