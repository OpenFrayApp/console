// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import * as v from 'valibot'
import { playerBoardSchema, type PlayerBoard } from '../schema/playerBoard.ts'

export const PLAYER_PROTOCOL_KIND = 'player-view'
export const CURRENT_PLAYER_PROTOCOL_VERSION = 1
export const MAX_PLAYER_MESSAGE_BYTES = 240_000
export const MAX_PLAYER_PAYLOAD_BYTES = 239_000
export const MAX_PLAYER_SENDERS = 100
export const LIVE_VIEW_FRESHNESS_GRACE_MS = 30_000
export const LIVE_VIEW_CLOCK_SKEW_MS = 5_000

export interface ActiveLiveView {
  status: 'ok'
  capability: string
  capabilityHash: string
  generation: number
}

export interface LiveViewAuthorityState {
  capabilityHash: string
  generation: number
}

export type PlayerTrafficPath = 'join' | 'retry' | 'presence' | 'broadcast'
export type PlayerTrafficState = Partial<
  Record<PlayerTrafficPath, { windowStartedAt: number; count: number }>
>

const PLAYER_TRAFFIC_LIMITS: Record<PlayerTrafficPath, { limit: number; windowMs: number }> = {
  join: { limit: 3, windowMs: 10_000 },
  retry: { limit: 3, windowMs: 30_000 },
  presence: { limit: 5, windowMs: 30_000 },
  broadcast: { limit: 8, windowMs: 1_000 },
}

/** Activate the next owner capability generation after validating its opaque hash. */
export function activateLiveViewAuthority(
  current: LiveViewAuthorityState | null,
  capabilityHash: string,
  generation: number,
): LiveViewAuthorityState {
  if (!/^[a-f0-9]{64}$/.test(capabilityHash) || generation <= (current?.generation ?? 0)) {
    throw new TypeError('The live-view authority transition is invalid.')
  }
  return { capabilityHash, generation }
}

/** Revoke only the matching generation so a delayed stop cannot revoke a rotation. */
export function revokeLiveViewAuthority(
  current: LiveViewAuthorityState | null,
  capabilityHash: string,
): LiveViewAuthorityState | null {
  return current?.capabilityHash === capabilityHash ? null : current
}

/** Consume one bounded protocol action without sharing counters across traffic paths. */
export function consumePlayerTraffic(
  state: PlayerTrafficState,
  path: PlayerTrafficPath,
  now: number,
): {
  allowed: boolean
  state: PlayerTrafficState
  limit: number
  windowMs: number
} {
  const { limit, windowMs } = PLAYER_TRAFFIC_LIMITS[path]
  const previous = state[path]
  const active = previous && now - previous.windowStartedAt < windowMs
  const next = active ? previous.count + 1 : 1
  if (next > limit) return { allowed: false, state, limit, windowMs }
  return {
    allowed: true,
    state: {
      ...state,
      [path]: { windowStartedAt: active ? previous.windowStartedAt : now, count: next },
    },
    limit,
    windowMs,
  }
}

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
  traffic: PlayerTrafficState
}

export const INITIAL_PLAYER_PROTOCOL_STATE: PlayerProtocolState = {
  nextSequence: 0,
  lastReceivedSequences: {},
  traffic: {},
}

export interface PlayerProtocolSend {
  state: PlayerProtocolState
  envelope: PlayerEnvelope
  canonical: string
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

export type PlayerFreshnessStatus =
  'connecting' | 'live' | 'reconnecting' | 'connection-lost' | 'access-ended'

export interface PlayerFreshnessState {
  status: PlayerFreshnessStatus
  board: PlayerBoard | null
  lastAcceptedAt: number | null
}

export const INITIAL_PLAYER_FRESHNESS_STATE: PlayerFreshnessState = {
  status: 'connecting',
  board: null,
  lastAcceptedAt: null,
}

/** Apply only validated, current owner traffic to the player-view freshness state. */
export function applyPlayerFreshnessMessage(
  state: PlayerFreshnessState,
  received: PlayerProtocolReceive,
  receivedAt: number,
): PlayerFreshnessState {
  if (state.status === 'access-ended' || received.status !== 'accepted') return state
  if (received.message.type === 'closed') {
    return { status: 'access-ended', board: null, lastAcceptedAt: null }
  }
  if (received.message.type === 'locked') return INITIAL_PLAYER_FRESHNESS_STATE
  if (received.message.type !== 'board') return state
  const age = receivedAt - received.envelope.sentAt
  if (age > LIVE_VIEW_FRESHNESS_GRACE_MS || age < -LIVE_VIEW_CLOCK_SKEW_MS) return state
  return { status: 'live', board: received.message.board, lastAcceptedAt: receivedAt }
}

/** Move a formerly live player view into its bounded reconnection grace period. */
export function markPlayerConnectionLost(
  state: PlayerFreshnessState,
  now: number,
): PlayerFreshnessState {
  if (state.status === 'access-ended' || state.status === 'connection-lost') return state
  if (state.board && state.lastAcceptedAt !== null) {
    return refreshPlayerFreshness({ ...state, status: 'reconnecting' }, now)
  }
  return { ...state, status: 'connection-lost' }
}

/** Cover a board once its last validated update is older than the grace period. */
export function refreshPlayerFreshness(
  state: PlayerFreshnessState,
  now: number,
): PlayerFreshnessState {
  if (
    (state.status !== 'live' && state.status !== 'reconnecting') ||
    state.lastAcceptedAt === null ||
    now - state.lastAcceptedAt < LIVE_VIEW_FRESHNESS_GRACE_MS
  ) {
    return state
  }
  return { ...state, status: 'connection-lost' }
}

/** End access immediately after a confirmed authorization or lifecycle failure. */
export function endPlayerAccess(): PlayerFreshnessState {
  return { status: 'access-ended', board: null, lastAcceptedAt: null }
}

/** Return the whole-second age shown during the reconnection grace period. */
export function playerUpdateAgeSeconds(state: PlayerFreshnessState, now: number): number | null {
  if (state.status !== 'reconnecting' || state.lastAcceptedAt === null) return null
  return Math.min(
    LIVE_VIEW_FRESHNESS_GRACE_MS / 1000,
    Math.max(0, Math.floor((now - state.lastAcceptedAt) / 1000)),
  )
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
  const budget = consumePlayerTraffic(state.traffic, 'broadcast', sentAt)
  if (!budget.allowed) throw new RangeError('The player-view broadcast rate is too high.')
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
    state: { ...state, nextSequence: state.nextSequence + 1, traffic: budget.state },
    envelope: parsed.output,
    canonical,
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
