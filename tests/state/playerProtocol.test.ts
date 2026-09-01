// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { describe, expect, it } from 'vitest'
import { playerBoard } from '../../src/combat/playerView.ts'
import { DEFAULT_PLAYER_VIEW } from '../../src/state/settings.ts'
import {
  CURRENT_PLAYER_PROTOCOL_VERSION,
  INITIAL_PLAYER_PROTOCOL_STATE,
  MAX_PLAYER_MESSAGE_BYTES,
  MAX_PLAYER_PAYLOAD_BYTES,
  receivePlayerMessage,
  sendGameMasterMessage,
  sendViewerMessage,
  activateLiveViewAuthority,
  consumePlayerTraffic,
  revokeLiveViewAuthority,
} from '../../src/state/playerProtocol.ts'

const board = playerBoard(
  {
    encounterId: 'synthetic-protocol',
    ownerId: null,
    round: 2,
    activeIndex: 0,
    combatants: [
      {
        isPC: true,
        combatantId: 'synthetic-player',
        name: 'Synthetic player',
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

/** Send one current board envelope through the Game Master interface. */
function boardEnvelope(sequence = 0, senderId = 'gm-session') {
  return sendGameMasterMessage(
    { ...INITIAL_PLAYER_PROTOCOL_STATE, nextSequence: sequence },
    senderId,
    { type: 'board', board },
    1_900_000_000_000,
  ).envelope
}

describe('live-view authority and traffic budgets', () => {
  it('rotates forward and lets only the matching capability revoke the session', () => {
    const first = activateLiveViewAuthority(null, 'a'.repeat(64), 1)
    const rotated = activateLiveViewAuthority(first, 'b'.repeat(64), 2)

    expect(first.generation).toBe(1)
    expect(rotated).toMatchObject({ capabilityHash: 'b'.repeat(64), generation: 2 })
    expect(revokeLiveViewAuthority(rotated, 'a'.repeat(64))).toBe(rotated)
    expect(revokeLiveViewAuthority(rotated, 'b'.repeat(64))).toBeNull()
  })

  it('bounds each join, retry, presence, and broadcast path independently', () => {
    let budget = {}
    for (const path of ['join', 'retry', 'presence', 'broadcast'] as const) {
      const first = consumePlayerTraffic(budget, path, 1_000)
      expect(first.allowed).toBe(true)
      budget = first.state
      let outcome = first
      for (let index = 1; index < outcome.limit; index += 1) {
        outcome = consumePlayerTraffic(budget, path, 1_000)
        expect(outcome.allowed).toBe(true)
        budget = outcome.state
      }
      expect(consumePlayerTraffic(budget, path, 1_000)).toMatchObject({ allowed: false })
      const reset = consumePlayerTraffic(budget, path, 1_000 + outcome.windowMs)
      expect(reset.allowed).toBe(true)
      budget = reset.state
    }
  })
})

describe('the live-view protocol envelope', () => {
  it('round-trips the privacy projection through the canonical current envelope', () => {
    const sent = sendGameMasterMessage(
      INITIAL_PLAYER_PROTOCOL_STATE,
      'gm-session',
      { type: 'board', board },
      1_900_000_000_000,
    )

    expect(sent.envelope).toMatchObject({
      kind: 'player-view',
      protocolVersion: CURRENT_PLAYER_PROTOCOL_VERSION,
      senderRole: 'gm',
      senderId: 'gm-session',
      sequence: 0,
      sentAt: 1_900_000_000_000,
      messageType: 'board',
    })
    expect(sent.state.nextSequence).toBe(1)

    const received = receivePlayerMessage(INITIAL_PLAYER_PROTOCOL_STATE, 'viewer', sent.envelope)
    expect(received).toMatchObject({ status: 'accepted', message: { type: 'board', board } })
    if (received.status !== 'accepted') return
    expect(received.canonical).toBe(JSON.stringify(sent.envelope))
  })

  it('gives each role only the message types it may emit', () => {
    expect(
      sendViewerMessage(INITIAL_PLAYER_PROTOCOL_STATE, 'viewer-session', { type: 'hello' }, 10)
        .envelope,
    ).toMatchObject({ senderRole: 'viewer', messageType: 'hello' })
    expect(
      sendGameMasterMessage(INITIAL_PLAYER_PROTOCOL_STATE, 'gm-session', { type: 'closed' }, 10)
        .envelope,
    ).toMatchObject({ senderRole: 'gm', messageType: 'closed' })

    expect(() =>
      sendViewerMessage(
        INITIAL_PLAYER_PROTOCOL_STATE,
        'viewer-session',
        { type: 'board', board } as never,
        10,
      ),
    ).toThrow()
    expect(() =>
      sendGameMasterMessage(
        INITIAL_PLAYER_PROTOCOL_STATE,
        'gm-session',
        { type: 'hello' } as never,
        10,
      ),
    ).toThrow()
  })
})

describe('receiving live-view traffic', () => {
  it('rejects unsupported roles and messages sent outside a role', () => {
    expect(
      receivePlayerMessage(INITIAL_PLAYER_PROTOCOL_STATE, 'viewer', {
        ...boardEnvelope(),
        senderRole: 'spectator',
      }),
    ).toMatchObject({ status: 'rejected', reason: 'role' })
    expect(
      receivePlayerMessage(INITIAL_PLAYER_PROTOCOL_STATE, 'viewer', {
        ...boardEnvelope(),
        senderRole: 'viewer',
      }),
    ).toMatchObject({ status: 'rejected', reason: 'role' })
  })

  it('rejects malformed and future-version envelopes before changing state', () => {
    expect(
      receivePlayerMessage(INITIAL_PLAYER_PROTOCOL_STATE, 'viewer', {
        ...boardEnvelope(),
        protocolVersion: CURRENT_PLAYER_PROTOCOL_VERSION + 1,
      }),
    ).toMatchObject({ status: 'rejected', reason: 'unsupported-version' })
    expect(
      receivePlayerMessage(INITIAL_PLAYER_PROTOCOL_STATE, 'viewer', {
        ...boardEnvelope(),
        payload: { round: 'two' },
      }),
    ).toEqual({ status: 'rejected', reason: 'malformed', state: INITIAL_PLAYER_PROTOCOL_STATE })
  })

  it('rejects duplicate and reordered messages', () => {
    const first = receivePlayerMessage(INITIAL_PLAYER_PROTOCOL_STATE, 'viewer', boardEnvelope(4))
    expect(first.status).toBe('accepted')
    if (first.status !== 'accepted') return

    expect(receivePlayerMessage(first.state, 'viewer', boardEnvelope(4))).toMatchObject({
      status: 'rejected',
      reason: 'duplicate',
    })
    expect(receivePlayerMessage(first.state, 'viewer', boardEnvelope(3))).toMatchObject({
      status: 'rejected',
      reason: 'reordered',
    })
  })

  it('orders each sender independently and accepts a restarted publisher', () => {
    const first = receivePlayerMessage(
      INITIAL_PLAYER_PROTOCOL_STATE,
      'viewer',
      boardEnvelope(8, 'old-gm-session'),
    )
    expect(first.status).toBe('accepted')
    if (first.status !== 'accepted') return

    expect(
      receivePlayerMessage(first.state, 'viewer', boardEnvelope(0, 'new-gm-session')),
    ).toMatchObject({ status: 'accepted', message: { type: 'board' } })
  })

  it('rejects messages beyond the byte limit', () => {
    const oversized = {
      ...boardEnvelope(),
      payload: { ...board, campaign: 'x'.repeat(MAX_PLAYER_MESSAGE_BYTES) },
    }
    expect(receivePlayerMessage(INITIAL_PLAYER_PROTOCOL_STATE, 'viewer', oversized)).toEqual({
      status: 'rejected',
      reason: 'too-large',
      state: INITIAL_PLAYER_PROTOCOL_STATE,
    })
  })

  it('enforces the payload budget before sending or receiving', () => {
    const oversizedBoard = { ...board, campaign: 'x'.repeat(MAX_PLAYER_PAYLOAD_BYTES) }
    const current = { ...boardEnvelope(), payload: oversizedBoard }

    expect(receivePlayerMessage(INITIAL_PLAYER_PROTOCOL_STATE, 'viewer', current)).toMatchObject({
      status: 'rejected',
      reason: 'too-large',
    })
    expect(() =>
      sendGameMasterMessage(
        INITIAL_PLAYER_PROTOCOL_STATE,
        'gm-session',
        { type: 'board', board: oversizedBoard },
        100,
      ),
    ).toThrow(RangeError)
  })
})
