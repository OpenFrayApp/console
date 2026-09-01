// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import * as v from 'valibot'
import { DAMAGE_TYPES, type DamageType } from './primitives.ts'

const finiteNumber = v.pipe(v.number(), v.check<number>(Number.isFinite))
const integer = v.pipe(finiteNumber, v.integer())
const nonNegativeInteger = v.pipe(integer, v.minValue(0))
const text = v.string()
const damageType = v.custom<DamageType>(
  (input) => typeof input === 'string' && DAMAGE_TYPES.includes(input as DamageType),
)
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
  damageType: v.optional(damageType),
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
const playerHpSchema = v.nullable(
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
const playerRowSchema = v.strictObject({
  id: text,
  initiative: finiteNumber,
  name: text,
  isFoe: v.boolean(),
  status,
  hp: playerHpSchema,
  ac: v.optional(finiteNumber),
  effects: v.pipe(
    v.array(v.strictObject({ id: text, label: text, icon: v.optional(text) })),
    v.maxLength(100),
  ),
  concentrating: v.boolean(),
  deathSaves: v.optional(v.strictObject({ successes: finiteNumber, failures: finiteNumber })),
  stable: v.optional(v.boolean()),
})
const playerRecapSchema = v.strictObject({
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

/** The canonical structural schema for the privacy-filtered player board. */
export const playerBoardSchema = v.strictObject({
  round: nonNegativeInteger,
  paused: v.boolean(),
  activeId: v.nullable(text),
  rows: v.pipe(v.array(playerRowSchema), v.maxLength(100)),
  log: v.pipe(v.array(logEntry), v.maxLength(60)),
  timers: v.optional(
    v.strictObject({ activeMs: finiteNumber, runningSince: v.nullable(finiteNumber) }),
  ),
  recap: v.optional(playerRecapSchema),
  campaign: v.optional(text),
  gm: v.optional(text),
  background: v.optional(text),
})

export type PlayerHp = v.InferOutput<typeof playerHpSchema>
export type PlayerRow = v.InferOutput<typeof playerRowSchema>
export type PlayerRecap = v.InferOutput<typeof playerRecapSchema>
export type PlayerBoard = v.InferOutput<typeof playerBoardSchema>
