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
function withoutAmounts(entry: GameLogEntry, name: string): GameLogEntry {
  if (entry.category === 'hp' && entry.amount != null) {
    return { ...entry, message: `${name} takes damage`, amount: undefined, result: undefined }
  }
  if (entry.category === 'heal' && entry.amount != null) {
    return { ...entry, message: `${name} is healed`, amount: undefined, result: undefined }
  }
  return entry
}

/**
 * Whether a roll is one of the creature's own d20s — an attack, a save, a check, an
 * initiative — as opposed to damage. Damage is never withheld: what a blow came to is
 * what the table felt, and it gives no bonus away. Read from the roll's own `kind`
 * rather than its wording, and initiative rolls carry no kind at all, so anything that
 * isn't damage counts.
 */
function isD20Roll(entry: GameLogEntry): boolean {
  return entry.result != null && entry.result.kind !== 'damage'
}

/**
 * Build the board to share from the live encounter. Pure, so what the table can see is
 * decided by a function with tests rather than by what a component happens to render.
 */
export function playerBoard(encounter: Encounter, settings: PlayerViewSettings): PlayerBoard {
  const active = encounter.combatants[encounter.activeIndex]
  const running = encounter.round > 0 && encounter.paused !== true
  // Creatures by id, with the label a rebuilt line needs. What is actually withheld is
  // two separate calls the GM makes: how much a creature was hurt (which follows the
  // hit-points setting, since showing exact HP and hiding the damage would be silly),
  // and whether its d20s carry a total.
  const creatures = new Map<string, string>()
  for (const c of encounter.combatants) {
    if (!c.isPC) creatures.set(c.combatantId, c.label)
  }
  const hideAmounts = settings.hp !== 'exact'
  const hideRolls = settings.rolls === 'hidden'

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
        const name = e.sourceId ? creatures.get(e.sourceId) : undefined
        if (!name) return shown
        // Hidden rolls lose the total but keep what happened: hit or miss, saved or
        // failed, and the damage dealt.
        const rolled = hideRolls && isD20Roll(shown) ? { ...shown, result: undefined } : shown
        return hideAmounts ? withoutAmounts(rolled, name) : rolled
      }),
  }
}
