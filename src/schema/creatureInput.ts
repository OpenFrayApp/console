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
 * in a shared encounter. Neither is the compendium, and after this module ran there is one
 * invariant worth stating plainly:
 *
 * > **Every Creature in the app that the compendium did not ship has been through
 * > `projectCreature`.**
 *
 * That is what lets the rest of the codebase treat a stat block's numbers as numbers. The
 * console hands `toHit`, `save.dc`, `damage[].formula` and a creature's save bonuses
 * straight to the dice engine, usually by pasting them into a formula string — and opendice
 * is properly strict about what it will roll, which it enforces by **throwing**. A `toHit`
 * that is a string rather than a number makes `"1d20" + toHit` unparseable, and the throw
 * lands in a click handler, so the button simply breaks. A `saves.dex` of `"a lot"` breaks
 * every saving throw that creature rolls; a bad `save.ability` breaks it through
 * `abilityMod(undefined)`. None of that is exotic input — it is what a hand-edited JSON file
 * looks like — and none of it should be discovered inside the roll.
 *
 * So the rule here is narrow and worth keeping narrow: **a value that reaches a formula or a
 * computed number is checked; everything else is bounded, not policed.** OpenFray is a
 * scratchpad, not a rules engine (AGENTS.md), and it is not this module's business whether a
 * challenge rating is plausible. It is very much its business whether the console can still
 * roll a d20 afterwards.
 *
 * Prose is the other half. It is bounded and stripped of the characters that make a line
 * read as something it isn't, but it is *not* rewritten — a stat block's markdown belongs to
 * whoever wrote it. What stops a stranger's prose reaching outside the app is that stat-block
 * prose renders with links and images off (see `Markdown`), which costs the compendium
 * nothing because the compendium's prose contains neither.
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

/**
 * Every key the Creature schema defines. A creature from outside is copied key by key from
 * this list, so anything else — a `__proto__`, a payload hidden in a field we don't know,
 * sixty kilobytes of nothing — is dropped rather than carried onto a board and saved to an
 * account.
 *
 * The `Missing` check below fails the build if a field is added to `Creature` and not here,
 * because a field missing from this list silently stops travelling in a shared encounter or
 * an import — the safe direction to fail, but not one to discover by accident.
 */
// Read only as a type, by the exhaustiveness check below — which is the whole point of it.
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

/**
 * Any `Creature` field the list above forgot; `never` when it is complete.
 *
 * The assignment below stops compiling when a field is added to `Creature` and not here, and
 * names the missing key in the error. It is the only use of `CREATURE_KEYS` — the readers
 * spell each field out one at a time, which is what lets each one say how it is read — so the
 * list's whole job is being this check.
 */
type Missing = Exclude<keyof Creature, (typeof CREATURE_KEYS)[number]>
// Add the named key to CREATURE_KEYS *and* give it a reader in `projectCreature`. Until you
// do, it stops travelling in shared encounters and pasted imports, silently.
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

/**
 * A finite number inside a range, kept exactly as written. Challenge rating is the one stat
 * that is legitimately a fraction — 1/8, 1/4, 1/2 — so rounding it would turn a CR 1/2
 * creature into a CR 1 one and quietly change what the difficulty meter says.
 */
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

/**
 * A list of one-line strings — languages, gear, damage types — capped both ways. An empty
 * list comes back empty rather than absent: the compendium ships `immunities: []`, and
 * turning that into a missing key would be this module rewriting content it was only asked
 * to read.
 */
const lines = (v: unknown): string[] | undefined => {
  if (!Array.isArray(v)) return undefined
  return v.slice(0, LIMITS.arrayItems).flatMap((item) => {
    const text = line(item)
    return text ? [text] : []
  })
}

/**
 * A formula the app will hand to the dice engine, or nothing.
 *
 * The question is `canRoll`'s to answer, not this module's: it is the dice chokepoint's own
 * two branches, and a stat block that deals a flat "1 piercing" is rollable here even though
 * the dice package refuses it outright.
 */
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
    const expr = formula(d.formula)
    // A component whose formula won't roll is dropped rather than kept as a number that
    // breaks the attack: the rest of the action still resolves, and the Game Master can
    // type the damage. Keeping it would move the failure into the click.
    if (!expr) continue
    // The type is a tag, never math — it only ever matches against a creature's
    // resistances — and the shipped compendium already carries one outside the union
    // ("charisma", from a drain), so it is bounded rather than checked against the list.
    out.push({ formula: expr, type: (line(d.type) ?? 'bludgeoning') as DamageRoll['type'] })
  }
  return out.length ? out : undefined
}

/** A saving throw an action calls for. Dropped whole when its ability or DC is nonsense —
 *  a save with no ability is what puts `abilityMod(undefined)` into a d20 formula. */
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
    // `toHit` is pasted into "1d20…", so a non-integer makes it unrollable. Null is the
    // schema's own "this isn't an attack", which is the honest thing to say about it.
    toHit: int(a.toHit, -LIMITS.bonus, LIMITS.bonus) ?? null,
    ...(num(a.reach, 0, LIMITS.feet) !== undefined ? { reach: num(a.reach, 0, LIMITS.feet) } : {}),
    ...(range ? { range } : {}),
    ...(damageList(a.damage) ? { damage: damageList(a.damage) } : {}),
    ...(save ? { save } : {}),
    ...(rc ? { recharge: rc } : {}),
    // Gates a button — "costs more legendary actions than are left" — so it has to be a
    // count. Anything else means the default of one.
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

/**
 * How often a group can be cast. A slot level indexes the slot pool and a per-day count is
 * decremented on screen, so both have to be counts; anything unreadable falls back to
 * at-will, which spends nothing and so can't go wrong.
 */
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
      // A ref keys the uses map and resolves the card. It only ever matches a compendium
      // id we shipped, so an unrecognizable one costs the reader a hover card and nothing
      // more — the cast modal already says when there is no entry behind a spell.
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
 * Copy a creature from outside the app onto the schema's own shape, field by field.
 *
 * Returns null only when the stat block can't be rendered at all — the required-field check
 * — or when what came back is larger than any stat block anyone ships. Everything else is
 * repaired rather than refused: an unrollable damage formula is dropped, a `toHit` that
 * isn't a number becomes "not an attack", a saving throw with no ability goes away. A cast
 * that arrives one component short is a better outcome than a link that refuses to open, and
 * the Game Master can see and edit every one of these on the board.
 *
 * The result is a fresh object built key by key — never a spread of the input — so a
 * `__proto__` in attacker JSON has nothing to attach to.
 */
export function projectCreature(value: unknown): Creature | null {
  if (missingCreatureFields(value).length > 0) return null
  const raw = value as Record<string, unknown>

  const abilities = numberMap(raw.abilities, ABILITY_KEYS, -LIMITS.score, LIMITS.score)
  const speed = numberMap(raw.speed, SPEED_KEYS, 0, LIMITS.feet)
  const senses = numberMap(raw.senses, SENSE_KEYS, 0, LIMITS.feet)
  // The required-field check already said these are all there and numeric; a range check
  // can still empty them, and a stat block without ability scores can't roll a save.
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
    // Size and type are read out as words and never branched on, so they are bounded
    // rather than matched against the union — an importer that writes "medium" lowercase
    // should not lose a creature over it.
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

  /** Set an optional field when the reader gave one back, and leave it absent when it didn't. */
  const set = <K extends keyof Creature>(key: K, value: Creature[K] | undefined): void => {
    if (value !== undefined) out[key] = value
  }

  if (raw.edition === '5.0' || raw.edition === '5.5') out.edition = raw.edition
  set('sourcePage', int(raw.sourcePage, 1, 99_999))
  set('alignment', line(raw.alignment))
  set('description', prose(raw.description))
  set('hpFormula', formula(raw.hpFormula))
  // Pasted into "1d20…" when initiative is rolled, so a non-integer here breaks Begin
  // combat for the whole board, not just this creature.
  set('initiative', int(raw.initiative, -LIMITS.bonus, LIMITS.bonus))
  // Save bonuses go into a d20 formula the same way, every time this creature rolls a
  // saving throw or an effect ends on one.
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

  // The last bound, and the one the per-field caps can't express: a stat block within every
  // limit on every field and still enormous across all of them. The largest creature the app
  // ships is under 8KB, so this is generous — and it is what stops one entry, copied up to
  // thirty times onto a board, from writing megabytes into the recipient's autosaved
  // encounter.
  if (JSON.stringify(out).length > LIMITS.creatureBytes) return null
  return out
}
