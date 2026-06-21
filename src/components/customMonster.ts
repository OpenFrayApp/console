// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Action, ActionKind, DamageRoll, Recharge, SaveOutcome } from '../schema/action.ts'
import type {
  Creature,
  LegendaryActions,
  SpellGroup,
  SpellRef,
  Spellcasting,
  Trait,
} from '../schema/creature.ts'
import type {
  Ability,
  AbilityScores,
  DamageType,
  Edition,
  SaveBonuses,
  Senses,
  Size,
  Skill,
  SkillBonuses,
  Speeds,
} from '../schema/primitives.ts'

/**
 * The custom-monster editor's working state. Form inputs are strings; the schema
 * wants numbers and trimmed optionals, so the draft stays string-shaped and
 * `buildCreature` does the parsing in one place. Empty fields drop out rather than
 * becoming `0`/`""`, so a sparse stat block stays sparse.
 *
 * Several numbers the DM shouldn't have to compute are derived instead: attack
 * to-hit, save/skill bonuses, and the spell save DC / attack bonus all come from
 * an ability modifier plus the proficiency bonus (which itself comes from the CR).
 */

export type RechargeKind = 'none' | 'dice' | 'perDay' | 'perRound'

export interface DamageDraft {
  id: string
  formula: string
  type: DamageType
}

export interface ActionDraft {
  id: string
  name: string
  kind: ActionKind
  /** Which ability the attack uses; to-hit is derived (mod + proficiency). */
  attackAbility: Ability
  reach: string
  rangeNormal: string
  rangeLong: string
  damage: DamageDraft[]
  saveAbility: Ability | ''
  saveDc: string
  saveOutcome: SaveOutcome
  rechargeKind: RechargeKind
  /** Threshold for `dice` (e.g. 5 for "Recharge 5–6"); count for per-day/round. */
  rechargeValue: string
  legendaryCost: string
  text: string
}

export interface TraitDraft {
  id: string
  name: string
  text: string
}

export interface SkillDraft {
  id: string
  skill: Skill
  /** Being in the list means proficient; this doubles the proficiency bonus. */
  expertise: boolean
}

export interface SpellGroupDraft {
  id: string
  usage: 'atWill' | 'perDay'
  /** Uses per day for the `perDay` tier. */
  per: string
  /** Chosen spells, restricted to real compendium entries (name + resolving ref). */
  spells: SpellRef[]
}

export interface MonsterDraft {
  name: string
  size: Size
  /** Creature type (humanoid, dragon, …); empty = unspecified. */
  type: string
  alignment: string
  /** Free-text origin label (book, "Homebrew"); stored as `source`, still user content. */
  sourceName: string
  edition: Edition
  cr: string
  xp: string
  ac: string
  hpDieCount: string
  /** Hit-die size as a number string: '4' | '6' | '8' | '10' | '12' | '20'. */
  hpDie: string
  hpMod: string
  speed: { walk: string; fly: string; swim: string; climb: string; burrow: string; hover: boolean }
  abilities: Record<Ability, string>
  /** Whether the creature is proficient in each save; the bonus is derived. */
  saves: Record<Ability, boolean>
  skills: SkillDraft[]
  senses: {
    passivePerception: string
    darkvision: string
    blindsight: string
    tremorsense: string
    truesight: string
  }
  languages: string
  resistances: string
  immunities: string
  vulnerabilities: string
  conditionImmunities: string
  traits: TraitDraft[]
  actions: ActionDraft[]
  bonusActions: ActionDraft[]
  reactions: ActionDraft[]
  legendaryPerRound: string
  legendaryActions: ActionDraft[]
  lairActions: ActionDraft[]
  legendaryResistance: string
  legendaryResistanceLair: string
  /** Spellcasting ability; the save DC and attack bonus derive from it + CR. */
  spellAbility: Ability | ''
  spellGroups: SpellGroupDraft[]
}

export const SIZES: Size[] = [
  'Tiny', 'Small', 'Medium or Small', 'Medium', 'Large', 'Huge', 'Gargantuan',
]
/** Standard 5e creature types, plus the "any" catch-all. Stored lowercase. */
export const CREATURE_TYPES: string[] = [
  'aberration', 'beast', 'celestial', 'construct', 'dragon', 'elemental', 'fey',
  'fiend', 'giant', 'humanoid', 'monstrosity', 'ooze', 'plant', 'undead', 'any',
]
// The full D&D Beyond alignment vocabulary, lowercased to match SRD stat-block
// rendering. Display only — nothing branches on it.
export const ALIGNMENTS: string[] = [
  'lawful good', 'neutral good', 'chaotic good',
  'lawful neutral', 'neutral', 'chaotic neutral',
  'lawful evil', 'neutral evil', 'chaotic evil',
  'unaligned',
  'typically lawful good', 'typically neutral good', 'typically chaotic good',
  'typically lawful neutral', 'typically neutral', 'typically chaotic neutral',
  'typically lawful evil', 'typically neutral evil', 'typically chaotic evil',
  'any alignment',
  'any lawful alignment', 'any chaotic alignment',
  'any good alignment', 'any evil alignment', 'any neutral alignment',
  'any non-lawful alignment', 'any non-chaotic alignment', 'any non-good alignment',
]
export const ABILITIES: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
/** Hit-die sizes, as number strings. */
export const HP_DICE: string[] = ['4', '6', '8', '10', '12', '20']
export const ACTION_KINDS: ActionKind[] = ['melee', 'ranged', 'save', 'utility']
export const SAVE_OUTCOMES: SaveOutcome[] = ['half', 'none', 'negates']
export const DAMAGE_TYPES: DamageType[] = [
  'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning',
  'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder',
]
export const SKILLS: Skill[] = [
  'acrobatics', 'animalHandling', 'arcana', 'athletics', 'deception', 'history',
  'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception',
  'performance', 'persuasion', 'religion', 'sleightOfHand', 'stealth', 'survival',
]
/** Display labels for the camelCase skill keys. */
export const SKILL_LABELS: Record<Skill, string> = {
  acrobatics: 'Acrobatics', animalHandling: 'Animal Handling', arcana: 'Arcana',
  athletics: 'Athletics', deception: 'Deception', history: 'History', insight: 'Insight',
  intimidation: 'Intimidation', investigation: 'Investigation', medicine: 'Medicine',
  nature: 'Nature', perception: 'Perception', performance: 'Performance',
  persuasion: 'Persuasion', religion: 'Religion', sleightOfHand: 'Sleight of Hand',
  stealth: 'Stealth', survival: 'Survival',
}
/** The ability each skill is based on — used to derive a proficient skill bonus. */
export const SKILL_ABILITY: Record<Skill, Ability> = {
  acrobatics: 'dex', animalHandling: 'wis', arcana: 'int', athletics: 'str',
  deception: 'cha', history: 'int', insight: 'wis', intimidation: 'cha',
  investigation: 'int', medicine: 'wis', nature: 'int', perception: 'wis',
  performance: 'cha', persuasion: 'cha', religion: 'int', sleightOfHand: 'dex',
  stealth: 'dex', survival: 'wis',
}

const uid = (): string => crypto.randomUUID()

export function emptyDamageDraft(): DamageDraft {
  return { id: uid(), formula: '', type: 'bludgeoning' }
}

export function emptyActionDraft(kind: ActionKind = 'melee'): ActionDraft {
  return {
    id: uid(),
    name: '',
    kind,
    // Ranged attacks default to Dex, everything else to Str — the DM can change it.
    attackAbility: kind === 'ranged' ? 'dex' : 'str',
    reach: '',
    rangeNormal: '',
    rangeLong: '',
    damage: [emptyDamageDraft()],
    // A real default (matching the mass-save modal) so the save ability needs no
    // "choose…" placeholder; only the save kind uses it.
    saveAbility: 'dex',
    saveDc: '',
    saveOutcome: 'half',
    rechargeKind: 'none',
    rechargeValue: '',
    legendaryCost: '',
    text: '',
  }
}

export function emptyTraitDraft(): TraitDraft {
  return { id: uid(), name: '', text: '' }
}

export function emptySkillDraft(): SkillDraft {
  return { id: uid(), skill: 'perception', expertise: false }
}

export function emptySpellGroupDraft(): SpellGroupDraft {
  return { id: uid(), usage: 'atWill', per: '', spells: [] }
}

export function emptyDraft(): MonsterDraft {
  return {
    name: '',
    size: 'Medium',
    type: '',
    alignment: '',
    sourceName: '',
    edition: '5.5',
    cr: '',
    xp: '',
    ac: '',
    hpDieCount: '',
    hpDie: '8',
    hpMod: '',
    speed: { walk: '', fly: '', swim: '', climb: '', burrow: '', hover: false },
    abilities: { str: '', dex: '', con: '', int: '', wis: '', cha: '' },
    saves: { str: false, dex: false, con: false, int: false, wis: false, cha: false },
    skills: [],
    senses: { passivePerception: '', darkvision: '', blindsight: '', tremorsense: '', truesight: '' },
    languages: '',
    resistances: '',
    immunities: '',
    vulnerabilities: '',
    conditionImmunities: '',
    traits: [],
    actions: [],
    bonusActions: [],
    reactions: [],
    legendaryPerRound: '3',
    legendaryActions: [],
    lairActions: [],
    legendaryResistance: '',
    legendaryResistanceLair: '',
    spellAbility: '',
    spellGroups: [],
  }
}

// --- parsing helpers ----------------------------------------------------------

const num = (v: string): number => Math.max(0, Math.floor(Number(v) || 0))
const signed = (v: string): number => Math.floor(Number(v) || 0)
const has = (v: string): boolean => v.trim() !== ''
const numOpt = (v: string): number | undefined => (has(v) ? num(v) : undefined)

/** A 5e ability modifier, floored. A blank score is treated as 10 (mod 0). */
export const abilityMod = (score: number): number => Math.floor((score - 10) / 2)

/**
 * Proficiency bonus by challenge rating (2024 DMG table). Fractional CRs (1/8–1/2)
 * and CR 0 all sit at +2; it then steps +1 every four CR. Drives derived save,
 * skill, attack, and spell DC numbers so the DM marks intent, not arithmetic.
 */
export function proficiencyBonus(cr: number | undefined): number {
  if (cr == null || cr <= 4) return 2
  if (cr <= 8) return 3
  if (cr <= 12) return 4
  if (cr <= 16) return 5
  if (cr <= 20) return 6
  if (cr <= 24) return 7
  if (cr <= 28) return 8
  return 9
}

/** Average HP for a hit-dice pool: count × (die + 1) / 2 + modifier, floored. */
export function averageHp(count: number, die: number, mod: number): number {
  if (count <= 0 || die <= 0) return 0
  return Math.floor((count * (die + 1)) / 2 + mod)
}

/** Render a hit-dice pool as a formula string, e.g. `"14d12+56"` / `"2d6-1"`. */
export function buildHpFormula(count: number, die: number, mod: number): string {
  if (count <= 0 || die <= 0) return ''
  const sign = mod > 0 ? `+${mod}` : mod < 0 ? `${mod}` : ''
  return `${count}d${die}${sign}`
}

/** Parse a CR field, accepting decimals and fractions ("1/2", "0.5"). */
export function parseCr(v: string): number | undefined {
  const s = v.trim()
  if (!s) return undefined
  if (s.includes('/')) {
    const [a, b] = s.split('/').map((x) => Number(x))
    if (b) return Math.max(0, a / b)
  }
  const n = Number(s)
  return Number.isFinite(n) ? Math.max(0, n) : undefined
}

const list = (v: string): string[] =>
  v.split(',').map((s) => s.trim()).filter(Boolean)
const listOpt = (v: string): string[] | undefined => {
  const out = list(v)
  return out.length ? out : undefined
}

/** The derived combat context shared by attacks, saves, skills, and spellcasting. */
export interface DeriveContext {
  abilities: AbilityScores
  pb: number
}

/** A monster's attack bonus for an ability: its modifier + proficiency. */
export function attackBonus(ability: Ability, ctx: DeriveContext): number {
  return abilityMod(ctx.abilities[ability]) + ctx.pb
}

function buildRecharge(kind: RechargeKind, value: string): Recharge | undefined {
  if (kind === 'none') return undefined
  // Sensible defaults: a dice recharge with no threshold is "Recharge 6"; a
  // per-day/round count defaults to 1.
  const v = has(value) ? num(value) : kind === 'dice' ? 6 : 1
  return { type: kind, value: v }
}

function buildDamage(rows: DamageDraft[]): DamageRoll[] | undefined {
  const out = rows.filter((d) => has(d.formula)).map((d) => ({ formula: d.formula.trim(), type: d.type }))
  return out.length ? out : undefined
}

/** Assemble one Action from a draft. Caller filters out unnamed actions. */
export function buildAction(d: ActionDraft, ctx: DeriveContext): Action {
  const isAttack = d.kind === 'melee' || d.kind === 'ranged'
  const action: Action = {
    id: d.id,
    name: d.name.trim(),
    kind: d.kind,
    // Attacks derive to-hit from the chosen ability + proficiency; others don't roll.
    toHit: isAttack ? attackBonus(d.attackAbility, ctx) : null,
  }
  if (has(d.reach)) action.reach = num(d.reach)
  if (has(d.rangeNormal)) {
    action.range = { normal: num(d.rangeNormal) }
    if (has(d.rangeLong)) action.range.long = num(d.rangeLong)
  }
  const damage = buildDamage(d.damage)
  if (damage) action.damage = damage
  if (d.saveAbility && has(d.saveDc)) {
    action.save = { ability: d.saveAbility, dc: num(d.saveDc), onSave: d.saveOutcome }
  }
  const recharge = buildRecharge(d.rechargeKind, d.rechargeValue)
  if (recharge) action.recharge = recharge
  if (has(d.legendaryCost)) action.legendaryCost = num(d.legendaryCost)
  if (has(d.text)) action.text = d.text.trim()
  return action
}

const namedActions = (rows: ActionDraft[], ctx: DeriveContext): Action[] =>
  rows.filter((a) => has(a.name)).map((a) => buildAction(a, ctx))

function buildSpellcasting(draft: MonsterDraft, ctx: DeriveContext): Spellcasting | undefined {
  const groups: SpellGroup[] = draft.spellGroups
    .map((g) => ({
      usage:
        g.usage === 'atWill'
          ? ({ type: 'atWill' } as const)
          : ({ type: 'perDay' as const, per: has(g.per) ? num(g.per) : 1 }),
      spells: g.spells.map((s) => ({ ...s })),
    }))
    .filter((g) => g.spells.length > 0)
  if (groups.length === 0 && !draft.spellAbility) return undefined
  const sc: Spellcasting = { groups }
  if (draft.spellAbility) {
    // Save DC = 8 + ability mod + proficiency; spell attack = ability mod + proficiency.
    sc.ability = draft.spellAbility
    sc.saveDc = 8 + attackBonus(draft.spellAbility, ctx)
    sc.toHit = attackBonus(draft.spellAbility, ctx)
  }
  return sc
}

/**
 * Build a schema-valid, custom-sourced Creature from the editor draft. The id is
 * freshly generated so every custom creature is an independent entity (the plan's
 * "user content is never matched/deduped" rule) — three "Goblin"s are three rows.
 */
export function buildCreature(draft: MonsterDraft): Creature {
  const abilities = ABILITIES.reduce((acc, a) => {
    acc[a] = has(draft.abilities[a]) ? signed(draft.abilities[a]) : 10
    return acc
  }, {} as AbilityScores)

  const cr = parseCr(draft.cr)
  const pb = proficiencyBonus(cr)
  const ctx: DeriveContext = { abilities, pb }

  const speed: Speeds = {}
  if (has(draft.speed.walk)) speed.walk = num(draft.speed.walk)
  if (has(draft.speed.fly)) speed.fly = num(draft.speed.fly)
  if (has(draft.speed.swim)) speed.swim = num(draft.speed.swim)
  if (has(draft.speed.climb)) speed.climb = num(draft.speed.climb)
  if (has(draft.speed.burrow)) speed.burrow = num(draft.speed.burrow)
  if (draft.speed.hover) speed.hover = true

  // A proficient save = ability modifier + proficiency bonus (from CR). The DM
  // only marks proficiency; non-proficient saves are absent and the stat block
  // falls back to the bare ability modifier.
  const saves: SaveBonuses = {}
  for (const a of ABILITIES) if (draft.saves[a]) saves[a] = abilityMod(abilities[a]) + pb

  // A skill in the list is proficient; expertise doubles the proficiency bonus.
  const skills: SkillBonuses = {}
  for (const s of draft.skills) {
    skills[s.skill] = abilityMod(abilities[SKILL_ABILITY[s.skill]]) + pb + (s.expertise ? pb : 0)
  }

  const senses: Senses = { passivePerception: has(draft.senses.passivePerception) ? num(draft.senses.passivePerception) : 10 }
  if (has(draft.senses.darkvision)) senses.darkvision = num(draft.senses.darkvision)
  if (has(draft.senses.blindsight)) senses.blindsight = num(draft.senses.blindsight)
  if (has(draft.senses.tremorsense)) senses.tremorsense = num(draft.senses.tremorsense)
  if (has(draft.senses.truesight)) senses.truesight = num(draft.senses.truesight)

  const traits: Trait[] = draft.traits
    .filter((t) => has(t.name))
    .map((t) => ({ name: t.name.trim(), text: t.text.trim() }))

  const legendaryRows = namedActions(draft.legendaryActions, ctx)

  const hpCount = num(draft.hpDieCount)
  const hpDie = num(draft.hpDie)
  const hpMod = signed(draft.hpMod)
  const hpFormula = buildHpFormula(hpCount, hpDie, hpMod)
  const maxHp = Math.max(1, averageHp(hpCount, hpDie, hpMod))

  const creature: Creature = {
    id: `custom:${uid()}`,
    // The DM's free-text origin (a book, "Homebrew") is the display source; it's
    // still user content (the custom: id prefix marks that) and carries no license.
    source: draft.sourceName.trim() || 'custom',
    edition: draft.edition,
    name: draft.name.trim(),
    size: draft.size,
    type: draft.type.trim(),
    ac: num(draft.ac),
    maxHp,
    speed,
    abilities,
    senses,
  }

  if (has(draft.alignment)) creature.alignment = draft.alignment
  if (hpFormula) creature.hpFormula = hpFormula
  if (Object.keys(saves).length) creature.saves = saves
  if (Object.keys(skills).length) creature.skills = skills
  creature.languages = listOpt(draft.languages)
  creature.resistances = listOpt(draft.resistances)
  creature.immunities = listOpt(draft.immunities)
  creature.vulnerabilities = listOpt(draft.vulnerabilities)
  creature.conditionImmunities = listOpt(draft.conditionImmunities)
  creature.cr = cr
  creature.xp = numOpt(draft.xp)
  if (traits.length) creature.traits = traits

  const actions = namedActions(draft.actions, ctx)
  if (actions.length) creature.actions = actions
  const bonus = namedActions(draft.bonusActions, ctx)
  if (bonus.length) creature.bonusActions = bonus
  const reactions = namedActions(draft.reactions, ctx)
  if (reactions.length) creature.reactions = reactions
  if (legendaryRows.length) {
    const legendary: LegendaryActions = {
      perRound: has(draft.legendaryPerRound) ? num(draft.legendaryPerRound) : 3,
      actions: legendaryRows,
    }
    creature.legendaryActions = legendary
  }
  const lair = namedActions(draft.lairActions, ctx)
  if (lair.length) creature.lairActions = lair
  if (has(draft.legendaryResistance)) creature.legendaryResistance = num(draft.legendaryResistance)
  if (has(draft.legendaryResistanceLair)) {
    creature.legendaryResistanceLair = num(draft.legendaryResistanceLair)
  }
  const spellcasting = buildSpellcasting(draft, ctx)
  if (spellcasting) creature.spellcasting = spellcasting

  return creature
}
