// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { canRoll } from '../dice/roll.ts'
import { cleanLine, cleanProse } from '../lib/text.ts'
import { ABILITIES, type Ability } from './primitives.ts'
import type { Action, DamageRoll, Recharge, SaveRequirement } from './action.ts'
import type {
  Creature,
  LegendaryActions,
  LimitedUse,
  Spellcasting,
  SpellGroup,
  SpellRef,
  SpellUsage,
  Trait,
} from './creature.ts'
import { TEMPLATE_LIMITS as LIMITS } from './encounterTemplate.ts'

/**
 * Reading a Creature that came from outside the app: pasted from the importer, or embedded
 * in a shared encounter. After this module runs, every Creature the compendium didn't ship
 * has been through `projectCreature`.
 *
 * That invariant is what lets the rest of the codebase treat a stat block's numbers as
 * numbers. `toHit`, `save.dc`, `damage[].formula` and a creature's save bonuses get pasted
 * into formula strings and handed to opendice, which enforces its limits by **throwing** — so
 * a `toHit` that is a string doesn't render oddly, it breaks a button.
 *
 * Hence the rule, kept narrow: a value that reaches a formula or a computed number is
 * checked, everything else is bounded, not policed. Prose is bounded and stripped of the
 * characters that make a line read as something else, but never rewritten; what keeps it from
 * reaching outside the app is that stat-block prose renders with links off (see `Markdown`).
 */

/** Every ability key, in stat-block order. */
const ABILITY_KEYS: Ability[] = [...ABILITIES]

/** Whether the value is a finite number. */
export const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
/** Whether the value is a non-blank string. */
export const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''

/** Field names as the Game Master knows them — the raw keys mean nothing to a reader. */
const FIELD_LABELS: Record<string, string> = {
  name: 'a name',
  size: 'a size',
  type: 'a type',
  ac: 'an armor class',
  maxHp: 'hit points',
  speed: 'a speed',
  abilities: 'its six ability scores',
  passivePerception: 'a passive Perception',
}

/** Join missing-field labels into an English list ("a name, a size and hit points"). */
export const listFields = (keys: string[]): string => {
  const named = keys.map((k) => FIELD_LABELS[k] ?? k)
  if (named.length === 1) return named[0]
  return `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}`
}

/**
 * The fields the app can't render a stat block without, missing from this value. An empty
 * list means it's renderable; it does not mean every other field is sound.
 */
export function missingCreatureFields(value: unknown): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return ['name']
  const c = value as Record<string, unknown>
  const abilities = c.abilities as Record<string, unknown> | undefined
  const senses = c.senses as Record<string, unknown> | undefined
  const missing: string[] = []
  if (!isStr(c.name)) missing.push('name')
  if (!isStr(c.size)) missing.push('size')
  if (!isStr(c.type)) missing.push('type')
  if (!isNum(c.ac)) missing.push('ac')
  if (!isNum(c.maxHp)) missing.push('maxHp')
  if (typeof c.speed !== 'object' || c.speed === null) missing.push('speed')
  if (!abilities || ABILITY_KEYS.some((a) => !isNum(abilities[a]))) missing.push('abilities')
  if (!senses || !isNum(senses.passivePerception)) missing.push('passivePerception')
  return missing
}

/** Every key the Creature schema defines, for the exhaustiveness check below. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CREATURE_KEYS = [
  'id',
  'source',
  'edition',
  'sourcePage',
  'name',
  'size',
  'type',
  'alignment',
  'description',
  'ac',
  'maxHp',
  'hpFormula',
  'initiative',
  'speed',
  'abilities',
  'saves',
  'skills',
  'senses',
  'languages',
  'resistances',
  'immunities',
  'vulnerabilities',
  'conditionImmunities',
  'gear',
  'cr',
  'xp',
  'xpLair',
  'traits',
  'actions',
  'bonusActions',
  'reactions',
  'legendaryActions',
  'lairActions',
  'spellcasting',
  'limitedUse',
  'legendaryResistance',
  'legendaryResistanceLair',
] as const satisfies readonly (keyof Creature)[]

/** Any `Creature` field the list above forgot; `never` when it is complete. */
type Missing = Exclude<keyof Creature, (typeof CREATURE_KEYS)[number]>
// Add the named key above *and* a reader in `projectCreature`. Until you do, it silently
// stops travelling in shared encounters and pasted imports.
const KEYS_ARE_COMPLETE: Missing extends never ? true : Missing = true
void KEYS_ARE_COMPLETE

// ---------------------------------------------------------------------------
// Readers. Each takes an unknown and gives back a value the app can use, or nothing.
// ---------------------------------------------------------------------------

/** A whole number inside a range, as JSON would carry it; nothing otherwise. */
const int = (v: unknown, min: number, max: number): number | undefined =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : undefined

/** A finite number inside a range, rounded to a whole one; nothing otherwise. */
const num = (v: unknown, min: number, max: number): number | undefined =>
  isNum(v) && v >= min && v <= max ? Math.round(v) : undefined

/** As `num`, unrounded — challenge rating is legitimately a fraction (1/8, 1/4, 1/2). */
const exact = (v: unknown, min: number, max: number): number | undefined =>
  isNum(v) && v >= min && v <= max ? v : undefined

/** A one-line string, capped; nothing when it is blank or not a string. */
const line = (v: unknown, max: number = LIMITS.entryChars): string | undefined => {
  if (typeof v !== 'string') return undefined
  const text = cleanLine(v).slice(0, max)
  return text || undefined
}

/** Prose, capped at what a stat block's longest entry plausibly runs to. */
const prose = (v: unknown): string | undefined => {
  if (typeof v !== 'string') return undefined
  const text = cleanProse(v).slice(0, LIMITS.proseChars)
  return text || undefined
}

/** A list of one-line strings, capped both ways. Empty stays empty — the compendium ships
 *  `immunities: []`, and dropping the key would be rewriting content we only read. */
const lines = (v: unknown): string[] | undefined => {
  if (!Array.isArray(v)) return undefined
  return v.slice(0, LIMITS.arrayItems).flatMap((item) => {
    const text = line(item)
    return text ? [text] : []
  })
}

/** A formula the dice engine will take, or nothing. `canRoll` owns the question — a flat
 *  "1 piercing" is rollable here even though the dice package refuses it outright. */
const formula = (v: unknown): string | undefined =>
  typeof v === 'string' && canRoll(v, LIMITS.formulaChars) ? v.trim() : undefined

/** A record of numbers keyed by known keys only — ability scores, saves, skills, speeds. */
function numberMap<K extends string>(
  v: unknown,
  keys: readonly K[],
  min: number,
  max: number,
): Partial<Record<K, number>> | undefined {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return undefined
  const raw = v as Record<string, unknown>
  const out: Partial<Record<K, number>> = {}
  let any = false
  for (const key of keys) {
    const value = num(raw[key], min, max)
    if (value === undefined) continue
    out[key] = value
    any = true
  }
  return any ? out : undefined
}

/** The skill keys a stat block can carry — the schema's own, so a stray key is dropped. */
const SKILL_KEYS = [
  'acrobatics',
  'animalHandling',
  'arcana',
  'athletics',
  'deception',
  'history',
  'insight',
  'intimidation',
  'investigation',
  'medicine',
  'nature',
  'perception',
  'performance',
  'persuasion',
  'religion',
  'sleightOfHand',
  'stealth',
  'survival',
] as const

const SPEED_KEYS = ['walk', 'fly', 'swim', 'climb', 'burrow'] as const
const SENSE_KEYS = [
  'passivePerception',
  'darkvision',
  'blindsight',
  'tremorsense',
  'truesight',
] as const

/** One damage component: a type tag we keep as written, and a formula we insist on. */
function damageList(v: unknown): DamageRoll[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out: DamageRoll[] = []
  for (const item of v.slice(0, LIMITS.arrayItems)) {
    if (typeof item !== 'object' || item === null) continue
    const d = item as Record<string, unknown>
    // A component that won't roll is dropped, so the rest of the action still resolves.
    const expr = formula(d.formula)
    if (!expr) continue
    // A tag, never math — and the compendium already ships one outside the union
    // ("charisma"), so it is bounded rather than checked against the list.
    out.push({ formula: expr, type: (line(d.type) ?? 'bludgeoning') as DamageRoll['type'] })
  }
  return out.length ? out : undefined
}

/** A saving throw. Dropped whole when its ability or DC is nonsense: a save with no ability
 *  is what puts `abilityMod(undefined)` into a d20 formula. */
function saveRequirement(v: unknown): SaveRequirement | undefined {
  if (typeof v !== 'object' || v === null) return undefined
  const s = v as Record<string, unknown>
  const ability = ABILITY_KEYS.find((a) => a === s.ability)
  const dc = int(s.dc, 0, LIMITS.dc)
  if (!ability || dc === undefined) return undefined
  const onSave = s.onSave === 'none' || s.onSave === 'negates' ? s.onSave : 'half'
  return { ability, dc, onSave }
}

/** How a limited-use ability comes back. Dropped when the count isn't one. */
function recharge(v: unknown): Recharge | undefined {
  if (typeof v !== 'object' || v === null) return undefined
  const r = v as Record<string, unknown>
  if (r.type === 'dice') {
    const value = int(r.value, 2, 6)
    return value === undefined ? undefined : { type: 'dice', value }
  }
  if (r.type === 'perDay' || r.type === 'perRound') {
    const value = int(r.value, 1, LIMITS.uses)
    return value === undefined ? undefined : { type: r.type, value }
  }
  return undefined
}

const ACTION_KINDS = ['melee', 'ranged', 'save', 'utility'] as const

/** One action, rebuilt field by field. Everything rollable about it is checked. */
function action(v: unknown): Action | undefined {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return undefined
  const a = v as Record<string, unknown>
  const name = line(a.name)
  if (!name) return undefined
  const kind = ACTION_KINDS.find((k) => k === a.kind) ?? 'utility'
  const range =
    typeof a.range === 'object' && a.range !== null
      ? (() => {
          const r = a.range as Record<string, unknown>
          const normal = num(r.normal, 0, LIMITS.feet)
          if (normal === undefined) return undefined
          const long = num(r.long, 0, LIMITS.feet)
          return { normal, ...(long !== undefined ? { long } : {}) }
        })()
      : undefined
  const save = saveRequirement(a.save)
  const rc = recharge(a.recharge)
  const text = prose(a.text)
  return {
    // Ids key the recharge and per-day state maps, so one is minted when it isn't usable.
    id: line(a.id) ?? crypto.randomUUID(),
    name,
    kind,
    // Pasted into "1d20…", so a non-integer is unrollable. Null is the schema's own
    // "this isn't an attack".
    toHit: int(a.toHit, -LIMITS.bonus, LIMITS.bonus) ?? null,
    ...(num(a.reach, 0, LIMITS.feet) !== undefined ? { reach: num(a.reach, 0, LIMITS.feet) } : {}),
    ...(range ? { range } : {}),
    ...(damageList(a.damage) ? { damage: damageList(a.damage) } : {}),
    ...(save ? { save } : {}),
    ...(rc ? { recharge: rc } : {}),
    // Gates a button, so it has to be a count; anything else means the default of one.
    ...(int(a.legendaryCost, 1, LIMITS.uses) !== undefined
      ? { legendaryCost: int(a.legendaryCost, 1, LIMITS.uses) }
      : {}),
    ...(text ? { text } : {}),
  }
}

/** A run of actions, capped, with the unreadable ones left out. */
const actionList = (v: unknown): Action[] | undefined => {
  if (!Array.isArray(v)) return undefined
  return v.slice(0, LIMITS.arrayItems).flatMap((item) => {
    const read = action(item)
    return read ? [read] : []
  })
}

/** Passive features: a name and prose, nothing computed. */
const traitList = (v: unknown): Trait[] | undefined => {
  if (!Array.isArray(v)) return undefined
  return v.slice(0, LIMITS.arrayItems).flatMap((item) => {
    if (typeof item !== 'object' || item === null) return []
    const t = item as Record<string, unknown>
    const name = line(t.name)
    return name ? [{ name, text: prose(t.text) ?? '' }] : []
  })
}

/** The legendary block. `perRound` becomes the combatant's per-round budget, so it counts. */
function legendaryActions(v: unknown): LegendaryActions | undefined {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return undefined
  const la = v as Record<string, unknown>
  const actions = actionList(la.actions) ?? []
  const perRoundLair = int(la.perRoundLair, 0, LIMITS.uses)
  return {
    // The custom-creature form's own default, for a block that carries actions but no count.
    perRound: int(la.perRound, 0, LIMITS.uses) ?? 3,
    ...(perRoundLair !== undefined ? { perRoundLair } : {}),
    actions,
  }
}

/** Recharge / x-per-day abilities. Each needs an id, because the state map is keyed on it. */
const limitedUseList = (v: unknown): LimitedUse[] | undefined => {
  if (!Array.isArray(v)) return undefined
  return v.slice(0, LIMITS.arrayItems).flatMap((item) => {
    if (typeof item !== 'object' || item === null) return []
    const lu = item as Record<string, unknown>
    const name = line(lu.name)
    const inner = action(lu.action)
    if (!name || !inner) return []
    return [
      {
        id: line(lu.id) ?? inner.id,
        name,
        recharge: recharge(lu.recharge) ?? { type: 'perDay' as const, value: 1 },
        action: inner,
      },
    ]
  })
}

/** How often a group casts. A slot level indexes the slot pool, so it has to be a count;
 *  anything unreadable falls back to at-will, which spends nothing. */
function readUsage(u: Record<string, unknown>): SpellUsage | undefined {
  if (u.type === 'slots') {
    const level = int(u.level, 1, 9)
    return level === undefined ? undefined : { type: 'slots', level }
  }
  if (u.type === 'perDay') {
    const per = int(u.per, 1, LIMITS.uses)
    if (per === undefined) return undefined
    return { type: 'perDay', per, ...(u.shared === true ? { shared: true } : {}) }
  }
  return { type: 'atWill' }
}

/** A caster's spell list. `saveDc` and `toHit` seed a cast, so both are checked. */
function spellcasting(v: unknown): Spellcasting | undefined {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return undefined
  const sc = v as Record<string, unknown>
  if (!Array.isArray(sc.groups)) return undefined
  const groups: SpellGroup[] = []
  for (const item of sc.groups.slice(0, LIMITS.arrayItems)) {
    if (typeof item !== 'object' || item === null) continue
    const g = item as Record<string, unknown>
    const spells: SpellRef[] = []
    for (const s of Array.isArray(g.spells) ? g.spells.slice(0, LIMITS.arrayItems) : []) {
      if (typeof s !== 'object' || s === null) continue
      const spell = s as Record<string, unknown>
      const name = line(spell.name)
      if (!name) continue
      const ref = line(spell.ref)
      spells.push({ name, ...(ref ? { ref } : {}) })
    }
    if (!spells.length) continue
    const u = (typeof g.usage === 'object' && g.usage !== null ? g.usage : {}) as Record<
      string,
      unknown
    >
    const usage = readUsage(u)
    if (usage) groups.push({ usage, spells })
  }
  const ability = ABILITY_KEYS.find((a) => a === sc.ability)
  const saveDc = int(sc.saveDc, 0, LIMITS.dc)
  const toHit = int(sc.toHit, -LIMITS.bonus, LIMITS.bonus)
  const slots = numberMap(sc.slots, ['1', '2', '3', '4', '5', '6', '7', '8', '9'], 0, LIMITS.uses)
  const note = prose(sc.note)
  return {
    ...(ability ? { ability } : {}),
    ...(saveDc !== undefined ? { saveDc } : {}),
    ...(toHit !== undefined ? { toHit } : {}),
    groups,
    ...(slots ? { slots } : {}),
    ...(note ? { note } : {}),
  }
}

/**
 * Copy a creature from outside the app onto the schema's own shape, field by field. Built
 * key by key rather than spread, so a `__proto__` in attacker JSON has nothing to attach to.
 *
 * Null only when the stat block can't be rendered at all, or is larger than any anyone ships.
 * Everything else is repaired rather than refused — a cast arriving one component short beats
 * a link that won't open, and the Game Master can edit all of it on the board.
 */
export function projectCreature(value: unknown): Creature | null {
  if (missingCreatureFields(value).length > 0) return null
  const raw = value as Record<string, unknown>

  const abilities = numberMap(raw.abilities, ABILITY_KEYS, -LIMITS.score, LIMITS.score)
  const speed = numberMap(raw.speed, SPEED_KEYS, 0, LIMITS.feet)
  const senses = numberMap(raw.senses, SENSE_KEYS, 0, LIMITS.feet)
  // The required-field check already passed, but a range check can still empty these — and
  // a stat block without ability scores can't roll a save.
  if (!abilities || ABILITY_KEYS.some((a) => abilities[a] === undefined)) return null
  if (!senses || senses.passivePerception === undefined) return null

  const name = line(raw.name, LIMITS.name)
  const size = line(raw.size)
  const type = line(raw.type)
  const ac = num(raw.ac, 0, LIMITS.ac)
  const maxHp = num(raw.maxHp, 1, LIMITS.hp)
  if (!name || !size || !type || ac === undefined || maxHp === undefined) return null

  const out: Creature = {
    id: line(raw.id) ?? `custom:${crypto.randomUUID()}`,
    source: line(raw.source) ?? 'custom',
    name,
    // Read out as words and never branched on, so bounded rather than matched against the
    // union: an importer writing "medium" lowercase shouldn't lose a creature over it.
    size: size as Creature['size'],
    type,
    ac,
    maxHp,
    speed: {
      ...speed,
      ...((raw.speed as Record<string, unknown>).hover === true ? { hover: true } : {}),
    },
    abilities: abilities as Creature['abilities'],
    senses: senses as Creature['senses'],
  }

  /** Set an optional field, or leave it absent. */
  const set = <K extends keyof Creature>(key: K, value: Creature[K] | undefined): void => {
    if (value !== undefined) out[key] = value
  }

  if (raw.edition === '5.0' || raw.edition === '5.5') out.edition = raw.edition
  set('sourcePage', int(raw.sourcePage, 1, 99_999))
  set('alignment', line(raw.alignment))
  set('description', prose(raw.description))
  set('hpFormula', formula(raw.hpFormula))
  // Pasted into "1d20…" at Begin, so a non-integer breaks the whole board's initiative.
  set('initiative', int(raw.initiative, -LIMITS.bonus, LIMITS.bonus))
  // Same, every time this creature rolls a saving throw or an effect ends on one.
  set('saves', numberMap(raw.saves, ABILITY_KEYS, -LIMITS.bonus, LIMITS.bonus))
  set('skills', numberMap(raw.skills, SKILL_KEYS, -LIMITS.bonus, LIMITS.bonus))
  set('languages', lines(raw.languages))
  set('resistances', lines(raw.resistances))
  set('immunities', lines(raw.immunities))
  set('vulnerabilities', lines(raw.vulnerabilities))
  set('conditionImmunities', lines(raw.conditionImmunities))
  set('gear', lines(raw.gear))
  set('cr', exact(raw.cr, 0, 99))
  set('xp', int(raw.xp, 0, 9_999_999))
  set('xpLair', int(raw.xpLair, 0, 9_999_999))
  set('traits', traitList(raw.traits))
  set('actions', actionList(raw.actions))
  set('bonusActions', actionList(raw.bonusActions))
  set('reactions', actionList(raw.reactions))
  set('legendaryActions', legendaryActions(raw.legendaryActions))
  set('lairActions', actionList(raw.lairActions))
  set('spellcasting', spellcasting(raw.spellcasting))
  set('limitedUse', limitedUseList(raw.limitedUse))
  set('legendaryResistance', int(raw.legendaryResistance, 0, LIMITS.uses))
  set('legendaryResistanceLair', int(raw.legendaryResistanceLair, 0, LIMITS.uses))

  // The bound the per-field caps can't express: within every limit on every field and still
  // enormous across all of them. One entry is copied up to thirty times onto a board.
  if (JSON.stringify(out).length > LIMITS.creatureBytes) return null
  return out
}
