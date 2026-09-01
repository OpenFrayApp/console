// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import * as v from 'valibot'
import { playerBoardSchema, type PlayerBoard } from '../schema/playerBoard.ts'

export const PLAYER_PROTOCOL_KIND = 'player-view'
export const CURRENT_PLAYER_PROTOCOL_VERSION = 1
export const MAX_PLAYER_MESSAGE_BYTES = 240_000
export const MAX_PLAYER_PAYLOAD_BYTES = 239_000
export const MAX_PLAYER_SENDERS = 100

const finiteNumber = v.pipe(v.number(), v.check<number>(Number.isFinite))
const integer = v.pipe(finiteNumber, v.integer())
const nonNegativeInteger = v.pipe(integer, v.minValue(0))
const senderId = v.pipe(v.string(), v.minLength(1), v.maxLength(100))
const emptyPayload = v.strictObject({})
const boardEnvelope = v.strictObject({
  kind: v.literal(PLAYER_PROTOCOL_KIND),
  protocolVersion: v.literal(CURRENT_PLAYER_PROTOCOL_VERSION),
  senderRole: v.literal('gm'),
  senderId,
  sequence: nonNegativeInteger,
  sentAt: nonNegativeInteger,
  messageType: v.literal('board'),
  payload: playerBoardSchema,
})
const closedEnvelope = v.strictObject({
  kind: v.literal(PLAYER_PROTOCOL_KIND),
  protocolVersion: v.literal(CURRENT_PLAYER_PROTOCOL_VERSION),
  senderRole: v.literal('gm'),
  senderId,
  sequence: nonNegativeInteger,
  sentAt: nonNegativeInteger,
  messageType: v.literal('closed'),
  payload: emptyPayload,
})
const lockedEnvelope = v.strictObject({
  kind: v.literal(PLAYER_PROTOCOL_KIND),
  protocolVersion: v.literal(CURRENT_PLAYER_PROTOCOL_VERSION),
  senderRole: v.literal('gm'),
  senderId,
  sequence: nonNegativeInteger,
  sentAt: nonNegativeInteger,
  messageType: v.literal('locked'),
  payload: emptyPayload,
})
const helloEnvelope = v.strictObject({
  kind: v.literal(PLAYER_PROTOCOL_KIND),
  protocolVersion: v.literal(CURRENT_PLAYER_PROTOCOL_VERSION),
  senderRole: v.literal('viewer'),
  senderId,
  sequence: nonNegativeInteger,
  sentAt: nonNegativeInteger,
  messageType: v.literal('hello'),
  payload: emptyPayload,
})
const envelope = v.variant('messageType', [
  boardEnvelope,
  closedEnvelope,
  lockedEnvelope,
  helloEnvelope,
])

type PlayerEnvelope = v.InferOutput<typeof envelope>
export type PlayerProtocolRole = 'gm' | 'viewer'
export type GameMasterMessage =
  { type: 'board'; board: PlayerBoard } | { type: 'closed' } | { type: 'locked' }
export type ViewerMessage = { type: 'hello' }
export type PlayerProtocolMessage = GameMasterMessage | ViewerMessage

export interface PlayerProtocolState {
  nextSequence: number
  lastReceivedSequences: Readonly<Record<string, number>>
  currentProtocolSeen: boolean
}

export const INITIAL_PLAYER_PROTOCOL_STATE: PlayerProtocolState = {
  nextSequence: 0,
  lastReceivedSequences: {},
  currentProtocolSeen: false,
}

export type LegacyPlayerMessageType = 'board' | 'hello' | 'closed' | 'locked'

export interface PlayerProtocolSend {
  state: PlayerProtocolState
  envelope: PlayerEnvelope
  canonical: string
  legacy: { messageType: LegacyPlayerMessageType; payload: unknown }
}

export type PlayerProtocolReceive =
  | {
      status: 'accepted'
      state: PlayerProtocolState
      message: PlayerProtocolMessage
      canonical: string
      envelope: PlayerEnvelope
    }
  | {
      status: 'rejected'
      state: PlayerProtocolState
      reason:
        | 'too-large'
        | 'malformed'
        | 'unsupported-version'
        | 'role'
        | 'duplicate'
        | 'reordered'
        | 'too-many-senders'
    }

export type LegacyPlayerReceive =
  | { status: 'accepted'; state: PlayerProtocolState; message: PlayerProtocolMessage }
  | {
      status: 'rejected'
      state: PlayerProtocolState
      reason: 'too-large' | 'malformed' | 'role' | 'superseded'
    }

/** Return the UTF-8 size enforced before a Realtime value reaches state. */
function messageBytes(value: unknown): number | null {
  try {
    const serialized = JSON.stringify(value)
    return new TextEncoder().encode(serialized).byteLength
  } catch {
    return null
  }
}

/** Validate and advance one role-specific outgoing protocol message. */
function sendMessage(
  state: PlayerProtocolState,
  role: PlayerProtocolRole,
  sender: string,
  message: PlayerProtocolMessage,
  sentAt: number,
): PlayerProtocolSend {
  const allowed =
    role === 'viewer'
      ? message.type === 'hello'
      : message.type === 'board' || message.type === 'closed' || message.type === 'locked'
  if (!allowed) throw new TypeError(`The ${role} role cannot send ${message.type}.`)

  const candidate = {
    kind: PLAYER_PROTOCOL_KIND,
    protocolVersion: CURRENT_PLAYER_PROTOCOL_VERSION,
    senderRole: role,
    senderId: sender,
    sequence: state.nextSequence,
    sentAt,
    messageType: message.type,
    payload: message.type === 'board' ? message.board : {},
  }
  const parsed = v.safeParse(envelope, candidate)
  if (!parsed.success) throw new TypeError('The player-view message is malformed.')
  const canonical = JSON.stringify(parsed.output)
  if (
    messageBytes(parsed.output.payload)! > MAX_PLAYER_PAYLOAD_BYTES ||
    messageBytes(parsed.output)! > MAX_PLAYER_MESSAGE_BYTES
  ) {
    throw new RangeError('The player-view message is too large.')
  }
  return {
    state: { ...state, nextSequence: state.nextSequence + 1 },
    envelope: parsed.output,
    canonical,
    legacy: { messageType: parsed.output.messageType, payload: parsed.output.payload },
  }
}

/** Build one canonical message from the Game Master's restricted protocol interface. */
export function sendGameMasterMessage(
  state: PlayerProtocolState,
  sender: string,
  message: GameMasterMessage,
  sentAt: number,
): PlayerProtocolSend {
  return sendMessage(state, 'gm', sender, message, sentAt)
}

/** Build one canonical message from the viewer's restricted protocol interface. */
export function sendViewerMessage(
  state: PlayerProtocolState,
  sender: string,
  message: ViewerMessage,
  sentAt: number,
): PlayerProtocolSend {
  return sendMessage(state, 'viewer', sender, message, sentAt)
}

/** Convert a validated envelope into the role-neutral message consumed by callers. */
function messageFromEnvelope(value: PlayerEnvelope): PlayerProtocolMessage {
  switch (value.messageType) {
    case 'board':
      return { type: 'board', board: value.payload }
    case 'closed':
      return { type: 'closed' }
    case 'locked':
      return { type: 'locked' }
    case 'hello':
      return { type: 'hello' }
  }
}

/** Validate a parity-path message and apply current-protocol precedence. */
export function receiveLegacyPlayerMessage(
  state: PlayerProtocolState,
  receiverRole: PlayerProtocolRole,
  messageType: LegacyPlayerMessageType,
  payload: unknown,
): LegacyPlayerReceive {
  if (state.currentProtocolSeen) return { status: 'rejected', reason: 'superseded', state }
  const bytes = messageBytes({ messageType, payload })
  const payloadBytes = messageBytes(payload)
  if (bytes === null || payloadBytes === null) {
    return { status: 'rejected', reason: 'malformed', state }
  }
  if (bytes > MAX_PLAYER_MESSAGE_BYTES || payloadBytes > MAX_PLAYER_PAYLOAD_BYTES) {
    return { status: 'rejected', reason: 'too-large', state }
  }
  const expected = receiverRole === 'viewer' ? ['board', 'closed', 'locked'] : ['hello']
  if (!expected.includes(messageType)) return { status: 'rejected', reason: 'role', state }
  if (messageType === 'board') {
    const parsed = v.safeParse(playerBoardSchema, payload)
    return parsed.success
      ? { status: 'accepted', state, message: { type: 'board', board: parsed.output } }
      : { status: 'rejected', reason: 'malformed', state }
  }
  const parsed = v.safeParse(emptyPayload, payload)
  if (!parsed.success) return { status: 'rejected', reason: 'malformed', state }
  switch (messageType) {
    case 'hello':
      return { status: 'accepted', state, message: { type: 'hello' } }
    case 'closed':
      return { status: 'accepted', state, message: { type: 'closed' } }
    case 'locked':
      return { status: 'accepted', state, message: { type: 'locked' } }
  }
}

/** Validate, order, and canonicalize one untrusted incoming Realtime value. */
export function receivePlayerMessage(
  state: PlayerProtocolState,
  receiverRole: PlayerProtocolRole,
  input: unknown,
): PlayerProtocolReceive {
  const bytes = messageBytes(input)
  if (bytes === null) return { status: 'rejected', reason: 'malformed', state }
  if (bytes > MAX_PLAYER_MESSAGE_BYTES) return { status: 'rejected', reason: 'too-large', state }
  if (!input || typeof input !== 'object') {
    return { status: 'rejected', reason: 'malformed', state }
  }

  const record = input as Record<string, unknown>
  if (
    record.kind === PLAYER_PROTOCOL_KIND &&
    typeof record.protocolVersion === 'number' &&
    record.protocolVersion !== CURRENT_PLAYER_PROTOCOL_VERSION
  ) {
    return { status: 'rejected', reason: 'unsupported-version', state }
  }
  const expectedSender = receiverRole === 'viewer' ? 'gm' : 'viewer'
  if (record.senderRole !== expectedSender) {
    return { status: 'rejected', reason: 'role', state }
  }

  const payloadBytes = messageBytes(record.payload)
  if (payloadBytes === null) return { status: 'rejected', reason: 'malformed', state }
  if (payloadBytes > MAX_PLAYER_PAYLOAD_BYTES) {
    return { status: 'rejected', reason: 'too-large', state }
  }

  const parsed = v.safeParse(envelope, input)
  if (!parsed.success) return { status: 'rejected', reason: 'malformed', state }
  const sender = parsed.output.senderId
  const last = state.lastReceivedSequences[sender]
  if (last === undefined && Object.keys(state.lastReceivedSequences).length >= MAX_PLAYER_SENDERS) {
    return { status: 'rejected', reason: 'too-many-senders', state }
  }
  if (last !== undefined && parsed.output.sequence === last) {
    return { status: 'rejected', reason: 'duplicate', state }
  }
  if (last !== undefined && parsed.output.sequence < last) {
    return { status: 'rejected', reason: 'reordered', state }
  }
  const nextState = {
    ...state,
    currentProtocolSeen: receiverRole === 'viewer',
    lastReceivedSequences: {
      ...state.lastReceivedSequences,
      [sender]: parsed.output.sequence,
    },
  }
  return {
    status: 'accepted',
    state: nextState,
    message: messageFromEnvelope(parsed.output),
    canonical: JSON.stringify(parsed.output),
    envelope: parsed.output,
  }
}
