// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Creature } from '../schema/creature.ts'
import type {
  Combatant,
  CombatantVisibility,
  LimitedUseState,
  MonsterCombatant,
} from '../schema/combatant.ts'
import { deriveAc } from '../schema/pcStats.ts'
import { abilityMod } from '../schema/primitives.ts'
import { rechargeActions } from './recharge.ts'

/**
 * Whether a combatant sits on the enemy side for colouring, grouping, and what the
 * shared player view withholds. A board notion, separate from `isPC` (which drives
 * mechanics): a creature is a foe unless the GM says otherwise, a PC / quick add is a
 * friend unless they do.
 */
export function isFoe(c: Combatant): boolean {
  return c.isPC ? c.side === 'foe' : c.side !== 'friend'
}

/** The display name for a combatant row: a PC's name, a monster's board label. */
export function nameOf(c: Combatant): string {
  return c.isPC ? c.name : c.label
}

/**
 * A combatant's armor class, effects included. A monster reads its stat block; a PC
 * reads the GM's number — or, for a roster character set to derive it, the live
 * derivation from class, abilities, and the armor currently worn, so donning and
 * doffing at the table moves the number by itself. On top of the base, `ac` effects
 * fold in: numeric flat modifiers add, and an alternative unarmored base (Mage
 * Armor's 13 + DEX) lifts an unarmored PC to the better of the two.
 */
export function acOf(c: Combatant): number {
  let base = c.isPC ? ((c.acAuto ? deriveAc(c) : null) ?? c.ac) : c.creature.ac
  let delta = 0
  for (const e of c.effects) {
    const m = e.modifier
    if (m?.applies !== 'ac' || m.mode !== 'flatBonus') continue
    if (typeof m.value === 'number') delta += m.value
    // The alternative base needs to know "unarmored", which only a PC's facts say.
    if (m.acBase != null && c.isPC && !c.armor && c.abilities) {
      base = Math.max(base, m.acBase + abilityMod(c.abilities.dex) + (c.shield ? 2 : 0))
    }
  }
  return base + delta
}

/**
 * The label for the Nth copy of a creature on the board: "Ghoul", then "Ghoul 2".
 * Auto-numbering is disambiguation, not a name the GM chose — see `isAutoLabel`.
 */
export function autoLabel(name: string, alreadyOnBoard: number): string {
  return alreadyOnBoard > 0 ? `${name} ${alreadyOnBoard + 1}` : name
}

/**
 * Whether a label is just the auto-numbering rather than a GM rename. A renamed
 * combatant shows its original name alongside ("Snik (Goblin)"); "Goblin 2" is the
 * same creature with a number, so showing "Goblin 2 (Goblin)" is noise.
 */
export function isAutoLabel(label: string, creatureName: string): boolean {
  if (label === creatureName) return true
  const escaped = creatureName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${escaped} \\d+$`).test(label)
}

export interface InstantiateOptions {
  combatantId: string
  initiative: number
  label: string
  /** Override max HP (e.g. rolled from `hpFormula`); defaults to the template's `maxHp`. */
  maxHp?: number
  visibility?: Partial<CombatantVisibility>
}

/** Players see a monster's HP as Bloodied/Healthy and never its AC, by default. */
const DEFAULT_VISIBILITY: CombatantVisibility = {
  name: 'shown',
  hp: 'bloodied',
  conditions: 'shown',
  ac: 'hidden',
}

/**
 * Snapshot a library Creature into a combat-ready Combatant. The template is
 * deep-copied, so later library edits never reach into this fight.
 */
export function instantiate(creature: Creature, opts: InstantiateOptions): MonsterCombatant {
  const snapshot = structuredClone(creature)
  const max = opts.maxHp ?? snapshot.maxHp

  const limitedUseState: Record<string, LimitedUseState> = {}
  for (const lu of snapshot.limitedUse ?? []) {
    limitedUseState[lu.id] = { available: true }
  }
  // Rechargeable actions (e.g. "Recharge 5–6") start charged.
  for (const action of rechargeActions(snapshot)) {
    limitedUseState[action.id] = { available: true }
  }

  return {
    isPC: false,
    combatantId: opts.combatantId,
    creatureId: snapshot.id,
    creature: snapshot,
    label: opts.label,
    initiative: opts.initiative,
    status: 'active',
    hp: { current: max, max, temp: 0 },
    slotsUsed: {},
    spellUsesSpent: {},
    limitedUseState,
    legendaryRemaining: snapshot.legendaryActions?.perRound ?? 0,
    legendaryResistanceSpent: 0,
    concentration: null,
    effects: [],
    reactionUsed: false,
    visibility: { ...DEFAULT_VISIBILITY, ...opts.visibility },
  }
}
