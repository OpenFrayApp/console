// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type {
  CombatantStatus,
  DeathSaves,
  MonsterCombatant,
  PlayerCharacter,
} from '../schema/combatant.ts'
import type { Encounter, GameLogEntry } from '../schema/encounter.ts'
import type { RollResult } from '../dice/roll.ts'
import type { PlayerViewSettings } from '../state/settings.ts'
import { hpTier, type HpTier } from './resources.ts'
import { isStable } from './deathsaves.ts'
import { badgeLabel } from './effects.ts'
import { isFoe } from './combatant.ts'

/**
 * What the shared player view is allowed to know. This module is the boundary: the
 * board a player receives is built here, on the GM's machine, and nothing else about
 * the encounter is ever sent. Filtering on the player's side would not be filtering
 * at all — a payload delivered whole and hidden with CSS is one devtools panel away
 * from being read, so a creature's stat block, its exact hit points, and the GM's own
 * bookkeeping never enter the message in the first place.
 */

/** A creature's hit points, at the fidelity the GM chose: a number, a wound word, or nothing. */
export type PlayerHp =
  | { kind: 'exact'; current: number; max: number; temp: number }
  | { kind: 'tier'; tier: HpTier }
  | null

/** One row of the shared tracker — a name, a wound, and what is stuck to it. */
export interface PlayerRow {
  id: string
  initiative: number
  name: string
  isFoe: boolean
  status: CombatantStatus
  hp: PlayerHp
  /** Only when the GM chose to show it, and never for a creature otherwise. */
  ac?: number
  /** Effect labels only — durations and escape saves stay with the GM. */
  effects: { id: string; label: string; icon?: string }[]
  concentrating: boolean
  deathSaves?: DeathSaves
  stable?: boolean
}

/** The whole message a player receives: the tracker, the log, and where the fight is. */
export interface PlayerBoard {
  round: number
  paused: boolean
  /** Whose turn it is, or null before the fight starts and while it's held. */
  activeId: string | null
  rows: PlayerRow[]
  log: GameLogEntry[]
}

/**
 * How much of the log travels. The player view is a live feed rather than an archive,
 * and a broadcast message has a size ceiling a long fight would run into.
 */
export const PLAYER_LOG_LIMIT = 60

/**
 * A player character's row, which is never filtered: the table wrote these numbers
 * down themselves, so hiding them would only make the screen less useful.
 */
function playerCharacterRow(c: PlayerCharacter): PlayerRow {
  return {
    id: c.combatantId,
    initiative: Math.floor(c.initiative),
    name: c.name,
    isFoe: isFoe(c),
    status: c.status,
    hp: { kind: 'exact', current: c.hp.current, max: c.hp.max, temp: c.hp.temp },
    ac: c.ac,
    effects: c.effects.map((e) => ({ id: e.id, label: badgeLabel(e), icon: e.icon })),
    concentrating: c.concentration !== null,
    deathSaves:
      c.status === 'unconscious' ? (c.deathSaves ?? { successes: 0, failures: 0 }) : undefined,
    stable: isStable(c) || undefined,
  }
}

/** A creature's row, cut down to the fidelity the GM's settings allow. */
function creatureRow(c: MonsterCombatant, settings: PlayerViewSettings): PlayerRow {
  const hp: PlayerHp =
    settings.hp === 'exact'
      ? { kind: 'exact', current: c.hp.current, max: c.hp.max, temp: c.hp.temp }
      : settings.hp === 'bloodied'
        ? { kind: 'tier', tier: hpTier(c) }
        : null
  return {
    id: c.combatantId,
    initiative: Math.floor(c.initiative),
    name: c.label,
    isFoe: true,
    status: c.status,
    hp,
    // No `ac` key at all when it's hidden — an absent field can't be read off the wire.
    ...(settings.ac === 'shown' ? { ac: c.creature.ac } : {}),
    effects: c.effects.map((e) => ({ id: e.id, label: badgeLabel(e), icon: e.icon })),
    concentrating: c.concentration !== null,
  }
}

/**
 * A roll with its total intact and its arithmetic gone. What gives a bonus away is the
 * breakdown — `1d20 [15] −1` states the modifier outright — while the total on its own
 * says nothing, because the dice behind it are unknown. So the table still watches the
 * fireball land for 30 and the ogre roll a 19, and still can't work out what either
 * rolls with.
 *
 * The effects that swung it go too: naming Bless or a Magic Resistance advantage is
 * naming the bonus. Whether it crit, fumbled, or had advantage stays — that is board
 * state the table watched happen.
 */
function rollWithoutArithmetic(result: RollResult): RollResult {
  return { ...result, dice: [], modifier: 0 }
}

/**
 * A log entry with a creature's numbers taken out but the event left in. The table
 * should know the ogre swung and hit, that it failed its save, that it took a wound —
 * just not the bonus behind the roll or how many hit points it has left.
 *
 * The message is prose, so it is never edited: an entry whose own text carries the
 * number is rebuilt from the structured `amount` and the name instead.
 */
function withoutNumbers(entry: GameLogEntry, name: string): GameLogEntry {
  if (entry.category === 'hp' && entry.amount != null) {
    return { ...entry, message: `${name} takes damage`, amount: undefined, result: undefined }
  }
  if (entry.category === 'heal' && entry.amount != null) {
    return { ...entry, message: `${name} is healed`, amount: undefined, result: undefined }
  }
  // A save is the one roll whose total means something on its own: set beside a DC the
  // table can work out, it gives the creature's modifier away. Saved or failed is the
  // whole of what they need — and dropping it by the roll's own kind rather than by
  // whether it has settled means the number never flashes up and then disappears.
  if (entry.result?.kind === 'save') return { ...entry, result: undefined }
  return entry
}

/**
 * Build the board to share from the live encounter. Pure, so what the table can see is
 * decided by a function with tests rather than by what a component happens to render.
 */
export function playerBoard(encounter: Encounter, settings: PlayerViewSettings): PlayerBoard {
  const active = encounter.combatants[encounter.activeIndex]
  const running = encounter.round > 0 && encounter.paused !== true
  // Whose numbers are withheld, by combatant id. A creature's are, unless the GM chose
  // to show exact hit points — at which point they have said the table may do the math.
  const guarded = new Map<string, string>()
  if (settings.hp !== 'exact') {
    for (const c of encounter.combatants) {
      if (!c.isPC) guarded.set(c.combatantId, c.label)
    }
  }

  return {
    round: encounter.round,
    paused: encounter.paused === true,
    activeId: running && active ? active.combatantId : null,
    rows: encounter.combatants.map((c) =>
      c.isPC ? playerCharacterRow(c) : creatureRow(c, settings),
    ),
    log: encounter.log
      .filter((e) => !e.gmOnly)
      .slice(-PLAYER_LOG_LIMIT)
      .map((e) => {
        // Every roll loses its arithmetic, whoever made it — an area's damage dice
        // aren't owned by any one combatant, and the total is the part that matters.
        // The effects that swung it go with it, since naming Bless names the bonus.
        const shown: GameLogEntry = {
          ...e,
          result: e.result && rollWithoutArithmetic(e.result),
          applied: undefined,
        }
        const name = e.sourceId ? guarded.get(e.sourceId) : undefined
        return name ? withoutNumbers(shown, name) : shown
      }),
  }
}
