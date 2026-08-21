// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useCallback, useEffect, useRef } from 'react'
import type { Action } from '../../schema/action.ts'
import type { Combatant, MonsterCombatant } from '../../schema/combatant.ts'
import type { ConditionName, Effect } from '../../schema/effect.ts'
import type { Spell } from '../../schema/spell.ts'
import type { EncounterAction, NewLogEntry } from '../../state/encounter.ts'
import type { RolledDamage } from '../../combat/damage.ts'
import { signed } from '../../compendium/format.ts'
import type { OnRoll } from '../log/GameLog.tsx'

/** The resolver's props — the dispatcher hands them whole to the branch it picks. */
export interface ResolverProps {
  /** The acting creature. Absent for a casterless cast (the "Cast spell" panel),
   *  where the GM supplies the spell attack bonus / save DC instead. */
  attacker?: MonsterCombatant
  action: Action
  combatants: Combatant[]
  dispatch: (action: EncounterAction) => void
  onRoll: OnRoll
  /** Called when the action is actually rolled — spends a recharge ability. */
  onUse?: () => void
  /** Pre-check the "Magical Effect" toggle (a spell is always a magical effect). */
  defaultMagical?: boolean
  /** The spell being cast, when this resolver is driving a spell — lets a save spell
   *  with a modelled board effect (Bane, Faerie Fire) offer to apply it on a failure. */
  spell?: Spell
  /**
   * Who cast the spell, when that isn't who rolls. A player character casting through
   * the Cast spell panel is never the `attacker` — the GM types the DC and the player
   * rolls nothing — but the spell's effects still have to be sourced to them, or ending
   * their concentration would leave the effects behind on every target.
   */
  casterId?: string
  /**
   * Whether the spell landed, once the GM has settled it: someone failed the save, or
   * the attack hit. A concentration spell the board shrugged off has nothing to sustain,
   * so the caller uses this to decide whether concentration begins at all.
   */
  onResolved?: (landed: boolean) => void
  onClose: () => void
}

/**
 * Roll lines the resolver holds until it closes, keyed so a reroll replaces the line it
 * belongs to instead of adding another. Three attempts at one attack used to leave three
 * entries in the log — and on the shared player view the table watched the Game Master
 * fish for a hit. Only the roll that stood is recorded, when the modal goes away.
 */
export function usePendingLog(dispatch: (action: EncounterAction) => void) {
  const pending = useRef(new Map<string, NewLogEntry>())
  // Recorded before anything the GM applies, so the log reads in the order it happened:
  // the attack, then the damage it dealt. Emptying as it goes makes it safe to call from
  // every commit path, and the unmount cleanup catches a modal simply closed.
  const flush = useCallback(() => {
    for (const entry of pending.current.values()) dispatch({ type: 'log', entry })
    pending.current.clear()
  }, [dispatch])
  useEffect(() => () => flush(), [flush])
  return { pending, flush }
}

/** One log line per damage type; the actor prefix is dropped for a casterless cast. */
export function damageEntries(
  components: RolledDamage[],
  attacker: Combatant | undefined,
  action: Action,
): NewLogEntry[] {
  const prefix = attacker ? `${attacker.isPC ? attacker.name : attacker.label}: ` : ''
  return components.map((c) => ({
    category: 'roll' as const,
    message: `${prefix}${action.name} ${c.type} damage`,
    result: c.result,
  }))
}

/** The modal's subtitle: to-hit or save DC, reach/range in feet, and the damage dice. */
export function metaLine(action: Action): string {
  const bits: string[] = []
  if (action.toHit != null) bits.push(`${signed(action.toHit)} to hit`)
  if (action.save) {
    bits.push(
      `${action.save.ability.toUpperCase()} save DC ${action.save.dc} (${action.save.onSave})`,
    )
  }
  if (action.reach) bits.push(`reach ${action.reach} ft.`)
  if (action.range) {
    bits.push(`range ${action.range.normal}${action.range.long ? `/${action.range.long}` : ''} ft.`)
  }
  const dmg = (action.damage ?? []).map((d) => `${d.formula} ${d.type}`).join(' + ')
  return [bits.join(' · '), dmg].filter(Boolean).join(' · ')
}

/** Whether an effect is the named condition — the same test EffectModal clears by. */
export const isCondition = (e: Effect, name: ConditionName): boolean =>
  e.icon === 'condition' && e.name === name

/** The conditions a combatant carries, by name. */
export const conditionsOn = (c: Combatant): ConditionName[] =>
  c.effects.filter((e) => e.icon === 'condition').map((e) => e.name as ConditionName)
