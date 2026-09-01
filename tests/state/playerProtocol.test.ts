// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { describe, expect, it } from 'vitest'
import { playerBoard } from '../../src/combat/playerView.ts'
import { DEFAULT_PLAYER_VIEW } from '../../src/state/settings.ts'
import {
  CURRENT_PLAYER_PROTOCOL_VERSION,
  INITIAL_PLAYER_PROTOCOL_STATE,
  MAX_PLAYER_MESSAGE_BYTES,
  receivePlayerMessage,
  sendGameMasterMessage,
  sendViewerMessage,
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
function boardEnvelope(sequence = 0) {
  return sendGameMasterMessage(
    { ...INITIAL_PLAYER_PROTOCOL_STATE, nextSequence: sequence },
    { type: 'board', board },
    1_900_000_000_000,
  ).envelope
}

describe('the live-view protocol envelope', () => {
  it('round-trips the privacy projection through the canonical current envelope', () => {
    const sent = sendGameMasterMessage(
      INITIAL_PLAYER_PROTOCOL_STATE,
      { type: 'board', board },
      1_900_000_000_000,
    )

    expect(sent.envelope).toMatchObject({
      kind: 'player-view',
      protocolVersion: CURRENT_PLAYER_PROTOCOL_VERSION,
      senderRole: 'gm',
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
      sendViewerMessage(INITIAL_PLAYER_PROTOCOL_STATE, { type: 'hello' }, 10).envelope,
    ).toMatchObject({ senderRole: 'viewer', messageType: 'hello' })
    expect(
      sendGameMasterMessage(INITIAL_PLAYER_PROTOCOL_STATE, { type: 'closed' }, 10).envelope,
    ).toMatchObject({ senderRole: 'gm', messageType: 'closed' })

    expect(() =>
      sendViewerMessage(INITIAL_PLAYER_PROTOCOL_STATE, { type: 'board', board } as never, 10),
    ).toThrow()
    expect(() =>
      sendGameMasterMessage(INITIAL_PLAYER_PROTOCOL_STATE, { type: 'hello' } as never, 10),
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
})
