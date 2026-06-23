// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

export type Ability = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export type AbilityScores = Record<Ability, number>

/** Saving-throw proficiency bonuses, keyed by ability. Partial — most absent. */
export type SaveBonuses = Partial<Record<Ability, number>>

export type Size =
  | 'Tiny'
  | 'Small'
  | 'Medium or Small'
  | 'Medium'
  | 'Large'
  | 'Huge'
  | 'Gargantuan'

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
 * See docs/content-licensing.md.
 */
export type ContentSource = string

/** Campaign-level edition selection. Metadata + display only; no logic branches on it. */
export type Edition = '5.0' | '5.5'
