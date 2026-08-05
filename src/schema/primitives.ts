// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

export type Ability = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export type AbilityScores = Record<Ability, number>

/** The 5e ability modifier for a score (10–11 → 0, 14 → +2, 8 → −1). */
export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2)
}

/** Saving-throw proficiency bonuses, keyed by ability. Partial — most absent. */
export type SaveBonuses = Partial<Record<Ability, number>>

export type Size = 'Tiny' | 'Small' | 'Medium or Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan'

/** The 18 standard 5e skills. */
export type Skill =
  | 'acrobatics'
  | 'animalHandling'
  | 'arcana'
  | 'athletics'
  | 'deception'
  | 'history'
  | 'insight'
  | 'intimidation'
  | 'investigation'
  | 'medicine'
  | 'nature'
  | 'perception'
  | 'performance'
  | 'persuasion'
  | 'religion'
  | 'sleightOfHand'
  | 'stealth'
  | 'survival'

export type SkillBonuses = Partial<Record<Skill, number>>

/** The ability each skill checks with, per the 5e skill list. */
export const SKILL_ABILITY: Record<Skill, Ability> = {
  acrobatics: 'dex',
  animalHandling: 'wis',
  arcana: 'int',
  athletics: 'str',
  deception: 'cha',
  history: 'int',
  insight: 'wis',
  intimidation: 'cha',
  investigation: 'int',
  medicine: 'wis',
  nature: 'int',
  perception: 'wis',
  performance: 'cha',
  persuasion: 'cha',
  religion: 'int',
  sleightOfHand: 'dex',
  stealth: 'dex',
  survival: 'wis',
}

/** Damage types are metadata tags for display/resistance — never used in math. */
export type DamageType =
  | 'acid'
  | 'bludgeoning'
  | 'cold'
  | 'fire'
  | 'force'
  | 'lightning'
  | 'necrotic'
  | 'piercing'
  | 'poison'
  | 'psychic'
  | 'radiant'
  | 'slashing'
  | 'thunder'

export const DAMAGE_TYPES: DamageType[] = [
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
]

/** Movement speeds in feet. `hover` flags a flying speed that can hover. */
export interface Speeds {
  walk?: number
  fly?: number
  swim?: number
  climb?: number
  burrow?: number
  hover?: boolean
}

export interface Senses {
  passivePerception: number
  darkvision?: number
  blindsight?: number
  tremorsense?: number
  truesight?: number
}

/**
 * Origin of a piece of content. Specific enough to drive licensing/attribution,
 * e.g. `'srd-5.2'`, `'srd-5.1'`, `'kobold-press-tob'`, `'custom'`.
 * See CREDITS.md, and local/docs/content-licensing.md (maintainer notes).
 */
export type ContentSource = string

/** Campaign-level edition selection. Metadata + display only; no logic branches on it. */
export type Edition = '5.0' | '5.5'
