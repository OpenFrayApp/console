// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Creature } from '../schema/creature.ts'
import type {
  CombatantVisibility,
  LimitedUseState,
  MonsterCombatant,
} from '../schema/combatant.ts'
import { rechargeActions } from './recharge.ts'

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
 * Snapshot a library Creature into a combat-ready Combatant. The template data is
 * deep-copied, so later edits to the library never reach into this fight
 * (snapshot, don't reference).
 */
export function instantiate(
  creature: Creature,
  opts: InstantiateOptions,
): MonsterCombatant {
  const snapshot = structuredClone(creature)
  const max = opts.maxHp ?? snapshot.maxHp

  const limitedUseState: Record<string, LimitedUseState> = {}
  for (const lu of snapshot.limitedUse ?? []) {
    limitedUseState[lu.id] = { available: true }
  }
  // Rechargeable actions (e.g. "Recharge 5–6") start charged and are tracked by id.
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
    legendaryResistanceRemaining: snapshot.legendaryResistance,
    concentration: null,
    effects: [],
    reactionUsed: false,
    visibility: { ...DEFAULT_VISIBILITY, ...opts.visibility },
  }
}
