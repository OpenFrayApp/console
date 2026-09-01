// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import * as v from 'valibot'
import type { PlayerBoard } from '../combat/playerView.ts'

export const PLAYER_PROTOCOL_KIND = 'player-view'
export const CURRENT_PLAYER_PROTOCOL_VERSION = 1
export const MAX_PLAYER_MESSAGE_BYTES = 240_000

const finiteNumber = v.pipe(v.number(), v.check<number>(Number.isFinite))
const integer = v.pipe(finiteNumber, v.integer())
const nonNegativeInteger = v.pipe(integer, v.minValue(0))
const text = v.string()
const status = v.picklist(['active', 'unconscious', 'dead'])
const advantage = v.picklist(['normal', 'advantage', 'disadvantage'])
const rollKind = v.picklist(['attack', 'save', 'check', 'damage', 'raw'])
const logCategory = v.picklist([
  'roll',
  'cast',
  'action',
  'condition',
  'concentration',
  'hp',
  'heal',
  'turn',
  'rest',
  'death',
  'note',
])

const dieGroup = v.strictObject({
  sides: finiteNumber,
  sign: v.picklist([1, -1]),
  results: v.array(finiteNumber),
  kept: v.array(finiteNumber),
  multiplier: finiteNumber,
  total: finiteNumber,
  naturalHigh: v.boolean(),
  naturalLow: v.boolean(),
})
const rollResult = v.strictObject({
  formula: text,
  dice: v.array(dieGroup),
  modifier: finiteNumber,
  modifiers: v.array(finiteNumber),
  total: finiteNumber,
  advantageState: advantage,
  kind: rollKind,
  crit: v.boolean(),
  fumble: v.boolean(),
  damageType: v.optional(text),
})
const logEntry = v.strictObject({
  id: text,
  round: finiteNumber,
  category: logCategory,
  message: text,
  result: v.optional(rollResult),
  applied: v.optional(v.array(v.strictObject({ source: text, effect: text }))),
  sourceId: v.optional(text),
  gmOnly: v.optional(v.boolean()),
  outcome: v.optional(v.picklist(['hit', 'crit', 'miss'])),
  damage: v.optional(
    v.array(
      v.strictObject({
        type: text,
        amount: finiteNumber,
        result: v.optional(rollResult),
      }),
    ),
  ),
  saved: v.optional(v.boolean()),
  amount: v.optional(finiteNumber),
})
const hp = v.nullable(
  v.variant('kind', [
    v.strictObject({
      kind: v.literal('exact'),
      current: finiteNumber,
      max: finiteNumber,
      temp: finiteNumber,
    }),
    v.strictObject({
      kind: v.literal('tier'),
      tier: v.picklist(['healthy', 'hurt', 'bloodied', 'critical']),
    }),
  ]),
)
const row = v.strictObject({
  id: text,
  initiative: finiteNumber,
  name: text,
  isFoe: v.boolean(),
  status,
  hp,
  ac: v.optional(finiteNumber),
  effects: v.pipe(
    v.array(v.strictObject({ id: text, label: text, icon: v.optional(text) })),
    v.maxLength(100),
  ),
  concentrating: v.boolean(),
  deathSaves: v.optional(v.strictObject({ successes: finiteNumber, failures: finiteNumber })),
  stable: v.optional(v.boolean()),
})
const recap = v.strictObject({
  outcome: v.picklist(['victory', 'defeat', 'inconclusive']),
  difficulty: v.nullable(v.picklist(['trivial', 'easy', 'medium', 'hard', 'deadly'])),
  rounds: finiteNumber,
  inGameSeconds: finiteNumber,
  activeMs: finiteNumber,
  totalXp: finiteNumber,
  partySize: finiteNumber,
  xpPerPlayer: v.nullable(finiteNumber),
  damageDealtTotal: finiteNumber,
  damageTakenTotal: finiteNumber,
  spellsCast: finiteNumber,
  effectsApplied: finiteNumber,
  knockouts: finiteNumber,
  awards: v.pipe(
    v.array(v.strictObject({ title: text, label: text, amount: finiteNumber })),
    v.maxLength(20),
  ),
  showXp: v.boolean(),
})
const board = v.strictObject({
  round: nonNegativeInteger,
  paused: v.boolean(),
  activeId: v.nullable(text),
  rows: v.pipe(v.array(row), v.maxLength(100)),
  log: v.pipe(v.array(logEntry), v.maxLength(60)),
  timers: v.optional(
    v.strictObject({ activeMs: finiteNumber, runningSince: v.nullable(finiteNumber) }),
  ),
  recap: v.optional(recap),
  campaign: v.optional(text),
  gm: v.optional(text),
  background: v.optional(text),
})
const emptyPayload = v.strictObject({})
const boardEnvelope = v.strictObject({
  kind: v.literal(PLAYER_PROTOCOL_KIND),
  protocolVersion: v.literal(CURRENT_PLAYER_PROTOCOL_VERSION),
  senderRole: v.literal('gm'),
  sequence: nonNegativeInteger,
  sentAt: nonNegativeInteger,
  messageType: v.literal('board'),
  payload: board,
})
const closedEnvelope = v.strictObject({
  kind: v.literal(PLAYER_PROTOCOL_KIND),
  protocolVersion: v.literal(CURRENT_PLAYER_PROTOCOL_VERSION),
  senderRole: v.literal('gm'),
  sequence: nonNegativeInteger,
  sentAt: nonNegativeInteger,
  messageType: v.literal('closed'),
  payload: emptyPayload,
})
const lockedEnvelope = v.strictObject({
  kind: v.literal(PLAYER_PROTOCOL_KIND),
  protocolVersion: v.literal(CURRENT_PLAYER_PROTOCOL_VERSION),
  senderRole: v.literal('gm'),
  sequence: nonNegativeInteger,
  sentAt: nonNegativeInteger,
  messageType: v.literal('locked'),
  payload: emptyPayload,
})
const helloEnvelope = v.strictObject({
  kind: v.literal(PLAYER_PROTOCOL_KIND),
  protocolVersion: v.literal(CURRENT_PLAYER_PROTOCOL_VERSION),
  senderRole: v.literal('viewer'),
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
  lastReceivedSequence: number | null
}

export const INITIAL_PLAYER_PROTOCOL_STATE: PlayerProtocolState = {
  nextSequence: 0,
  lastReceivedSequence: null,
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
      reason: 'too-large' | 'malformed' | 'unsupported-version' | 'role' | 'duplicate' | 'reordered'
    }

export type LegacyPlayerMessageType = 'board' | 'hello' | 'closed' | 'locked'
export type LegacyPlayerReceive =
  | { status: 'accepted'; message: PlayerProtocolMessage }
  | { status: 'rejected'; reason: 'too-large' | 'malformed' | 'role' }

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
    sequence: state.nextSequence,
    sentAt,
    messageType: message.type,
    payload: message.type === 'board' ? message.board : {},
  }
  const parsed = v.safeParse(envelope, candidate)
  if (!parsed.success) throw new TypeError('The player-view message is malformed.')
  const canonical = JSON.stringify(parsed.output)
  if (messageBytes(parsed.output)! > MAX_PLAYER_MESSAGE_BYTES) {
    throw new RangeError('The player-view message is too large.')
  }
  return {
    state: { ...state, nextSequence: state.nextSequence + 1 },
    envelope: parsed.output,
    canonical,
  }
}

/** Build one canonical message from the Game Master's restricted protocol interface. */
export function sendGameMasterMessage(
  state: PlayerProtocolState,
  message: GameMasterMessage,
  sentAt: number,
): PlayerProtocolSend {
  return sendMessage(state, 'gm', message, sentAt)
}

/** Build one canonical message from the viewer's restricted protocol interface. */
export function sendViewerMessage(
  state: PlayerProtocolState,
  message: ViewerMessage,
  sentAt: number,
): PlayerProtocolSend {
  return sendMessage(state, 'viewer', message, sentAt)
}

/** Convert a validated envelope into the role-neutral message consumed by callers. */
function messageFromEnvelope(value: PlayerEnvelope): PlayerProtocolMessage {
  switch (value.messageType) {
    case 'board':
      return { type: 'board', board: value.payload as PlayerBoard }
    case 'closed':
      return { type: 'closed' }
    case 'locked':
      return { type: 'locked' }
    case 'hello':
      return { type: 'hello' }
  }
}

/** Validate a parity-path message without letting legacy shape checks leak into Realtime. */
export function receiveLegacyPlayerMessage(
  receiverRole: PlayerProtocolRole,
  messageType: LegacyPlayerMessageType,
  payload: unknown,
): LegacyPlayerReceive {
  const bytes = messageBytes({ messageType, payload })
  if (bytes === null) return { status: 'rejected', reason: 'malformed' }
  if (bytes > MAX_PLAYER_MESSAGE_BYTES) return { status: 'rejected', reason: 'too-large' }
  const expected = receiverRole === 'viewer' ? ['board', 'closed', 'locked'] : ['hello']
  if (!expected.includes(messageType)) return { status: 'rejected', reason: 'role' }
  if (messageType === 'board') {
    const parsed = v.safeParse(board, payload)
    return parsed.success
      ? { status: 'accepted', message: { type: 'board', board: parsed.output as PlayerBoard } }
      : { status: 'rejected', reason: 'malformed' }
  }
  const parsed = v.safeParse(emptyPayload, payload)
  return parsed.success
    ? { status: 'accepted', message: { type: messageType } as PlayerProtocolMessage }
    : { status: 'rejected', reason: 'malformed' }
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

  const parsed = v.safeParse(envelope, input)
  if (!parsed.success) return { status: 'rejected', reason: 'malformed', state }
  const last = state.lastReceivedSequence
  if (last !== null && parsed.output.sequence === last) {
    return { status: 'rejected', reason: 'duplicate', state }
  }
  if (last !== null && parsed.output.sequence < last) {
    return { status: 'rejected', reason: 'reordered', state }
  }
  const nextState = { ...state, lastReceivedSequence: parsed.output.sequence }
  return {
    status: 'accepted',
    state: nextState,
    message: messageFromEnvelope(parsed.output),
    canonical: JSON.stringify(parsed.output),
    envelope: parsed.output,
  }
}
