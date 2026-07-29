// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Creature } from '../schema/creature.ts'
import type {
  Combatant,
  CombatantVisibility,
  LimitedUseState,
  MonsterCombatant,
} from '../schema/combatant.ts'
import { rechargeActions } from './recharge.ts'

/**
 * Whether a combatant sits on the enemy side for colouring and grouping. A
 * board/display notion, separate from `isPC` (which drives mechanics): monsters are
 * always foes; a PC / quick add is a foe only when explicitly marked one.
 */
export function isFoe(c: Combatant): boolean {
  return c.isPC ? c.side === 'foe' : true
}

/** The display name for a combatant row: a PC's name, a monster's board label. */
export function nameOf(c: Combatant): string {
  return c.isPC ? c.name : c.label
}

/** A combatant's armor class: entered directly on a PC, from the stat block on a monster. */
export function acOf(c: Combatant): number {
  return c.isPC ? c.ac : c.creature.ac
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
