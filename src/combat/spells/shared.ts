// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Combatant } from '../../schema/combatant.ts'
import type { Effect, EffectDuration } from '../../schema/effect.ts'
import { abilityMod, type Ability } from '../../schema/primitives.ts'
import type { Spell } from '../../schema/spell.ts'
import { durationRounds } from '../casting.ts'

/**
 * Types and helpers shared by the per-category spell tables. Lives apart from
 * `spellEffects.ts` so the category files and the lookup can both import it
 * without a cycle.
 */

/** Who a spell's effect usually lands on — drives default target selection. */
export type EffectTargeting = 'self' | 'ally' | 'enemy'

export interface SpellEffectContext {
  /** combatantId of the caster, when known. */
  source?: string
  spell: Spell
  /** The creature the effect is landing on, when the caller knows it. */
  target?: Combatant
  /** The save being resolved — present only when this came from a failed save. */
  save?: { ability: Ability; dc: number }
}

export interface SpellEffectDef {
  /** Plain-English board effect, shown on the apply prompt. */
  summary: string
  targeting: EffectTargeting
  /** True when the spell normally affects more than one creature (e.g. Bless, up to 3). */
  multi?: boolean
  /** Build a fresh effect (with a unique id) for one target. Call once per target. */
  build: (ctx: SpellEffectContext) => Effect[]
}

export type SpellEffectTable = Record<string, SpellEffectDef>

/** The spell's stated duration as an Effect duration; manual when it doesn't convert (hours+). */
export function timedDuration(spell: Spell): EffectDuration {
  const rounds = durationRounds(spell.duration)
  return rounds != null ? { type: 'rounds', rounds } : { type: 'manual' }
}

/**
 * A save-ends duration when the caller handed us the save that was rolled, else the
 * spell's own duration. Debuffs applied from the save resolver get their escape save;
 * the same entry applied from the cast card falls back to the timer.
 */
export function saveOrTimed(ctx: SpellEffectContext): EffectDuration {
  return ctx.save ? { type: 'saveEnds', save: ctx.save } : timedDuration(ctx.spell)
}

export const MANUAL: EffectDuration = { type: 'manual' }
export const CONSUME: EffectDuration = { type: 'consumeOnRoll' }

/** True for the 2024 rules (edition `5.5`); spells whose two versions differ branch on this. */
export const is2024 = (spell: Spell): boolean => spell.edition !== '5.0'

/** Dex score when the board has one: monsters always, PCs only from the roster. */
export function dexScore(c: Combatant | undefined): number | undefined {
  if (!c) return undefined
  return c.isPC ? c.abilities?.dex : c.creature.abilities.dex
}

/** A target's Dex modifier, or undefined when it carries no ability scores. */
export function dexModifier(c: Combatant | undefined): number | undefined {
  const score = dexScore(c)
  return score == null ? undefined : abilityMod(score)
}
