// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Combatant, CombatantStatus, DeathSaves } from '../schema/combatant.ts'
import type { CombatClock, Encounter, GameLogEntry } from '../schema/encounter.ts'
import type { RollResult } from '../dice/roll.ts'
import type { PlayerViewSettings } from '../state/settings.ts'
import type { Recap } from './recap.ts'
import { hpTier, type HpTier } from './resources.ts'
import { isStable } from './deathsaves.ts'
import { badgeLabel } from './effects.ts'
import { acOf, isFoe, nameOf } from './combatant.ts'

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

/**
 * The end-of-fight summary as the table sees it. The same figures the GM's own recap
 * shows, plus whether experience travels — a milestone campaign counts none, and that
 * is a campaign setting the boundary itself knows nothing about.
 */
export interface PlayerRecap extends Recap {
  showXp: boolean
}

/** The whole message a player receives: the tracker, the log, and where the fight is. */
export interface PlayerBoard {
  round: number
  paused: boolean
  /** Whose turn it is, or null before the fight starts and while it's held. */
  activeId: string | null
  rows: PlayerRow[]
  log: GameLogEntry[]
  /**
   * The fight's clock, when the GM shares it: enough for the table's own screen to
   * tick along. Only the two clock fields travel — the damage tallies beside them in
   * `CombatStats` are the GM's.
   */
  timers?: CombatClock
  /** The summary of the fight just ended, while the GM has it up and shares it. */
  recap?: PlayerRecap
}

/**
 * How much of the log travels. The player view is a live feed rather than an archive,
 * and a broadcast message has a size ceiling a long fight would run into.
 */
export const PLAYER_LOG_LIMIT = 60

/**
 * Whether a combatant is on the shared board. The GM's own call on that creature wins;
 * otherwise the fight decides — the party's side is always there, and foes join when
 * combat begins, which is when the party meets them.
 */
export function onSharedBoard(c: Combatant, started: boolean): boolean {
  if (!isFoe(c)) return true
  if (c.shared === 'shown') return true
  return c.shared !== 'hidden' && started
}

/**
 * Whether the GM deliberately held this one back, as opposed to a foe simply waiting
 * for the fight to start. Only the deliberate case is worth flagging on the board: every
 * foe is off the table's screen before Begin, and saying so on each row reads as a
 * per-creature problem to undo rather than the default it is.
 */
export function heldBack(c: Combatant): boolean {
  return isFoe(c) && c.shared === 'hidden'
}

/**
 * The effect labels a row shares. A `gmOnly` effect never enters the message — the
 * same absent-field rule the rest of the boundary follows — and a bundle's members
 * collapse to one label carrying the bundle's name, never the parts.
 */
function sharedEffects(c: Combatant): PlayerRow['effects'] {
  const out: PlayerRow['effects'] = []
  const bundlesSent = new Set<string>()
  for (const e of c.effects) {
    if (e.gmOnly) continue
    if (e.bundle) {
      if (bundlesSent.has(e.bundle.id)) continue
      bundlesSent.add(e.bundle.id)
      out.push({ id: e.bundle.id, label: e.bundle.name, icon: e.icon })
    } else {
      out.push({ id: e.id, label: badgeLabel(e), icon: e.icon })
    }
  }
  return out
}

/** The board facts every row carries, whichever side of the fight it is on. */
function baseRow(c: Combatant): Omit<PlayerRow, 'hp'> {
  return {
    id: c.combatantId,
    initiative: Math.floor(c.initiative),
    name: nameOf(c),
    isFoe: isFoe(c),
    status: c.status,
    effects: sharedEffects(c),
    concentrating: c.concentration !== null,
  }
}

/**
 * An ally's row, which is never filtered: a player character's numbers are the
 * table's own, and a creature fighting for them — a summons, a hired guard — is
 * theirs to read too.
 */
function allyRow(c: Combatant): PlayerRow {
  const downed = c.isPC && c.status === 'unconscious'
  return {
    ...baseRow(c),
    hp: { kind: 'exact', current: c.hp.current, max: c.hp.max, temp: c.hp.temp },
    ac: acOf(c),
    deathSaves: downed ? (c.deathSaves ?? { successes: 0, failures: 0 }) : undefined,
    stable: (c.isPC && isStable(c)) || undefined,
  }
}

/** A foe's row, cut down to the fidelity the GM's settings allow. */
function foeRow(c: Combatant, settings: PlayerViewSettings): PlayerRow {
  const hp: PlayerHp =
    settings.hp === 'exact'
      ? { kind: 'exact', current: c.hp.current, max: c.hp.max, temp: c.hp.temp }
      : settings.hp === 'bloodied'
        ? { kind: 'tier', tier: hpTier(c) }
        : null
  return {
    ...baseRow(c),
    hp,
    // No `ac` key at all when it's hidden — an absent field can't be read off the wire.
    ...(settings.ac === 'shown' ? { ac: acOf(c) } : {}),
    ...(settings.effects === 'hidden' ? { effects: [] } : {}),
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
 * The log lines the table follows. On the default `fight` scope that is the fight in
 * progress and nothing else: the record starts fresh at each Begin and empties when the
 * fight ends, so the table isn't reading last fight's dice over the next one's setup.
 * The Game Master's own log keeps everything either way.
 */
function scopedLog(encounter: Encounter, scope: PlayerViewSettings['log']): GameLogEntry[] {
  if (scope === 'session') return encounter.log
  if (encounter.round === 0) return []
  return encounter.log.slice(Math.min(encounter.fightLogStart ?? 0, encounter.log.length))
}

/**
 * Build the board to share from the live encounter. Pure, so what the table can see is
 * decided by a function with tests rather than by what a component happens to render.
 */
export function playerBoard(
  encounter: Encounter,
  settings: PlayerViewSettings,
  /** The summary of the fight just ended, while the GM has it on screen. */
  recap: PlayerRecap | null = null,
): PlayerBoard {
  const active = encounter.combatants[encounter.activeIndex]
  const running = encounter.round > 0 && encounter.paused !== true
  // Which combatants are foes, since what the log holds back is theirs alone. Damage
  // isn't part of it: how hard a creature was hit, and how hard it hit back, is what
  // the table just watched happen and what they ask about afterwards. Only the dice
  // behind those numbers stay with the GM.
  const creatures = new Set(encounter.combatants.filter(isFoe).map((c) => c.combatantId))
  // A creature the table can't see doesn't narrate itself either: what a foe held back
  // from the board does stays with the GM until they reveal it. An entry that merely
  // names it as someone else's target still names it — revealing it is the GM's move,
  // and this is the half the board can decide on its own.
  const offBoard = new Set(
    encounter.combatants
      .filter((c) => !onSharedBoard(c, encounter.round > 0))
      .map((c) => c.combatantId),
  )
  const hideRolls = settings.rolls === 'hidden'

  return {
    round: encounter.round,
    paused: encounter.paused === true,
    activeId: running && active ? active.combatantId : null,
    // Until the fight begins the board is the GM's staging area — what they have lined
    // up, and how much of it, isn't the table's to read yet.
    rows: encounter.combatants
      .filter((c) => onSharedBoard(c, encounter.round > 0))
      .map((c) => (isFoe(c) ? foeRow(c, settings) : allyRow(c))),
    ...(encounter.combatStats && encounter.round > 0 && settings.timers === 'shown'
      ? {
          timers: {
            activeMs: encounter.combatStats.activeMs,
            runningSince: encounter.combatStats.runningSince,
          },
        }
      : {}),
    ...(recap && settings.recap === 'shown' ? { recap } : {}),
    log: scopedLog(encounter, settings.log)
      .filter((e) => !e.gmOnly && !(e.sourceId && offBoard.has(e.sourceId)))
      // With a creature's conditions held back, the lines announcing them go too —
      // a row with no badges under a log reading "the Ogre is Frightened" hides nothing.
      .filter(
        (e) =>
          settings.effects !== 'hidden' ||
          e.category !== 'condition' ||
          !(e.sourceId && creatures.has(e.sourceId)),
      )
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
        // A creature's own d20, hidden: the total goes, and what happened stays — hit
        // or miss, saved or failed, and the damage it dealt.
        const byFoe = e.sourceId != null && creatures.has(e.sourceId)
        return byFoe && hideRolls && isD20Roll(shown) ? { ...shown, result: undefined } : shown
      }),
  }
}
