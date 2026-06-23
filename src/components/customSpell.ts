// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { DamageRoll, SaveOutcome } from '../schema/action.ts'
import type {
  Spell,
  SpellComponents,
  SpellMechanics,
  SpellScaling,
} from '../schema/spell.ts'
import type { Ability, DamageType, Edition } from '../schema/primitives.ts'

/**
 * The custom-spell editor's working state. Like the monster draft, inputs are
 * strings and `buildSpell` parses in one place, so empty fields drop out instead of
 * becoming `0`/`""`. The save DC is deliberately never collected — it belongs to the
 * caster, not the spell (see the schema). Higher-level scaling can be entered as a
 * simple per-level increment (the common 5e shape) which expands to absolute damage
 * variants, or, for irregular spells, level-by-level.
 */

/** How a spell resolves; maps to `attackRoll` / `save` in the mechanics. */
export type SpellResolution = 'none' | 'attack' | 'save'

/** Increment = "+Xd? per level" (expanded for the GM); manual = explicit per level. */
export type ScalingMode = 'increment' | 'manual'

export interface SpellDamageDraft {
  id: string
  formula: string
  type: DamageType
}

/** One explicit higher-level variant (manual mode): a level and its full damage. */
export interface ScalingRowDraft {
  id: string
  level: string
  damage: SpellDamageDraft[]
}

export interface SpellDraft {
  name: string
  /** '0'..'9'; 0 = cantrip. */
  level: string
  school: string
  edition: Edition
  /** Free-text origin label (book, "Homebrew"); stored as `source`, still user content. */
  sourceName: string
  /** Comma-separated class list, display only. */
  classes: string
  castingTime: string
  range: string
  duration: string
  concentration: boolean
  ritual: boolean
  verbal: boolean
  somatic: boolean
  material: boolean
  materials: string
  text: string
  resolution: SpellResolution
  saveAbility: Ability
  saveOutcome: SaveOutcome
  damage: SpellDamageDraft[]
  // --- higher levels ---
  scalingMode: ScalingMode
  /** Increment mode: extra damage added per slot above base (or per cantrip tier). */
  scalingIncrement: SpellDamageDraft[]
  /** Manual mode: an explicit damage set per chosen level. */
  scalingRows: ScalingRowDraft[]
}

export const SPELL_SCHOOLS: string[] = [
  'Abjuration', 'Conjuration', 'Divination', 'Enchantment',
  'Evocation', 'Illusion', 'Necromancy', 'Transmutation',
]
export const SPELL_LEVELS: string[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
/** Character levels at which a cantrip's damage steps up (2014/2024 alike). */
export const CANTRIP_TIERS = [5, 11, 17] as const
/** Common casting times (the form offers an "Other…" free-text fallback too). */
export const CASTING_TIMES: string[] = [
  '1 action', '1 bonus action', '1 reaction', '1 minute', '10 minutes', '1 hour', '8 hours', '24 hours',
]
/** Common durations — concentration is a separate flag, so these are bare times. */
export const DURATIONS: string[] = [
  'Instantaneous', '1 round', '1 minute', '10 minutes', '1 hour', '8 hours', '24 hours', 'Until dispelled',
]

const uid = (): string => crypto.randomUUID()

export function emptySpellDamageDraft(): SpellDamageDraft {
  return { id: uid(), formula: '', type: 'fire' }
}

export function emptyScalingRowDraft(): ScalingRowDraft {
  return { id: uid(), level: '', damage: [emptySpellDamageDraft()] }
}

export function emptySpellDraft(): SpellDraft {
  return {
    name: '',
    level: '1',
    school: 'Evocation',
    edition: '5.5',
    sourceName: '',
    classes: '',
    castingTime: '',
    range: '',
    duration: '',
    concentration: false,
    ritual: false,
    verbal: false,
    somatic: false,
    material: false,
    materials: '',
    text: '',
    resolution: 'none',
    saveAbility: 'dex',
    saveOutcome: 'half',
    damage: [],
    scalingMode: 'increment',
    scalingIncrement: [emptySpellDamageDraft()],
    scalingRows: [],
  }
}

const has = (v: string): boolean => v.trim() !== ''
const list = (v: string): string[] => v.split(',').map((s) => s.trim()).filter(Boolean)
const clampLevel = (v: string): number => Math.max(0, Math.min(9, Math.floor(Number(v) || 0)))

interface Dice {
  count: number
  die: number
  mod: number
}

/** Parse a simple dice formula `NdM`/`NdM+K`/`NdM-K`. Returns null for anything else. */
function parseDice(formula: string): Dice | null {
  const m = formula.trim().match(/^(\d+)d(\d+)([+-]\d+)?$/i)
  if (!m) return null
  return { count: Number(m[1]), die: Number(m[2]), mod: m[3] ? Number(m[3]) : 0 }
}

function renderDice(d: Dice): string {
  const mod = d.mod > 0 ? `+${d.mod}` : d.mod < 0 ? `${d.mod}` : ''
  return `${d.count}d${d.die}${mod}`
}

function buildDamageRows(rows: SpellDamageDraft[]): DamageRoll[] | undefined {
  const out = rows
    .filter((d) => has(d.formula))
    .map((d) => ({ formula: d.formula.trim(), type: d.type }))
  return out.length ? out : undefined
}

/**
 * Expand a per-level increment into an absolute damage set: take the base, then add
 * `steps` copies of each increment row, merging into a base row of the same die and
 * type where possible (so `8d6` + 2×`1d6` → `10d6`), else appending as its own
 * component. Non-dice increments are appended as-is.
 */
export function scaleAndMerge(
  base: DamageRoll[],
  increment: DamageRoll[],
  steps: number,
): DamageRoll[] {
  const out: DamageRoll[] = base.map((r) => ({ ...r }))
  for (const inc of increment) {
    const incDice = parseDice(inc.formula)
    if (!incDice) {
      out.push({ ...inc })
      continue
    }
    const scaled: Dice = {
      count: incDice.count * steps,
      die: incDice.die,
      mod: incDice.mod * steps,
    }
    const match = out.find((r) => {
      const rd = parseDice(r.formula)
      return rd && rd.die === scaled.die && r.type === inc.type
    })
    if (match) {
      const rd = parseDice(match.formula)!
      match.formula = renderDice({
        count: rd.count + scaled.count,
        die: rd.die,
        mod: rd.mod + scaled.mod,
      })
    } else {
      out.push({ formula: renderDice(scaled), type: inc.type })
    }
  }
  return out
}

/** The higher-level slots/tiers a spell of this level scales across. */
function scalingLevels(level: number): number[] {
  if (level === 0) return [...CANTRIP_TIERS]
  const out: number[] = []
  for (let l = level + 1; l <= 9; l++) out.push(l)
  return out
}

function buildScaling(
  draft: SpellDraft,
  level: number,
  baseDamage: DamageRoll[] | undefined,
): SpellScaling[] {
  // Scaling only makes sense as alternate damage; a non-damaging spell has none.
  if (!baseDamage) return []
  const by = level === 0 ? ('character' as const) : ('slot' as const)

  if (draft.scalingMode === 'manual') {
    return draft.scalingRows
      .map((r) => ({ level: clampLevel(r.level), damage: buildDamageRows(r.damage) }))
      .filter((r) => r.level > 0 && r.damage)
      .map((r) => ({ level: r.level, by, damage: r.damage! }))
  }

  const inc = buildDamageRows(draft.scalingIncrement)
  if (!inc) return []
  const levels = scalingLevels(level)
  return levels.map((lvl, i) => ({
    level: lvl,
    by,
    damage: scaleAndMerge(baseDamage, inc, level === 0 ? i + 1 : lvl - level),
  }))
}

function buildComponents(draft: SpellDraft): SpellComponents {
  const components: SpellComponents = {
    verbal: draft.verbal,
    somatic: draft.somatic,
    material: draft.material,
  }
  if (draft.material && has(draft.materials)) components.materials = draft.materials.trim()
  return components
}

/**
 * Build a schema-valid, custom-sourced Spell from the editor draft. A fresh
 * `custom:` id makes every custom spell an independent entity (user content is never
 * matched/deduped). Mechanics are omitted entirely for a pure utility spell.
 */
export function buildSpell(draft: SpellDraft): Spell {
  const level = clampLevel(draft.level)
  const damage = buildDamageRows(draft.damage)

  const mechanics: SpellMechanics = {}
  if (damage) mechanics.damage = damage
  if (draft.resolution === 'attack') mechanics.attackRoll = true
  if (draft.resolution === 'save') {
    mechanics.save = { ability: draft.saveAbility, onSave: draft.saveOutcome }
  }
  const scaling = buildScaling(draft, level, damage)
  if (scaling.length) mechanics.scaling = scaling
  const hasMechanics = Boolean(mechanics.damage || mechanics.attackRoll || mechanics.save)

  const spell: Spell = {
    id: `custom:${uid()}`,
    source: draft.sourceName.trim() || 'custom',
    edition: draft.edition,
    name: draft.name.trim(),
    level,
    school: draft.school,
    castingTime: draft.castingTime.trim(),
    range: draft.range.trim() || '—',
    components: buildComponents(draft),
    duration: draft.duration.trim(),
    concentration: draft.concentration,
    ritual: draft.ritual,
    text: draft.text.trim(),
  }
  const classes = list(draft.classes)
  if (classes.length) spell.classes = classes
  if (hasMechanics) spell.mechanics = mechanics
  return spell
}

/** The damage variants a draft would produce, for the form's live preview. */
export function spellVariantPreview(draft: SpellDraft): { label: string; formula: string }[] {
  const level = clampLevel(draft.level)
  const base = buildDamageRows(draft.damage)
  if (!base) return []
  const formula = (rows: DamageRoll[]): string => rows.map((r) => r.formula).join(' + ')
  const out = [{ label: level === 0 ? 'Cantrip' : `Level ${level}`, formula: formula(base) }]
  for (const s of buildScaling(draft, level, base)) {
    const label = s.by === 'slot' ? `Slot ${s.level}` : `Level ${s.level}`
    out.push({ label, formula: formula(s.damage) })
  }
  return out
}

const damageToDrafts = (rows: DamageRoll[] | undefined): SpellDamageDraft[] =>
  (rows ?? []).map((r) => ({ id: uid(), formula: r.formula, type: r.type }))

const sameDamage = (a: DamageRoll[], b: DamageRoll[]): boolean => {
  const key = (rows: DamageRoll[]) =>
    rows.map((r) => `${r.formula}|${r.type}`).sort().join(';')
  return key(a) === key(b)
}

/** Derive the per-step increment from base → the first variant, component-wise. */
function deriveIncrement(base: DamageRoll[], step1: DamageRoll[]): DamageRoll[] | null {
  const baseByKey = new Map<string, Dice>()
  for (const r of base) {
    const d = parseDice(r.formula)
    if (!d) return null
    baseByKey.set(`${d.die}|${r.type}`, d)
  }
  const inc: DamageRoll[] = []
  for (const r of step1) {
    const d = parseDice(r.formula)
    if (!d) return null
    const b = baseByKey.get(`${d.die}|${r.type}`)
    const count = d.count - (b?.count ?? 0)
    const mod = d.mod - (b?.mod ?? 0)
    if (count > 0 || mod !== 0) {
      inc.push({ formula: renderDice({ count: Math.max(count, 0), die: d.die, mod }), type: r.type })
    }
  }
  return inc.length ? inc : null
}

/**
 * Decide whether a spell's scaling is a regular per-level increment we can show in
 * the friendly increment editor, or irregular (→ manual rows). Regular means the
 * variants cover exactly the expected slots/tiers and each equals base + k·increment.
 */
function detectIncrement(
  base: DamageRoll[],
  scaling: SpellScaling[],
  level: number,
): DamageRoll[] | null {
  if (!scaling.length) return null
  const expected = scalingLevels(level)
  if (scaling.map((s) => s.level).join(',') !== expected.join(',')) return null
  const inc = deriveIncrement(base, scaling[0].damage)
  if (!inc) return null
  for (let i = 0; i < scaling.length; i++) {
    const steps = level === 0 ? i + 1 : scaling[i].level - level
    if (!sameDamage(scaleAndMerge(base, inc, steps), scaling[i].damage)) return null
  }
  return inc
}

/**
 * Reconstruct an editable draft from a saved Spell. Mechanics map back to the
 * resolution radio + damage rows; regular scaling round-trips to the increment
 * editor, irregular scaling falls back to explicit per-level rows.
 */
export function spellToDraft(spell: Spell): SpellDraft {
  const empty = emptySpellDraft()
  const m = spell.mechanics
  const base = m?.damage
  const scaling = m?.scaling ?? []
  const increment = base ? detectIncrement(base, scaling, spell.level) : null
  const manual = scaling.length > 0 && !increment

  return {
    name: spell.name,
    level: String(spell.level),
    school: spell.school,
    edition: spell.edition ?? '5.5',
    sourceName: spell.source === 'custom' ? '' : spell.source,
    classes: (spell.classes ?? []).join(', '),
    castingTime: spell.castingTime,
    range: spell.range,
    duration: spell.duration,
    concentration: spell.concentration,
    ritual: spell.ritual,
    verbal: spell.components.verbal,
    somatic: spell.components.somatic,
    material: spell.components.material,
    materials: spell.components.materials ?? '',
    text: spell.text,
    resolution: m?.attackRoll ? 'attack' : m?.save ? 'save' : 'none',
    saveAbility: m?.save?.ability ?? 'dex',
    saveOutcome: m?.save?.onSave ?? 'half',
    damage: damageToDrafts(base),
    scalingMode: manual ? 'manual' : 'increment',
    scalingIncrement: increment ? damageToDrafts(increment) : empty.scalingIncrement,
    scalingRows: manual
      ? scaling.map((s) => ({ id: uid(), level: String(s.level), damage: damageToDrafts(s.damage) }))
      : [],
  }
}
