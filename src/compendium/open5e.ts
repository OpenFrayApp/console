// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type {
  Ability,
  ContentSource,
  DamageType,
  Edition,
  SaveBonuses,
  Senses,
  Size,
  SkillBonuses,
  Skill,
  Speeds,
} from '../schema/primitives.ts'
import type { Action, DamageRoll, Recharge, SaveOutcome } from '../schema/action.ts'
import type {
  Creature,
  SpellGroup,
  Spellcasting,
  SpellUsage,
  Trait,
} from '../schema/creature.ts'
import type { Spell, SpellMechanics, SpellSave, SpellScaling } from '../schema/spell.ts'

/**
 * Transforms for ingesting Open5e v2 content into OpenFray's schema. We pull
 * once, clean, and seed — never call the API live (see docs/PROJECT-PLAN.md). The
 * mappers read only the fields we need and tolerate the rest of the payload.
 */

/** Map an Open5e document key to our source + edition. */
export function mapSource(documentKey: string): {
  source: ContentSource
  edition?: Edition
} {
  switch (documentKey) {
    case 'srd-2024':
      return { source: 'srd-5.2', edition: '5.5' }
    case 'srd-2014':
      return { source: 'srd-5.1', edition: '5.0' }
    default:
      return { source: documentKey }
  }
}

/** The intra-source identity key — Open5e keys are `<document>_<slug>`. */
export function slugFromKey(key: string, documentKey: string): string {
  const prefix = `${documentKey}_`
  return key.startsWith(prefix) ? key.slice(prefix.length) : key
}

export interface Open5eSpell {
  key: string
  document: { key: string }
  name: string
  desc: string
  higher_level?: string | null
  level: number
  school: { name: string }
  classes?: { name: string }[]
  casting_time: string
  range_text: string
  duration: string
  concentration: boolean
  ritual: boolean
  verbal: boolean
  somatic: boolean
  material: boolean
  material_specified?: string | null
  // Structured mechanics (v2). Damage types use our short lowercase names.
  damage_roll?: string | null
  damage_types?: string[] | null
  saving_throw_ability?: string | null
  attack_roll?: boolean | null
  casting_options?: { type: string; damage_roll?: string | null }[] | null
}

/** Build typed damage from a spell's roll + damage types. Only typed damage is
 *  captured — a roll with no damage type (e.g. healing) yields nothing. */
function spellDamage(
  roll: string | null | undefined,
  types: string[] | null | undefined,
): DamageRoll[] | undefined {
  if (!roll || !types?.length) return undefined
  return types.map((t) => ({ formula: roll, type: t.toLowerCase() as DamageType }))
}

/** The on-save rule lives in 2024 prose, not a field. We only assert what the
 *  wording makes clear: "half ... on a success(ful)" → half; a save with no damage
 *  is treated as negates. A damage spell whose text we can't read stays
 *  `undefined` so the DM confirms it rather than us guessing wrong. */
function spellOnSave(desc: string, hasDamage: boolean): SaveOutcome | undefined {
  if (/\bhalf\b[^.]*success|success[^.]*\bhalf\b/i.test(desc)) return 'half'
  if (!hasDamage) return 'negates'
  return undefined
}

/** Higher-level damage variants. `slot_level_N` = upcast; `player_level_N` =
 *  cantrip scaling by character level. Only variants that change damage are kept. */
function spellScaling(
  opts: Open5eSpell['casting_options'],
  types: string[] | null | undefined,
): SpellScaling[] | undefined {
  if (!opts?.length) return undefined
  const out: SpellScaling[] = []
  for (const opt of opts) {
    const damage = spellDamage(opt.damage_roll, types)
    const m = /_(\d+)$/.exec(opt.type)
    if (!damage || !m) continue
    out.push({
      level: Number(m[1]),
      by: opt.type.startsWith('player_level') ? 'character' : 'slot',
      damage,
    })
  }
  return out.length ? out : undefined
}

function spellMechanics(raw: Open5eSpell): SpellMechanics | undefined {
  const damage = spellDamage(raw.damage_roll, raw.damage_types)
  const abilityName = raw.saving_throw_ability?.toLowerCase()
  const ability = abilityName ? ABILITY_BY_NAME[abilityName] : undefined
  const onSave = ability ? spellOnSave(raw.desc, !!damage) : undefined
  const save: SpellSave | undefined = ability
    ? { ability, ...(onSave && { onSave }) }
    : undefined
  // Open5e's `attack_roll` flag is set on many non-attack spells (Invisibility,
  // Bless, Faerie Fire, …) — it keyword-matches "attack" in the prose. An attack
  // roll only exists to land damage, so we trust it only alongside damage.
  const attackRoll = raw.attack_roll && damage ? true : undefined
  const scaling = spellScaling(raw.casting_options, raw.damage_types)

  if (!damage && !save && !attackRoll && !scaling) return undefined
  return {
    ...(damage && { damage }),
    ...(attackRoll && { attackRoll }),
    ...(save && { save }),
    ...(scaling && { scaling }),
  }
}

export function mapOpen5eSpell(raw: Open5eSpell): Spell {
  const documentKey = raw.document.key
  const { source, edition } = mapSource(documentKey)
  const slug = slugFromKey(raw.key, documentKey)
  const text = raw.higher_level
    ? `${raw.desc}\n\nAt Higher Levels: ${raw.higher_level}`
    : raw.desc
  const mechanics = spellMechanics(raw)

  return {
    id: `${source}:${slug}`,
    source,
    edition,
    name: raw.name,
    level: raw.level,
    school: raw.school.name,
    castingTime: raw.casting_time,
    range: raw.range_text,
    components: {
      verbal: raw.verbal,
      somatic: raw.somatic,
      material: raw.material,
      materials: raw.material_specified ?? undefined,
    },
    duration: raw.duration,
    concentration: raw.concentration,
    ritual: raw.ritual,
    classes: raw.classes?.map((c) => c.name),
    text,
    ...(mechanics && { mechanics }),
  }
}

// --- Creatures --------------------------------------------------------------

const ABILITY_BY_NAME: Record<string, Ability> = {
  strength: 'str',
  dexterity: 'dex',
  constitution: 'con',
  intelligence: 'int',
  wisdom: 'wis',
  charisma: 'cha',
}

interface Open5eAttack {
  to_hit_mod: number | null
  reach: number | null
  range: number | null
  long_range: number | null
  damage_die_count: number | null
  damage_die_type: string | null
  damage_bonus: number | null
  damage_type: { name: string } | null
  extra_damage_die_count: number | null
  extra_damage_die_type: string | null
  extra_damage_bonus: number | null
  extra_damage_type: { name: string } | null
}

interface Open5eAction {
  name: string
  desc: string
  action_type: string
  order_in_statblock?: number
  usage_limits?: { type: string; param: number | null } | null
  attacks?: Open5eAttack[]
}

function mapUsage(ul: Open5eAction['usage_limits']): Recharge | undefined {
  if (!ul || ul.param == null) return undefined
  switch (ul.type) {
    case 'RECHARGE_ON_ROLL':
      return { type: 'dice', value: ul.param }
    case 'PER_DAY':
      return { type: 'perDay', value: ul.param }
    default:
      return undefined
  }
}

export interface Open5eCreature {
  key: string
  document: { key: string }
  name: string
  size: { name: string }
  type: { name: string }
  armor_class: number
  hit_points: number
  hit_dice?: string | null
  challenge_rating?: number
  experience_points?: number | null
  initiative_bonus?: number | null
  ability_scores: Record<string, number>
  speed: Record<string, number | string>
  saving_throws_all?: Record<string, number> | null
  skill_bonuses?: Record<string, number> | null
  passive_perception?: number | null
  darkvision_range?: number | null
  blindsight_range?: number | null
  tremorsense_range?: number | null
  truesight_range?: number | null
  languages?: { as_string?: string; data?: { name: string }[] } | null
  resistances_and_immunities?: {
    damage_resistances?: { name: string }[]
    damage_immunities?: { name: string }[]
    damage_vulnerabilities?: { name: string }[]
    condition_immunities?: { name: string }[]
  } | null
  traits?: { name: string; desc: string }[]
  actions?: Open5eAction[]
}

/** 5e creatures get this many legendary actions per round; Open5e doesn't expose
 *  the count, and it is 3 for the overwhelming majority. */
const DEFAULT_LEGENDARY_PER_ROUND = 3

const dieSize = (die: string): number => Number(die.replace(/^d/i, ''))

function diceFormula(count: number, die: string, bonus?: number | null): string {
  const base = `${count}d${dieSize(die)}`
  if (!bonus) return base
  return bonus > 0 ? `${base}+${bonus}` : `${base}${bonus}`
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const DAMAGE_TYPE_RE =
  /\b(acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder)\s+damage/gi

/** Damage types named in the stat-block prose, in order ("… Slashing damage plus … Lightning damage"). */
function damageTypesInProse(desc: string): DamageType[] {
  const out: DamageType[] = []
  for (const m of desc.matchAll(DAMAGE_TYPE_RE)) out.push(m[1].toLowerCase() as DamageType)
  return out
}

/**
 * Damage from a structured attack. Open5e files a *single*-damage attack's type
 * under `extra_damage_type` (with no extra dice) — borrow that for the primary
 * only when there's no separate extra component, else the lightning would bleed
 * onto the slashing. When `damage_type` is missing, fall back to the type named
 * in the prose so each component keeps its own type.
 */
function attackDamage(a: Open5eAttack, desc: string): DamageRoll[] {
  const out: DamageRoll[] = []
  const prose = damageTypesInProse(desc)
  const hasExtra = !!(a.extra_damage_die_count && a.extra_damage_die_type)
  if (a.damage_die_count && a.damage_die_type) {
    const borrow = hasExtra ? undefined : a.extra_damage_type?.name
    const type = (a.damage_type?.name ?? borrow ?? prose[0])?.toLowerCase()
    out.push({
      formula: diceFormula(a.damage_die_count, a.damage_die_type, a.damage_bonus),
      type: type as DamageType,
    })
  }
  if (hasExtra) {
    const type = (a.extra_damage_type?.name ?? prose[1] ?? prose[0])?.toLowerCase()
    out.push({
      formula: diceFormula(
        a.extra_damage_die_count!,
        a.extra_damage_die_type!,
        a.extra_damage_bonus,
      ),
      type: type as DamageType,
    })
  }
  return out
}

interface ParsedSave {
  ability: Ability
  dc: number
  onSave: SaveOutcome
}

/** Pull the save ability + DC + on-save rule from 2024 action prose. */
function parseSave(desc: string): ParsedSave | null {
  const m = /(\w+) Saving Throw:\s*DC (\d+)/.exec(desc)
  if (!m) return null
  const ability = ABILITY_BY_NAME[m[1].toLowerCase()]
  if (!ability) return null
  const onSave: SaveOutcome = /Success:\s*Half/i.test(desc)
    ? 'half'
    : /Failure:[^.]*damage/i.test(desc)
      ? 'none'
      : 'negates'
  return { ability, dc: Number(m[2]), onSave }
}

function parseSaveDamage(desc: string): DamageRoll[] | undefined {
  const m = /Failure:\s*\d+\s*\(([^)]+)\)\s*(\w+) damage/i.exec(desc)
  if (!m) return undefined
  return [{ formula: m[1].replace(/\s+/g, ''), type: m[2].toLowerCase() as DamageType }]
}

/** Automatic area damage with no save or attack, e.g. the Lich's Deathly Teleport
 *  ("each creature within 10 feet … takes 11 (2d10) Necrotic damage"). */
function parseAreaDamage(desc: string): DamageRoll[] | undefined {
  const m = /takes\s+\d+\s*\(([^)]+)\)\s*(\w+) damage/i.exec(desc)
  if (!m) return undefined
  return [{ formula: m[1].replace(/\s+/g, ''), type: m[2].toLowerCase() as DamageType }]
}

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Build a function that wraps known spell names in cast-flavoured prose as
 * `[Name](spell:ref)` markdown links, so the UI can hover-preview them (e.g. a
 * dragon's "uses Spellcasting to cast Command", the Archmage's "casts Counterspell
 * or Shield"). Scoped to prose containing the word "cast" to avoid linkifying the
 * many spell names that are also common words. Built once over the spell list,
 * then applied to every creature's action/trait text.
 */
export function makeSpellLinker(
  spells: { name: string; ref: string }[],
): (text: string) => string {
  const refByLower = new Map(spells.map((s) => [s.name.toLowerCase(), s.ref]))
  const names = [...new Set(spells.map((s) => s.name))]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
  if (names.length === 0) return (text) => text
  const re = new RegExp(`\\b(${names.join('|')})\\b`, 'gi')
  return (text) => {
    if (!text || !/\bcasts?\b/i.test(text)) return text
    return text.replace(re, (m) => {
      const ref = refByLower.get(m.toLowerCase())
      return ref ? `[${m}](spell:${ref})` : m
    })
  }
}

/**
 * Parse a monster's "Spellcasting" prose into a structured block. The 2024 SRD
 * format is uniform: a lead line naming the ability + save DC (+ optional spell
 * attack bonus), then markdown lines like `**At Will:** a, b` and
 * `**2/Day Each:** Fireball, Invisibility`. Each spell name is resolved to a
 * compendium ref by slug within the same source. Parsing happens here, at ingest
 * — never at runtime (see docs/AGENTS.md). Returns undefined when the prose isn't
 * a recognisable spellcasting block.
 */
export function parseSpellcasting(
  desc: string,
  source: ContentSource,
): Spellcasting | undefined {
  const abilityName = /using (\w+) as the spellcasting ability/i.exec(desc)?.[1]
  const ability = abilityName ? ABILITY_BY_NAME[abilityName.toLowerCase()] : undefined
  const saveDc = Number(/spell save DC (\d+)/i.exec(desc)?.[1]) || undefined
  const toHit = (() => {
    const m = /([+-]?\d+) to hit with spell attacks/i.exec(desc)
    return m ? Number(m[1]) : undefined
  })()

  const groups: SpellGroup[] = []
  for (const line of desc.split('\n')) {
    const m = /\*\*([^*]+?):\*\*\s*(.*)$/.exec(line)
    if (!m) continue
    const header = m[1].trim()
    const names = m[2]
      .split(',')
      .map((s) => s.trim().replace(/\s*\(.*\)$/, ''))
      .filter(Boolean)
    if (names.length === 0) continue // e.g. an empty "At Will:" line

    let usage: SpellUsage | undefined
    if (/at will/i.test(header)) usage = { type: 'atWill' }
    else {
      const per = /(\d+)\s*\/\s*day/i.exec(header)
      if (per) usage = { type: 'perDay', per: Number(per[1]) }
    }
    if (!usage) continue

    groups.push({
      usage,
      spells: names.map((name) => ({ name, ref: `${source}:${slugify(name)}` })),
    })
  }

  if (groups.length === 0) return undefined
  return {
    ...(ability && { ability }),
    ...(saveDc != null && { saveDc }),
    ...(toHit != null && { toHit }),
    groups,
  }
}

export function mapOpen5eAction(raw: Open5eAction): Action {
  const id = slugify(raw.name)
  const recharge = mapUsage(raw.usage_limits)
  const attack = raw.attacks?.[0]
  if (attack && attack.to_hit_mod != null) {
    const ranged = attack.reach == null && attack.range != null
    return {
      id,
      name: raw.name,
      kind: ranged ? 'ranged' : 'melee',
      toHit: attack.to_hit_mod,
      reach: attack.reach ?? undefined,
      range:
        attack.range != null
          ? { normal: attack.range, long: attack.long_range ?? undefined }
          : undefined,
      damage: attackDamage(attack, raw.desc),
      recharge,
      text: raw.desc,
    }
  }

  const save = parseSave(raw.desc)
  if (save) {
    return {
      id,
      name: raw.name,
      kind: 'save',
      toHit: null,
      save,
      damage: parseSaveDamage(raw.desc),
      recharge,
      text: raw.desc,
    }
  }

  // No attack and no save, but the prose deals automatic area damage: keep it
  // rollable (targets just take the damage; resolved without a save).
  const areaDamage = parseAreaDamage(raw.desc)
  if (areaDamage) {
    return { id, name: raw.name, kind: 'utility', toHit: null, damage: areaDamage, recharge, text: raw.desc }
  }

  return { id, name: raw.name, kind: 'utility', toHit: null, recharge, text: raw.desc }
}

function mapSpeed(speed: Record<string, number | string>): Speeds {
  const out: Speeds = {}
  for (const key of ['walk', 'fly', 'swim', 'climb', 'burrow'] as const) {
    if (typeof speed[key] === 'number') out[key] = speed[key]
  }
  return out
}

const abilityModifier = (score: number): number => Math.floor((score - 10) / 2)

/** Keep only proficient saves — those whose bonus differs from the ability mod. */
function mapSaves(
  all: Record<string, number> | null | undefined,
  scores: Record<string, number>,
): SaveBonuses | undefined {
  if (!all) return undefined
  const out: SaveBonuses = {}
  for (const [name, ability] of Object.entries(ABILITY_BY_NAME)) {
    const bonus = all[name]
    if (typeof bonus === 'number' && bonus !== abilityModifier(scores[name])) {
      out[ability] = bonus
    }
  }
  return Object.keys(out).length ? out : undefined
}

const toCamel = (key: string): string => key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())

function mapSkills(sb: Record<string, number> | null | undefined): SkillBonuses | undefined {
  if (!sb) return undefined
  const out: SkillBonuses = {}
  for (const [key, bonus] of Object.entries(sb)) {
    if (typeof bonus === 'number') out[toCamel(key) as Skill] = bonus
  }
  return Object.keys(out).length ? out : undefined
}

function mapLanguages(
  lang: Open5eCreature['languages'],
): string[] | undefined {
  if (!lang) return undefined
  if (lang.data?.length) return lang.data.map((l) => l.name)
  if (lang.as_string) {
    return lang.as_string.split(',').map((s) => s.trim()).filter(Boolean)
  }
  return undefined
}

const nameList = (arr: { name: string }[] | undefined): string[] | undefined =>
  arr && arr.length ? arr.map((x) => x.name) : undefined

function mapSenses(raw: Open5eCreature): Senses {
  const senses: Senses = { passivePerception: raw.passive_perception ?? 10 }
  if (raw.darkvision_range) senses.darkvision = raw.darkvision_range
  if (raw.blindsight_range) senses.blindsight = raw.blindsight_range
  if (raw.tremorsense_range) senses.tremorsense = raw.tremorsense_range
  if (raw.truesight_range) senses.truesight = raw.truesight_range
  return senses
}

const undefIfEmpty = <T>(arr: T[]): T[] | undefined => (arr.length ? arr : undefined)

export function mapOpen5eCreature(
  raw: Open5eCreature,
  opts: { linkSpells?: (text: string) => string } = {},
): Creature {
  const documentKey = raw.document.key
  const { source, edition } = mapSource(documentKey)
  const a = raw.ability_scores

  // Linkify spell names in action/trait prose for hover-preview (no-op by default).
  const link = opts.linkSpells ?? ((t: string) => t)
  const linkAction = (act: Action): Action =>
    act.text ? { ...act, text: link(act.text) } : act
  const actionsOfType = (type: string): Action[] =>
    (raw.actions ?? [])
      .filter((act) => act.action_type === type)
      .sort((x, y) => (x.order_in_statblock ?? 0) - (y.order_in_statblock ?? 0))
      .map(mapOpen5eAction)
      .map(linkAction)

  const traits: Trait[] = (raw.traits ?? []).map((t) => ({ name: t.name, text: link(t.desc) }))

  // Legendary Resistance is a trait ("Legendary Resistance (3/Day, or 4/Day in
  // Lair): …"); track its base per-day count so the DM can spend it.
  const lrTrait = traits.find((t) => /^Legendary Resistance/i.test(t.name))
  const legendaryResistance = lrTrait
    ? Number(/\((\d+)\s*\/\s*day/i.exec(lrTrait.name + ' ' + lrTrait.text)?.[1]) || undefined
    : undefined
  const legendary = actionsOfType('LEGENDARY_ACTION')

  // Spellcasting is one of the ACTION-typed entries; lift it into a structured
  // block and drop the prose action so it isn't rendered twice.
  const scRaw = (raw.actions ?? []).find(
    (a) => a.action_type === 'ACTION' && /spellcasting/i.test(a.name),
  )
  const spellcasting = scRaw ? parseSpellcasting(scRaw.desc, source) : undefined
  const actions = actionsOfType('ACTION').filter(
    (a) => !(spellcasting && scRaw && a.name === scRaw.name),
  )

  return {
    id: `${source}:${slugFromKey(raw.key, documentKey)}`,
    source,
    edition,
    name: raw.name,
    size: raw.size.name as Size,
    type: raw.type.name.toLowerCase(),
    ac: raw.armor_class,
    maxHp: raw.hit_points,
    hpFormula: raw.hit_dice ? raw.hit_dice.replace(/\s+/g, '') : undefined,
    initiative: raw.initiative_bonus ?? undefined,
    speed: mapSpeed(raw.speed),
    abilities: {
      str: a.strength,
      dex: a.dexterity,
      con: a.constitution,
      int: a.intelligence,
      wis: a.wisdom,
      cha: a.charisma,
    },
    saves: mapSaves(raw.saving_throws_all, a),
    skills: mapSkills(raw.skill_bonuses),
    senses: mapSenses(raw),
    languages: mapLanguages(raw.languages),
    resistances: nameList(raw.resistances_and_immunities?.damage_resistances),
    immunities: nameList(raw.resistances_and_immunities?.damage_immunities),
    vulnerabilities: nameList(raw.resistances_and_immunities?.damage_vulnerabilities),
    conditionImmunities: nameList(raw.resistances_and_immunities?.condition_immunities),
    cr: raw.challenge_rating,
    xp: raw.experience_points ?? undefined,
    traits: undefIfEmpty(traits),
    actions: undefIfEmpty(actions),
    bonusActions: undefIfEmpty(actionsOfType('BONUS_ACTION')),
    reactions: undefIfEmpty(actionsOfType('REACTION')),
    legendaryActions: legendary.length
      ? { perRound: DEFAULT_LEGENDARY_PER_ROUND, actions: legendary }
      : undefined,
    lairActions: undefIfEmpty(actionsOfType('LAIR_ACTION')),
    spellcasting,
    legendaryResistance,
  }
}
