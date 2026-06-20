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
  Speeds,
} from '../schema/primitives.ts'
import type { Action, DamageRoll, SaveOutcome } from '../schema/action.ts'
import type { Creature } from '../schema/creature.ts'
import type { Spell } from '../schema/spell.ts'

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
}

export function mapOpen5eSpell(raw: Open5eSpell): Spell {
  const documentKey = raw.document.key
  const { source, edition } = mapSource(documentKey)
  const slug = slugFromKey(raw.key, documentKey)
  const text = raw.higher_level
    ? `${raw.desc}\n\nAt Higher Levels: ${raw.higher_level}`
    : raw.desc

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
  attacks?: Open5eAttack[]
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
  ability_scores: Record<string, number>
  speed: Record<string, number | string>
  saving_throws_all?: Record<string, number> | null
  passive_perception?: number | null
  darkvision_range?: number | null
  blindsight_range?: number | null
  tremorsense_range?: number | null
  truesight_range?: number | null
  actions?: Open5eAction[]
}

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

/** Damage from a structured attack. Open5e sometimes files the only type under
 *  extra_damage_type with no extra dice — treat that as the primary type. */
function attackDamage(a: Open5eAttack): DamageRoll[] {
  const out: DamageRoll[] = []
  if (a.damage_die_count && a.damage_die_type) {
    const type = (a.damage_type?.name ?? a.extra_damage_type?.name)?.toLowerCase()
    out.push({
      formula: diceFormula(a.damage_die_count, a.damage_die_type, a.damage_bonus),
      type: type as DamageType,
    })
  }
  if (a.extra_damage_die_count && a.extra_damage_die_type) {
    out.push({
      formula: diceFormula(
        a.extra_damage_die_count,
        a.extra_damage_die_type,
        a.extra_damage_bonus,
      ),
      type: a.extra_damage_type?.name?.toLowerCase() as DamageType,
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

export function mapOpen5eAction(raw: Open5eAction): Action {
  const id = slugify(raw.name)
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
      damage: attackDamage(attack),
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
      text: raw.desc,
    }
  }

  return { id, name: raw.name, kind: 'utility', toHit: null, text: raw.desc }
}

function mapSpeed(speed: Record<string, number | string>): Speeds {
  const out: Speeds = {}
  for (const key of ['walk', 'fly', 'swim', 'climb', 'burrow'] as const) {
    if (typeof speed[key] === 'number') out[key] = speed[key]
  }
  return out
}

function mapSaves(all: Record<string, number> | null | undefined): SaveBonuses | undefined {
  if (!all) return undefined
  const out: SaveBonuses = {}
  for (const [name, ability] of Object.entries(ABILITY_BY_NAME)) {
    if (typeof all[name] === 'number') out[ability] = all[name]
  }
  return out
}

function mapSenses(raw: Open5eCreature): Senses {
  const senses: Senses = { passivePerception: raw.passive_perception ?? 10 }
  if (raw.darkvision_range) senses.darkvision = raw.darkvision_range
  if (raw.blindsight_range) senses.blindsight = raw.blindsight_range
  if (raw.tremorsense_range) senses.tremorsense = raw.tremorsense_range
  if (raw.truesight_range) senses.truesight = raw.truesight_range
  return senses
}

export function mapOpen5eCreature(raw: Open5eCreature): Creature {
  const documentKey = raw.document.key
  const { source, edition } = mapSource(documentKey)
  const a = raw.ability_scores
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
    speed: mapSpeed(raw.speed),
    abilities: {
      str: a.strength,
      dex: a.dexterity,
      con: a.constitution,
      int: a.intelligence,
      wis: a.wisdom,
      cha: a.charisma,
    },
    saves: mapSaves(raw.saving_throws_all),
    senses: mapSenses(raw),
    cr: raw.challenge_rating,
    actions: (raw.actions ?? [])
      .filter((act) => act.action_type === 'ACTION')
      .map(mapOpen5eAction),
  }
}
