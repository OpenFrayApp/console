// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type {
  Ability,
  DamageType,
  Senses,
  Size,
  Skill,
  SkillBonuses,
  SaveBonuses,
  Speeds,
} from '../schema/primitives.ts'
import type { Action, DamageRoll, Recharge, SaveOutcome } from '../schema/action.ts'
import type {
  Creature,
  SpellGroup,
  SpellLevel,
  SpellRef,
  Spellcasting,
  Trait,
} from '../schema/creature.ts'
import type { Spell, SpellMechanics, SpellSave, SpellScaling } from '../schema/spell.ts'

/**
 * Transforms for ingesting SRD 5.1 (D&D 2014) content from the 5e-bits API
 * (dnd5eapi.co) into OpenFray's schema. Used by a separate, occasional ingest
 * pipeline (`scripts/ingest-srd-2014.ts`) — never called at runtime. Chosen over
 * Open5e for 5.1 because it exposes *structured* monster spellcasting (slots +
 * spells-by-level) rather than prose. The SRD 5.1 content is used under CC-BY-4.0
 * (it is dual-licensed; we elect CC-BY and never the OGL — see docs/content-licensing.md).
 */

const SOURCE = 'srd-5.1'
const EDITION = '5.0'

const ABILITY_BY_INDEX: Record<string, Ability> = {
  str: 'str', strength: 'str',
  dex: 'dex', dexterity: 'dex',
  con: 'con', constitution: 'con',
  int: 'int', intelligence: 'int',
  wis: 'wis', wisdom: 'wis',
  cha: 'cha', charisma: 'cha',
}

const DAMAGE_TYPES = new Set<DamageType>([
  'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning',
  'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder',
])

const refFromUrl = (url: string): string => url.replace(/\/$/, '').split('/').pop() ?? ''
const feet = (s: string | undefined): number => Number(/(\d+)/.exec(s ?? '')?.[1]) || 0
const normFormula = (s: string): string => s.replace(/\s+/g, '')

interface IndexName {
  index: string
  name: string
}
interface ApiDamage {
  damage_type?: IndexName
  damage_dice?: string
}
interface ApiUsage {
  type: string
  dice?: string
  min_value?: number
  times?: number
}
interface ApiDc {
  dc_type: IndexName
  dc_value: number
  success_type: string
}
interface ApiAction {
  name: string
  desc?: string
  attack_bonus?: number | null
  dc?: ApiDc | null
  damage?: ApiDamage[]
  usage?: ApiUsage | null
}
interface ApiSpellcasting {
  level?: number
  ability?: IndexName
  dc?: number
  modifier?: number
  slots?: Record<string, number>
  spells?: { name: string; level: number; url: string; usage?: ApiUsage }[]
}
interface ApiSpecialAbility {
  name: string
  desc?: string
  usage?: ApiUsage
  spellcasting?: ApiSpellcasting
}
export interface DndApiMonster {
  index: string
  name: string
  size: string
  type: string
  alignment?: string
  armor_class?: { value: number; type?: string }[]
  hit_points: number
  hit_points_roll?: string
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
  proficiencies?: { value: number; proficiency: IndexName }[]
  speed?: Record<string, string | boolean>
  senses?: Record<string, string | number>
  languages?: string
  damage_resistances?: string[]
  damage_immunities?: string[]
  damage_vulnerabilities?: string[]
  condition_immunities?: IndexName[]
  challenge_rating?: number
  xp?: number
  special_abilities?: ApiSpecialAbility[]
  actions?: ApiAction[]
  legendary_actions?: ApiAction[]
  reactions?: ApiAction[]
}

function mapDamage(damage: ApiDamage[] | undefined): DamageRoll[] | undefined {
  const out: DamageRoll[] = []
  for (const d of damage ?? []) {
    if (!d.damage_dice || !d.damage_type) continue
    const type = d.damage_type.index.toLowerCase()
    out.push({ formula: normFormula(d.damage_dice), type: type as DamageType })
  }
  return out.length ? out : undefined
}

function mapRecharge(usage: ApiUsage | null | undefined): Recharge | undefined {
  if (!usage) return undefined
  if (/recharge on roll/i.test(usage.type) && usage.min_value != null) {
    return { type: 'dice', value: usage.min_value }
  }
  if (/per day/i.test(usage.type) && usage.times != null) {
    return { type: 'perDay', value: usage.times }
  }
  return undefined
}

/** On-save rule from dnd5eapi's success_type, given whether the action deals damage. */
function mapOnSave(successType: string, hasDamage: boolean): SaveOutcome {
  if (/half/i.test(successType)) return 'half'
  return hasDamage ? 'none' : 'negates'
}

/** dnd5eapi gives no structured reach/range; read them from the action prose. */
function reachRange(desc: string): Pick<Action, 'reach' | 'range'> {
  const out: Pick<Action, 'reach' | 'range'> = {}
  const reach = /reach\s+(\d+)\s*ft/i.exec(desc)
  if (reach) out.reach = Number(reach[1])
  const range = /range\s+(\d+)\/(\d+)\s*ft/i.exec(desc) ?? /range\s+(\d+)\s*ft/i.exec(desc)
  if (range) out.range = { normal: Number(range[1]), ...(range[2] && { long: Number(range[2]) }) }
  return out
}

function mapAction(a: ApiAction): Action {
  const desc = a.desc ?? ''
  // "Wing Attack (Costs 2 Actions)" → strip the cost into legendaryCost.
  const costM = /\(Costs (\d+) Actions?\)/i.exec(a.name)
  const name = a.name.replace(/\s*\(Costs \d+ Actions?\)/i, '').trim()
  const recharge = mapRecharge(a.usage)
  const damage = mapDamage(a.damage)
  const base: Action = { id: refFromUrl(`/${name}`) || name, name, kind: 'utility', toHit: null }
  // slugify-ish id without pulling in another helper
  base.id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  if (recharge) base.recharge = recharge
  if (costM) base.legendaryCost = Number(costM[1])
  if (desc) base.text = desc

  if (a.attack_bonus != null) {
    const { reach, range } = reachRange(desc)
    return {
      ...base,
      kind: range && !reach ? 'ranged' : 'melee',
      toHit: a.attack_bonus,
      ...(reach != null && { reach }),
      ...(range && { range }),
      ...(damage && { damage }),
    }
  }
  if (a.dc) {
    return {
      ...base,
      kind: 'save',
      save: {
        ability: ABILITY_BY_INDEX[a.dc.dc_type.index],
        dc: a.dc.dc_value,
        onSave: mapOnSave(a.dc.success_type, !!damage),
      },
      ...(damage && { damage }),
    }
  }
  return { ...base, ...(damage && { damage }) }
}

function mapSpellcasting(sc: ApiSpellcasting): Spellcasting {
  const atWill: SpellRef[] = []
  const perDay = new Map<number, SpellRef[]>()
  const byLevel = new Map<number, SpellRef[]>()
  for (const s of sc.spells ?? []) {
    const ref: SpellRef = { name: s.name, ref: `${SOURCE}:${refFromUrl(s.url)}` }
    const usage = s.usage?.type ?? ''
    if (/per day/i.test(usage) && s.usage?.times != null) {
      const list = perDay.get(s.usage.times) ?? []
      list.push(ref)
      perDay.set(s.usage.times, list)
    } else if (s.level === 0 || /at will/i.test(usage)) {
      atWill.push(ref)
    } else {
      const list = byLevel.get(s.level) ?? []
      list.push(ref)
      byLevel.set(s.level, list)
    }
  }

  const groups: SpellGroup[] = []
  if (atWill.length) groups.push({ usage: { type: 'atWill' }, spells: atWill })
  for (const level of [...byLevel.keys()].sort((a, b) => a - b)) {
    groups.push({ usage: { type: 'slots', level }, spells: byLevel.get(level)! })
  }
  for (const per of [...perDay.keys()].sort((a, b) => b - a)) {
    groups.push({ usage: { type: 'perDay', per }, spells: perDay.get(per)! })
  }

  const slots: Partial<Record<SpellLevel, number>> = {}
  for (const [lvl, n] of Object.entries(sc.slots ?? {})) {
    if (n > 0) slots[lvl as SpellLevel] = n
  }

  const out: Spellcasting = { groups }
  if (sc.ability) out.ability = ABILITY_BY_INDEX[sc.ability.index]
  if (sc.dc != null) out.saveDc = sc.dc
  if (sc.modifier != null) out.toHit = sc.modifier
  if (Object.keys(slots).length) out.slots = slots
  return out
}

const SKILL_INDEX: Record<string, Skill> = {
  acrobatics: 'acrobatics', 'animal-handling': 'animalHandling', arcana: 'arcana',
  athletics: 'athletics', deception: 'deception', history: 'history', insight: 'insight',
  intimidation: 'intimidation', investigation: 'investigation', medicine: 'medicine',
  nature: 'nature', perception: 'perception', performance: 'performance',
  persuasion: 'persuasion', religion: 'religion', 'sleight-of-hand': 'sleightOfHand',
  stealth: 'stealth', survival: 'survival',
}

function mapSpeeds(speed: Record<string, string | boolean> | undefined): Speeds {
  const out: Speeds = {}
  for (const key of ['walk', 'fly', 'swim', 'climb', 'burrow'] as const) {
    if (typeof speed?.[key] === 'string') out[key] = feet(speed[key] as string)
  }
  if (speed?.hover) out.hover = true
  return out
}

function mapSenses(senses: Record<string, string | number> | undefined): Senses {
  const out: Senses = { passivePerception: Number(senses?.passive_perception) || 10 }
  for (const key of ['darkvision', 'blindsight', 'tremorsense', 'truesight'] as const) {
    if (senses?.[key]) out[key] = feet(String(senses[key]))
  }
  return out
}

const undefIfEmpty = <T>(arr: T[]): T[] | undefined => (arr.length ? arr : undefined)

export function mapDndApiMonster(raw: DndApiMonster): Creature {
  const abilities = {
    str: raw.strength, dex: raw.dexterity, con: raw.constitution,
    int: raw.intelligence, wis: raw.wisdom, cha: raw.charisma,
  }

  const saves: SaveBonuses = {}
  const skills: SkillBonuses = {}
  for (const p of raw.proficiencies ?? []) {
    const idx = p.proficiency.index
    if (idx.startsWith('saving-throw-')) {
      const ab = ABILITY_BY_INDEX[idx.slice('saving-throw-'.length)]
      if (ab) saves[ab] = p.value
    } else if (idx.startsWith('skill-')) {
      const sk = SKILL_INDEX[idx.slice('skill-'.length)]
      if (sk) skills[sk] = p.value
    }
  }

  // Spellcasting is a special ability carrying a structured `spellcasting` object;
  // lift it out and keep the rest as traits.
  const scAbility = raw.special_abilities?.find((s) => s.spellcasting)
  const spellcasting = scAbility?.spellcasting ? mapSpellcasting(scAbility.spellcasting) : undefined
  const traits: Trait[] = (raw.special_abilities ?? [])
    .filter((s) => !s.spellcasting)
    .map((s) => ({ name: s.name, text: s.desc ?? '' }))

  // Legendary Resistance's per-day count is in the special ability's structured usage.
  const lr = (raw.special_abilities ?? []).find((s) => /^Legendary Resistance/i.test(s.name))
  const legendaryResistance = lr?.usage?.times

  const legendary = (raw.legendary_actions ?? []).map(mapAction)

  const creature: Creature = {
    id: `${SOURCE}:${raw.index}`,
    source: SOURCE,
    edition: EDITION,
    name: raw.name,
    size: raw.size as Size,
    type: raw.type.toLowerCase(),
    alignment: raw.alignment,
    ac: raw.armor_class?.[0]?.value ?? 10,
    maxHp: raw.hit_points,
    hpFormula: raw.hit_points_roll ? normFormula(raw.hit_points_roll) : undefined,
    speed: mapSpeeds(raw.speed),
    abilities,
    saves: Object.keys(saves).length ? saves : undefined,
    skills: Object.keys(skills).length ? skills : undefined,
    senses: mapSenses(raw.senses),
    languages: raw.languages
      ? raw.languages.split(',').map((l) => l.trim()).filter(Boolean)
      : undefined,
    resistances: undefIfEmpty(raw.damage_resistances ?? []),
    immunities: undefIfEmpty(raw.damage_immunities ?? []),
    vulnerabilities: undefIfEmpty(raw.damage_vulnerabilities ?? []),
    conditionImmunities: undefIfEmpty((raw.condition_immunities ?? []).map((c) => c.name)),
    cr: raw.challenge_rating,
    xp: raw.xp,
    traits: undefIfEmpty(traits),
    actions: undefIfEmpty((raw.actions ?? []).map(mapAction)),
    reactions: undefIfEmpty((raw.reactions ?? []).map(mapAction)),
    legendaryActions: legendary.length ? { perRound: 3, actions: legendary } : undefined,
    spellcasting,
    legendaryResistance,
  }
  return creature
}

export interface DndApiSpell {
  index: string
  name: string
  level: number
  school: IndexName
  casting_time: string
  range: string
  duration: string
  concentration: boolean
  ritual: boolean
  components?: string[]
  material?: string
  desc?: string[]
  higher_level?: string[]
  classes?: IndexName[]
  attack_type?: string | null
  damage?: {
    damage_type?: IndexName
    damage_at_slot_level?: Record<string, string>
    damage_at_character_level?: Record<string, string>
  }
  dc?: { dc_type: IndexName; dc_success: string }
}

function spellMechanics(raw: DndApiSpell): SpellMechanics | undefined {
  const dmg = raw.damage
  const byLevel = dmg?.damage_at_slot_level ?? dmg?.damage_at_character_level
  const type = dmg?.damage_type?.index?.toLowerCase()
  let damage: DamageRoll[] | undefined
  let scaling: SpellScaling[] | undefined
  if (byLevel && type && DAMAGE_TYPES.has(type as DamageType)) {
    const levels = Object.keys(byLevel)
      .map(Number)
      .sort((a, b) => a - b)
    if (levels.length) {
      damage = [{ formula: normFormula(byLevel[String(levels[0])]), type: type as DamageType }]
      const by = dmg?.damage_at_slot_level ? 'slot' : 'character'
      const higher = levels.slice(1).map((lvl) => ({
        level: lvl,
        by: by as 'slot' | 'character',
        damage: [{ formula: normFormula(byLevel[String(lvl)]), type: type as DamageType }],
      }))
      if (higher.length) scaling = higher
    }
  }

  const ability = raw.dc ? ABILITY_BY_INDEX[raw.dc.dc_type.index] : undefined
  const save: SpellSave | undefined = ability
    ? { ability, ...(raw.dc!.dc_success && raw.dc!.dc_success !== 'other' && { onSave: raw.dc!.dc_success === 'half' ? 'half' : 'none' }) }
    : undefined
  const attackRoll = raw.attack_type && damage ? true : undefined

  if (!damage && !save && !attackRoll) return undefined
  return {
    ...(damage && { damage }),
    ...(attackRoll && { attackRoll }),
    ...(save && { save }),
    ...(scaling && { scaling }),
  }
}

export function mapDndApiSpell(raw: DndApiSpell): Spell {
  const components = raw.components ?? []
  const text = [
    ...(raw.desc ?? []),
    ...(raw.higher_level?.length ? ['At Higher Levels: ' + raw.higher_level.join(' ')] : []),
  ].join('\n\n')
  const mechanics = spellMechanics(raw)

  return {
    id: `${SOURCE}:${raw.index}`,
    source: SOURCE,
    edition: EDITION,
    name: raw.name,
    level: raw.level,
    school: raw.school.name,
    castingTime: raw.casting_time,
    range: raw.range,
    components: {
      verbal: components.includes('V'),
      somatic: components.includes('S'),
      material: components.includes('M'),
      materials: raw.material ?? undefined,
    },
    duration: raw.duration,
    concentration: raw.concentration,
    ritual: raw.ritual,
    classes: raw.classes?.map((c) => c.name),
    text,
    ...(mechanics && { mechanics }),
  }
}
