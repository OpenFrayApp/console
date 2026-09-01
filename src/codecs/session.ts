// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import * as v from 'valibot'
import type { RollResult } from '../dice/roll.ts'
import type { SessionSnapshot } from '../state/persistence.ts'

export const SESSION_KIND = 'session'
export const CURRENT_SESSION_SCHEMA_VERSION = 3
export const MAX_SESSION_BYTES = 1_048_576

const ability = v.picklist(['str', 'dex', 'con', 'int', 'wis', 'cha'])
const damageType = v.picklist([
  'acid',
  'bludgeoning',
  'cold',
  'fire',
  'force',
  'lightning',
  'necrotic',
  'piercing',
  'poison',
  'psychic',
  'radiant',
  'slashing',
  'thunder',
])
const number = v.pipe(v.number(), v.check<number>(Number.isFinite))
const integer = v.pipe(v.number(), v.integer())
const nonNegativeInteger = v.pipe(integer, v.minValue(0))
const strings = v.array(v.string())
const numericRecord = v.record(v.string(), number)
const booleanRecord = v.record(v.string(), v.strictObject({ available: v.boolean() }))

const abilities = v.strictObject({
  str: number,
  dex: number,
  con: number,
  int: number,
  wis: number,
  cha: number,
})
const speeds = v.strictObject({
  walk: v.optional(number),
  fly: v.optional(number),
  swim: v.optional(number),
  climb: v.optional(number),
  burrow: v.optional(number),
  hover: v.optional(v.boolean()),
})
const senses = v.strictObject({
  passivePerception: number,
  darkvision: v.optional(number),
  blindsight: v.optional(number),
  tremorsense: v.optional(number),
  truesight: v.optional(number),
})
const abilityNumbers = v.record(ability, number)

const recharge = v.variant('type', [
  v.strictObject({ type: v.literal('dice'), value: number }),
  v.strictObject({ type: v.literal('perDay'), value: number }),
  v.strictObject({ type: v.literal('perRound'), value: number }),
])
const action = v.strictObject({
  id: v.string(),
  name: v.string(),
  kind: v.picklist(['melee', 'ranged', 'save', 'utility']),
  toHit: v.nullable(number),
  reach: v.optional(number),
  range: v.optional(v.strictObject({ normal: number, long: v.optional(number) })),
  damage: v.optional(v.array(v.strictObject({ formula: v.string(), type: v.string() }))),
  save: v.optional(
    v.nullable(
      v.strictObject({
        ability,
        dc: number,
        onSave: v.picklist(['half', 'none', 'negates']),
      }),
    ),
  ),
  recharge: v.optional(recharge),
  legendaryCost: v.optional(number),
  text: v.optional(v.string()),
})
const trait = v.strictObject({ name: v.string(), text: v.string() })
const spellRef = v.strictObject({ name: v.string(), ref: v.optional(v.string()) })
const spellUsage = v.variant('type', [
  v.strictObject({ type: v.literal('atWill') }),
  v.strictObject({ type: v.literal('perDay'), per: number, shared: v.optional(v.boolean()) }),
  v.strictObject({ type: v.literal('slots'), level: number }),
])
const spellcasting = v.strictObject({
  ability: v.optional(ability),
  saveDc: v.optional(number),
  toHit: v.optional(number),
  groups: v.array(v.strictObject({ usage: spellUsage, spells: v.array(spellRef) })),
  slots: v.optional(numericRecord),
  note: v.optional(v.string()),
})
const license = v.picklist([
  'cc0-1.0',
  'cc-by-4.0',
  'cc-by-sa-4.0',
  'cc-by-nc-4.0',
  'cc-by-nc-sa-4.0',
  'ogl-1.0a',
  'reserved',
  'unstated',
])
const creature = v.strictObject({
  id: v.string(),
  source: v.string(),
  edition: v.optional(v.picklist(['5.0', '5.5'])),
  sourcePage: v.optional(number),
  derivedFrom: v.optional(v.string()),
  license: v.optional(license),
  imported: v.optional(v.boolean()),
  name: v.string(),
  size: v.string(),
  type: v.string(),
  alignment: v.optional(v.string()),
  description: v.optional(v.string()),
  ac: number,
  maxHp: number,
  hpFormula: v.optional(v.string()),
  initiative: v.optional(number),
  speed: speeds,
  abilities,
  saves: v.optional(abilityNumbers),
  skills: v.optional(numericRecord),
  senses,
  languages: v.optional(strings),
  resistances: v.optional(strings),
  immunities: v.optional(strings),
  vulnerabilities: v.optional(strings),
  conditionImmunities: v.optional(strings),
  gear: v.optional(strings),
  cr: v.optional(number),
  xp: v.optional(number),
  xpLair: v.optional(number),
  traits: v.optional(v.array(trait)),
  actions: v.optional(v.array(action)),
  bonusActions: v.optional(v.array(action)),
  reactions: v.optional(v.array(action)),
  legendaryActions: v.optional(
    v.strictObject({
      perRound: number,
      perRoundLair: v.optional(number),
      actions: v.array(action),
    }),
  ),
  lairActions: v.optional(v.array(action)),
  spellcasting: v.optional(spellcasting),
  limitedUse: v.optional(
    v.array(
      v.strictObject({
        id: v.string(),
        name: v.string(),
        recharge,
        action,
      }),
    ),
  ),
  legendaryResistance: v.optional(number),
  legendaryResistanceLair: v.optional(number),
})

const effect = v.strictObject({
  id: v.string(),
  name: v.string(),
  icon: v.optional(v.string()),
  source: v.optional(v.string()),
  modifier: v.nullable(
    v.strictObject({
      applies: v.picklist([
        'attackRolls',
        'savingThrows',
        'abilityChecks',
        'ac',
        'speed',
        'maxHp',
        'all',
      ]),
      mode: v.picklist(['advantage', 'disadvantage', 'flatBonus']),
      value: v.nullable(v.union([number, v.string()])),
      direction: v.picklist(['incoming', 'outgoing']),
      abilities: v.optional(v.array(ability)),
      acBase: v.optional(number),
    }),
  ),
  duration: v.strictObject({
    type: v.picklist([
      'consumeOnRoll',
      'rounds',
      'untilSourceTurn',
      'saveEnds',
      'manual',
      'counter',
    ]),
    endsOnRoll: v.optional(v.boolean()),
    rounds: v.optional(v.nullable(number)),
    count: v.optional(number),
    save: v.optional(v.nullable(v.strictObject({ ability, dc: number }))),
    when: v.optional(v.picklist(['startOfTurn', 'endOfTurn'])),
  }),
  skipsTurn: v.optional(v.boolean()),
  concentration: v.optional(v.boolean()),
  note: v.optional(v.string()),
  durationNote: v.optional(v.string()),
  bundle: v.optional(v.strictObject({ id: v.string(), name: v.string() })),
  gmOnly: v.optional(v.boolean()),
})
const hp = v.strictObject({ current: number, max: number, temp: number })
const concentration = v.nullable(
  v.strictObject({
    spell: v.string(),
    saveDc: number,
    round: number,
    rounds: v.optional(v.nullable(number)),
  }),
)
const combatantBase = {
  combatantId: v.string(),
  initiative: number,
  status: v.picklist(['active', 'unconscious', 'dead']),
  hp,
  concentration,
  effects: v.array(effect),
  reactionUsed: v.optional(v.boolean()),
  shared: v.optional(v.picklist(['auto', 'shown', 'hidden'])),
}
const visibility = v.strictObject({
  name: v.picklist(['shown', 'hidden', 'unknown']),
  hp: v.picklist(['exact', 'bloodied', 'hidden']),
  conditions: v.picklist(['shown', 'hidden']),
  ac: v.picklist(['shown', 'hidden']),
})
const monsterCombatant = v.strictObject({
  ...combatantBase,
  isPC: v.literal(false),
  creatureId: v.string(),
  creature,
  label: v.string(),
  slotsUsed: numericRecord,
  spellUsesSpent: numericRecord,
  actionUsesSpent: v.optional(numericRecord),
  limitedUseState: booleanRecord,
  legendaryRemaining: number,
  legendaryResistanceSpent: v.optional(number),
  inLair: v.optional(v.boolean()),
  side: v.optional(v.picklist(['friend', 'foe'])),
  visibility,
})
const pcCombatant = v.strictObject({
  ...combatantBase,
  isPC: v.literal(true),
  kind: v.optional(v.picklist(['pc', 'quick'])),
  rosterId: v.optional(v.string()),
  side: v.optional(v.picklist(['friend', 'foe'])),
  name: v.string(),
  ac: number,
  initiativeMod: v.optional(number),
  class: v.optional(
    v.picklist([
      'Barbarian',
      'Bard',
      'Cleric',
      'Druid',
      'Fighter',
      'Monk',
      'Paladin',
      'Ranger',
      'Rogue',
      'Sorcerer',
      'Warlock',
      'Wizard',
    ]),
  ),
  level: v.optional(number),
  armor: v.optional(
    v.picklist([
      'mage-armor',
      'padded',
      'leather',
      'studded-leather',
      'hide',
      'chain-shirt',
      'scale-mail',
      'breastplate',
      'half-plate',
      'ring-mail',
      'chain-mail',
      'splint',
      'plate',
    ]),
  ),
  armorBonus: v.optional(number),
  shield: v.optional(v.boolean()),
  shieldBonus: v.optional(number),
  acAuto: v.optional(v.boolean()),
  passivePerception: v.optional(number),
  senses: v.optional(senses),
  languages: v.optional(strings),
  resistances: v.optional(strings),
  immunities: v.optional(strings),
  vulnerabilities: v.optional(strings),
  speed: v.optional(speeds),
  abilities: v.optional(abilities),
  deathSaves: v.optional(v.strictObject({ successes: number, failures: number })),
  alignment: v.optional(v.string()),
  race: v.optional(v.string()),
  faith: v.optional(v.string()),
  personalityTraits: v.optional(strings),
  ideals: v.optional(strings),
  bonds: v.optional(strings),
  flaws: v.optional(strings),
  backstory: v.optional(v.string()),
  dmNotes: v.optional(v.string()),
})
const combatant = v.variant('isPC', [monsterCombatant, pcCombatant])

const dieGroup = v.strictObject({
  sides: number,
  sign: v.picklist([1, -1]),
  results: v.array(number),
  kept: v.array(number),
  multiplier: number,
  total: number,
  naturalHigh: v.boolean(),
  naturalLow: v.boolean(),
})
const rollResult = v.strictObject({
  rollId: v.optional(v.string()),
  formula: v.string(),
  dice: v.array(dieGroup),
  modifier: number,
  modifiers: v.array(number),
  total: number,
  advantageState: v.picklist(['normal', 'advantage', 'disadvantage']),
  kind: v.picklist(['attack', 'save', 'check', 'damage', 'raw']),
  crit: v.boolean(),
  fumble: v.boolean(),
  damageType: v.optional(damageType),
})
const applied = v.strictObject({ source: v.string(), effect: v.string() })
const gameLogEntry = v.strictObject({
  id: v.string(),
  round: number,
  category: v.picklist([
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
  ]),
  message: v.string(),
  result: v.optional(rollResult),
  applied: v.optional(v.array(applied)),
  sourceId: v.optional(v.string()),
  gmOnly: v.optional(v.boolean()),
  outcome: v.optional(v.picklist(['hit', 'crit', 'miss'])),
  damage: v.optional(
    v.array(v.strictObject({ type: v.string(), amount: number, result: v.optional(rollResult) })),
  ),
  saved: v.optional(v.boolean()),
  amount: v.optional(number),
})
const combatStats = v.strictObject({
  startedAt: number,
  activeMs: number,
  runningSince: v.nullable(number),
  damageDealt: numericRecord,
  damageTaken: numericRecord,
  biggestHit: v.nullable(v.strictObject({ sourceId: v.string(), amount: number })),
  difficulty: v.optional(v.nullable(v.picklist(['trivial', 'easy', 'medium', 'hard', 'deadly']))),
})
const encounter = v.strictObject({
  encounterId: v.string(),
  ownerId: v.nullable(v.string()),
  name: v.optional(v.string()),
  round: nonNegativeInteger,
  paused: v.optional(v.boolean()),
  activeIndex: nonNegativeInteger,
  shortRests: v.optional(nonNegativeInteger),
  combatants: v.array(combatant),
  log: v.array(gameLogEntry),
  fightLogStart: v.optional(nonNegativeInteger),
  combatStats: v.optional(combatStats),
})
const sessionSnapshot = v.object({
  encounter,
  theme: v.picklist(['dark', 'light']),
  view: v.picklist(['encounter', 'compendium']),
  selectedId: v.nullable(v.string()),
  activeCampaignId: v.optional(v.nullable(v.string())),
  sharing: v.optional(v.boolean()),
})
const currentEnvelope = v.object({
  kind: v.literal(SESSION_KIND),
  schemaVersion: v.literal(CURRENT_SESSION_SCHEMA_VERSION),
  payload: sessionSnapshot,
})
const oldDieGroup = v.strictObject({
  sides: number,
  sign: v.picklist([1, -1]),
  results: v.array(number),
  kept: v.array(number),
  total: number,
})
const oldRollResult = v.strictObject({
  formula: v.string(),
  kind: v.picklist(['attack', 'save', 'check', 'damage', 'raw']),
  dice: v.array(oldDieGroup),
  modifier: number,
  total: number,
  crit: v.boolean(),
  fumble: v.boolean(),
  advantageState: v.picklist(['normal', 'advantage', 'disadvantage']),
  damageType: v.optional(damageType),
})
const compatibleRollResult = v.union([rollResult, oldRollResult])
const legacyGameLogEntryV2 = v.strictObject({
  id: v.string(),
  round: number,
  category: v.picklist([
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
  ]),
  message: v.string(),
  result: v.optional(compatibleRollResult),
  applied: v.optional(v.array(applied)),
  sourceId: v.optional(v.string()),
  gmOnly: v.optional(v.boolean()),
  outcome: v.optional(v.picklist(['hit', 'crit', 'miss'])),
  damage: v.optional(
    v.array(
      v.strictObject({
        type: v.string(),
        amount: number,
        result: v.optional(compatibleRollResult),
      }),
    ),
  ),
  saved: v.optional(v.boolean()),
  amount: v.optional(number),
})
const legacyEncounterV2 = v.strictObject({
  encounterId: v.string(),
  ownerId: v.nullable(v.string()),
  name: v.optional(v.string()),
  round: nonNegativeInteger,
  paused: v.optional(v.boolean()),
  activeIndex: nonNegativeInteger,
  shortRests: v.optional(nonNegativeInteger),
  combatants: v.array(combatant),
  log: v.array(legacyGameLogEntryV2),
  fightLogStart: v.optional(nonNegativeInteger),
  combatStats: v.optional(combatStats),
})
const legacyEnvelopeV2 = v.strictObject({
  version: v.literal(2),
  snapshot: v.strictObject({
    encounter: legacyEncounterV2,
    theme: v.picklist(['dark', 'light']),
    view: v.picklist(['encounter', 'compendium']),
    selectedId: v.nullable(v.string()),
    activeCampaignId: v.optional(v.nullable(v.string())),
    sharing: v.optional(v.boolean()),
  }),
})
const oldEncounterLogEntry = v.strictObject({ id: v.string(), round: number, message: v.string() })
const legacyEncounterV1 = v.strictObject({
  encounterId: v.string(),
  ownerId: v.nullable(v.string()),
  name: v.optional(v.string()),
  round: nonNegativeInteger,
  paused: v.optional(v.boolean()),
  activeIndex: nonNegativeInteger,
  shortRests: v.optional(nonNegativeInteger),
  combatants: v.array(combatant),
  log: v.array(oldEncounterLogEntry),
  combatStats: v.optional(
    v.strictObject({
      startedAt: number,
      activeMs: number,
      runningSince: v.nullable(number),
      damageDealt: numericRecord,
      damageTaken: numericRecord,
      biggestHit: v.nullable(v.strictObject({ sourceId: v.string(), amount: number })),
    }),
  ),
})
const legacyEnvelopeV1 = v.strictObject({
  version: v.literal(1),
  snapshot: v.strictObject({
    encounter: legacyEncounterV1,
    rollLog: v.array(
      v.strictObject({
        id: v.string(),
        label: v.string(),
        result: v.optional(oldRollResult),
        applied: v.optional(v.array(applied)),
      }),
    ),
    theme: v.picklist(['dark', 'light']),
    view: v.picklist(['encounter', 'compendium']),
    selectedId: v.nullable(v.string()),
    activeCampaignId: v.optional(v.nullable(v.string())),
  }),
})

type ParsedSessionSnapshot = v.InferOutput<typeof sessionSnapshot>
type OldRollResult = v.InferOutput<typeof oldRollResult>
type CompatibleRollResult = v.InferOutput<typeof compatibleRollResult>
type LegacyGameLogEntryV2 = v.InferOutput<typeof legacyGameLogEntryV2>

export type SessionDecodeResult =
  | { status: 'ok'; snapshot: SessionSnapshot; canonical: string; migratedFrom?: 1 | 2 }
  | { status: 'unsupported'; schemaVersion?: number }
  | { status: 'invalid'; reason: 'too-large' | 'json' | 'envelope' | 'payload' | 'semantic' }

export type SessionEncodeResult =
  | { status: 'ok'; serialized: string }
  | { status: 'invalid'; reason: 'payload' | 'semantic' | 'too-large' }

/** Return the UTF-8 size used by browser storage and the codec bound. */
function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

const MAX_INPUT_DEPTH = 100
const MAX_INPUT_NODES = 100_000

/** Inspect parsed input within fixed depth and node bounds. */
function inspectInput(value: unknown): 'ok' | 'dangerous-key' | 'too-complex' {
  const pending: { value: unknown; depth: number }[] = [{ value, depth: 0 }]
  let nodes = 0
  while (pending.length > 0) {
    const current = pending.pop()
    if (!current || !current.value || typeof current.value !== 'object') continue
    nodes += 1
    if (nodes > MAX_INPUT_NODES || current.depth > MAX_INPUT_DEPTH) return 'too-complex'
    for (const [key, child] of Object.entries(current.value)) {
      if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
        return 'dangerous-key'
      }
      pending.push({ value: child, depth: current.depth + 1 })
    }
  }
  return 'ok'
}

/** Give historical dice records deterministic identities without replaying their outcomes. */
function repairRollIdentities(value: ParsedSessionSnapshot): ParsedSessionSnapshot {
  const log = value.encounter.log.map((entry, entryIndex) => ({
    ...entry,
    ...(entry.result
      ? {
          result: {
            ...entry.result,
            rollId:
              entry.result.rollId ??
              `legacy:${value.encounter.encounterId}:${entry.id}:${entryIndex}:result`,
          },
        }
      : {}),
    ...(entry.damage
      ? {
          damage: entry.damage.map((part, partIndex) => ({
            ...part,
            ...(part.result
              ? {
                  result: {
                    ...part.result,
                    rollId:
                      part.result.rollId ??
                      `legacy:${value.encounter.encounterId}:${entry.id}:${entryIndex}:damage:${partIndex}`,
                  },
                }
              : {}),
          })),
        }
      : {}),
  }))
  return { ...value, encounter: { ...value.encounter, log } }
}

/** Apply named non-semantic repairs after structural decoding. */
function repairSnapshot(value: ParsedSessionSnapshot): ParsedSessionSnapshot {
  const identified = repairRollIdentities(value)
  if (
    identified.selectedId !== null &&
    !identified.encounter.combatants.some(
      (combatant) => combatant.combatantId === identified.selectedId,
    )
  ) {
    return { ...identified, selectedId: null }
  }
  return identified
}

/** Check aggregate invariants that cannot be expressed as local structural fields. */
function isSemanticallyValid(value: ParsedSessionSnapshot): boolean {
  const ids = value.encounter.combatants.map((combatant) => combatant.combatantId)
  if (new Set(ids).size !== ids.length) return false
  const logIds = value.encounter.log.map((entry) => entry.id)
  if (new Set(logIds).size !== logIds.length) return false
  const rollIds = value.encounter.log.flatMap((entry) => [
    ...(entry.result?.rollId ? [entry.result.rollId] : []),
    ...(entry.damage?.flatMap((part) => (part.result?.rollId ? [part.result.rollId] : [])) ?? []),
  ])
  if (new Set(rollIds).size !== rollIds.length) return false
  if (value.encounter.combatants.length === 0) return value.encounter.activeIndex === 0
  return value.encounter.activeIndex < value.encounter.combatants.length
}

/** Fill fields introduced by opendice without discarding historical die values. */
function migrateRollResult(result: OldRollResult): RollResult {
  return {
    ...result,
    dice: result.dice.map((group) => {
      const keptTotal = group.kept.reduce((sum, value) => sum + value, 0)
      const signedKeptTotal = group.sign * keptTotal
      const keptOneRolledFace = group.kept.length === 1 && group.results.includes(group.kept[0])
      return {
        ...group,
        multiplier: signedKeptTotal === 0 ? 1 : group.total / signedKeptTotal,
        naturalHigh: keptOneRolledFace && group.kept[0] === group.sides,
        naturalLow: keptOneRolledFace && group.kept[0] === 1,
      }
    }),
    modifiers: result.modifier === 0 ? [] : [result.modifier],
  }
}

/** Normalize a current or historical roll result to the current opendice record. */
function migrateCompatibleRollResult(result: CompatibleRollResult): RollResult {
  return 'modifiers' in result ? result : migrateRollResult(result)
}

/** Migrate a v2 snapshot through every nested dice record to the current payload. */
function migrateV2ToV3(
  input: v.InferOutput<typeof legacyEnvelopeV2>,
): ParsedSessionSnapshot | null {
  const old = input.snapshot
  const log = old.encounter.log.map((entry) => ({
    ...entry,
    ...(entry.result ? { result: migrateCompatibleRollResult(entry.result) } : {}),
    ...(entry.damage
      ? {
          damage: entry.damage.map((part) => ({
            ...part,
            ...(part.result ? { result: migrateCompatibleRollResult(part.result) } : {}),
          })),
        }
      : {}),
  }))
  const migrated = v.safeParse(sessionSnapshot, {
    ...old,
    encounter: { ...old.encounter, log },
  })
  return migrated.success ? migrated.output : null
}

/** Migrate the historical v1 roll-only log into a validated v2 envelope. */
function migrateV1ToV2(
  input: v.InferOutput<typeof legacyEnvelopeV1>,
): v.InferOutput<typeof legacyEnvelopeV2> | null {
  const old = input.snapshot
  const log: LegacyGameLogEntryV2[] = old.encounter.log.map((entry) => ({
    ...entry,
    category: 'note',
  }))
  for (const entry of [...old.rollLog].reverse()) {
    log.push({
      id: entry.id,
      round: old.encounter.round,
      category: 'roll',
      message: entry.label,
      ...(entry.result ? { result: entry.result } : {}),
      ...(entry.applied ? { applied: entry.applied } : {}),
    })
  }
  const migrated = v.safeParse(legacyEnvelopeV2, {
    version: 2,
    snapshot: {
      encounter: { ...old.encounter, log },
      theme: old.theme,
      view: old.view,
      selectedId: old.selectedId,
      ...(old.activeCampaignId !== undefined ? { activeCampaignId: old.activeCampaignId } : {}),
    },
  })
  return migrated.success ? migrated.output : null
}

/** Encode and revalidate the one canonical current envelope. */
function canonical(snapshot: ParsedSessionSnapshot): string | null {
  const envelope = {
    kind: SESSION_KIND,
    schemaVersion: CURRENT_SESSION_SCHEMA_VERSION,
    payload: snapshot,
  }
  const output = v.safeParse(currentEnvelope, envelope)
  if (!output.success) return null
  const serialized = JSON.stringify(output.output)
  const reparsed = v.safeParse(currentEnvelope, JSON.parse(serialized) as unknown)
  return reparsed.success ? serialized : null
}

/** Finish one decoded payload only after semantic and canonical-output validation. */
function finishDecoded(snapshot: ParsedSessionSnapshot, migratedFrom?: 1 | 2): SessionDecodeResult {
  const repaired = repairSnapshot(snapshot)
  if (!isSemanticallyValid(repaired)) return { status: 'invalid', reason: 'semantic' }
  const serialized = canonical(repaired)
  if (!serialized) return { status: 'invalid', reason: 'payload' }
  return {
    status: 'ok',
    snapshot: repaired as SessionSnapshot,
    canonical: serialized,
    ...(migratedFrom === undefined ? {} : { migratedFrom }),
  }
}

/** Decode, migrate, repair, and canonicalize one bounded serialized session. */
export function decodeSession(serialized: string): SessionDecodeResult {
  if (byteLength(serialized) > MAX_SESSION_BYTES) return { status: 'invalid', reason: 'too-large' }
  let input: unknown
  try {
    input = JSON.parse(serialized)
  } catch {
    return { status: 'invalid', reason: 'json' }
  }
  if (inspectInput(input) !== 'ok') return { status: 'invalid', reason: 'envelope' }
  if (!input || typeof input !== 'object') return { status: 'invalid', reason: 'envelope' }

  const record = input as Record<string, unknown>
  if (record.kind === SESSION_KIND && typeof record.schemaVersion === 'number') {
    if (record.schemaVersion > CURRENT_SESSION_SCHEMA_VERSION) {
      return { status: 'unsupported', schemaVersion: record.schemaVersion }
    }
    if (record.schemaVersion !== CURRENT_SESSION_SCHEMA_VERSION) {
      return { status: 'invalid', reason: 'envelope' }
    }
    const parsed = v.safeParse(currentEnvelope, input)
    if (!parsed.success) return { status: 'invalid', reason: 'payload' }
    return finishDecoded(parsed.output.payload)
  }

  if (record.version === 2) {
    const parsed = v.safeParse(legacyEnvelopeV2, input)
    if (!parsed.success) return { status: 'invalid', reason: 'payload' }
    const migrated = migrateV2ToV3(parsed.output)
    if (!migrated) return { status: 'invalid', reason: 'payload' }
    return finishDecoded(migrated, 2)
  }
  if (record.version === 1) {
    const parsed = v.safeParse(legacyEnvelopeV1, input)
    if (!parsed.success) return { status: 'invalid', reason: 'payload' }
    const v2 = migrateV1ToV2(parsed.output)
    if (!v2) return { status: 'invalid', reason: 'payload' }
    const migrated = migrateV2ToV3(v2)
    if (!migrated) return { status: 'invalid', reason: 'payload' }
    return finishDecoded(migrated, 1)
  }
  return { status: 'invalid', reason: 'envelope' }
}

/** Validate and encode one in-memory snapshot without coercing gameplay data. */
export function encodeSession(snapshot: unknown): SessionEncodeResult {
  const parsed = v.safeParse(sessionSnapshot, snapshot)
  if (!parsed.success) return { status: 'invalid', reason: 'payload' }
  const repaired = repairSnapshot(parsed.output)
  if (!isSemanticallyValid(repaired)) return { status: 'invalid', reason: 'semantic' }
  const serialized = canonical(repaired)
  if (!serialized) return { status: 'invalid', reason: 'payload' }
  if (byteLength(serialized) > MAX_SESSION_BYTES) return { status: 'invalid', reason: 'too-large' }
  return { status: 'ok', serialized }
}
