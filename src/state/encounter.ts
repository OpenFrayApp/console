// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Combatant } from '../schema/combatant.ts'
import type { Encounter, GameLogEntry } from '../schema/encounter.ts'
import type { InitiativeTiebreak } from '../schema/campaign.ts'
import type { Edition } from '../schema/primitives.ts'
import { beginEncounter, nextTurn, previousTurn, sortByInitiative } from '../combat/initiative.ts'
import { isFoe, nameOf } from '../combat/combatant.ts'
import { counterOf, survivesLongRest } from '../combat/effects.ts'
import { clampLevel, exhaustionLevel, withExhaustion } from '../combat/exhaustion.ts'
import { effectiveMaxHp, setCurrentHp } from '../combat/resources.ts'
import { addDealt, addTaken, pauseStats, resumeStats, startStats } from '../combat/recap.ts'
import { assessEncounter } from '../combat/difficulty.ts'

/**
 * The encounter store as a pure reducer over the tested combat functions. The UI
 * mutates this in-memory and renders immediately (local-first); the reducer keeps
 * turn ownership by `combatantId` across add/remove, never by raw index.
 */

export type EncounterAction =
  // `tiebreak` carries the active campaign's initiative-tie rule into the sort
  // (defaults to 'dex' — the standard ruleset — when omitted, e.g. anon users).
  // `rolls` are the initiative rolls that set this order, recorded here rather than as
  // they were made: they belong to the fight, under the line that opens it.
  | { type: 'begin'; tiebreak?: InitiativeTiebreak; rolls?: NewLogEntry[] }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'stop' }
  | { type: 'nextTurn' }
  /** Step back to the previous turn — a mis-click correction, not an undo of its ticks. */
  | { type: 'prevTurn' }
  | { type: 'add'; combatant: Combatant; tiebreak?: InitiativeTiebreak }
  | { type: 'remove'; id: string }
  | { type: 'update'; id: string; update: (c: Combatant) => Combatant }
  /** End `id`'s concentration and clear the effects it was sustaining, board-wide. */
  | { type: 'endConcentration'; id: string }
  /** Set `id`'s Exhaustion level, rebuilding the penalties the edition's rules give it. */
  | { type: 'setExhaustion'; id: string; level: number; edition: Edition }
  /** Append a game-log entry; the reducer stamps its id + current round. */
  | { type: 'log'; entry: NewLogEntry }
  /** Rewrite a name across existing log entries (when a combatant is renamed). */
  | { type: 'renameLog'; from: string; to: string }
  /** Wipe the game log. */
  | { type: 'clearLog' }
  /** Attribute damage dealt to its source (for the recap MVP). Damage *taken* is
   *  captured automatically from any HP drop, so this records the dealer only. */
  | { type: 'recordDamage'; sourceId: string; amount: number }
  /** Long rest: restore every friendly combatant to full HP; reset the short-rest count. */
  | { type: 'longRest' }
  /** Short rest: set new current HP for the given combatants; bump the short-rest count. */
  | { type: 'shortRest'; hp: Record<string, number> }
  /** Clear the board of enemies — remove every foe, keeping friendly combatants. */
  | { type: 'clearFoes' }
  /** Sweep the whole board — remove every combatant, ending the encounter. */
  | { type: 'clearAll' }
  /** Manual reorder (drag): move `id` to where `toId` sits; its initiative is reset
   *  to sit between its new neighbours. */
  | { type: 'reorder'; id: string; toId: string }
  /** Replace the whole encounter — used when hydrating from the cloud on sign-in. */
  | { type: 'load'; encounter: Encounter }

/** The active combatant's id, or undefined on an empty board. */
const activeId = (e: Encounter): string | undefined => e.combatants[e.activeIndex]?.combatantId

/** A log entry before the reducer stamps its id + round. */
export type NewLogEntry = Omit<GameLogEntry, 'id' | 'round'>

/**
 * Append game-log entries, stamping a globally-unique id and the round. Pass a
 * `round` override when the entries belong to a round other than `state.round`
 * (e.g. a turn-advance entry carries the new round).
 */
function withLogs(state: Encounter, entries: NewLogEntry[], round = state.round): Encounter {
  if (entries.length === 0) return state
  const base = state.log.length
  return {
    ...state,
    log: [...state.log, ...entries.map((e, i) => ({ ...e, id: `${round}-${base + i}`, round }))],
  }
}

/**
 * Turn one combatant mutation into the board events worth logging: HP change,
 * effects (conditions) applied/removed, concentration start/end, and death/down/
 * revive. Almost every combatant change flows through the `update` action, so
 * centralizing the diff here keeps call sites clean. Transient `consumeOnRoll`
 * effects are skipped on removal — they clear on every roll and aren't news.
 */
function diffCombatantLogs(before: Combatant, after: Combatant): NewLogEntry[] {
  const out: NewLogEntry[] = []
  const name = nameOf(after)
  const sourceId = after.combatantId

  const dhp = after.hp.current - before.hp.current
  if (dhp < 0)
    out.push({ category: 'hp', message: `${name} takes ${-dhp} damage`, sourceId, amount: -dhp })
  else if (dhp > 0)
    out.push({ category: 'heal', message: `${name} regains ${dhp} HP`, sourceId, amount: dhp })

  const beforeEffectIds = new Set(before.effects.map((e) => e.id))
  const afterEffectIds = new Set(after.effects.map((e) => e.id))
  // Effects applied together as a named bundle make one line naming the bundle,
  // not one per part; a `gmOnly` effect's line is the GM's alone, like the effect.
  const bundlesLogged = new Set<string>()
  for (const e of after.effects) {
    if (beforeEffectIds.has(e.id)) continue
    if (e.bundle) {
      if (bundlesLogged.has(e.bundle.id)) continue
      bundlesLogged.add(e.bundle.id)
      out.push({
        category: 'condition',
        message: `${name} gains ${e.bundle.name}`,
        sourceId,
        gmOnly: e.gmOnly,
      })
      continue
    }
    out.push({
      category: 'condition',
      message: e.icon === 'condition' ? `${name} is ${e.name}` : `${name} gains ${e.name}`,
      sourceId,
      gmOnly: e.gmOnly,
    })
  }
  const bundlesEnded = new Set<string>()
  for (const e of before.effects) {
    if (afterEffectIds.has(e.id) || e.duration.type === 'consumeOnRoll') continue
    // A bundle cleared whole ends as one line; losing a single part names the part.
    if (e.bundle && !after.effects.some((a) => a.bundle?.id === e.bundle?.id)) {
      if (bundlesEnded.has(e.bundle.id)) continue
      bundlesEnded.add(e.bundle.id)
      out.push({
        category: 'condition',
        message: `${name}: ${e.bundle.name} ends`,
        sourceId,
        gmOnly: e.gmOnly,
      })
      continue
    }
    out.push({
      category: 'condition',
      message:
        e.icon === 'condition' ? `${name} is no longer ${e.name}` : `${name}: ${e.name} ends`,
      sourceId,
      gmOnly: e.gmOnly,
    })
  }

  // A counter keeps its id as its tally moves, so the add/remove passes above can't
  // see it — the whole point of one is the number, so log every step of it.
  const countsBefore = new Map(before.effects.map((e) => [e.id, counterOf(e)]))
  for (const e of after.effects) {
    const was = countsBefore.get(e.id)
    const now = counterOf(e)
    if (was == null || now == null || was === now) continue
    out.push({
      category: 'condition',
      message: `${name}: ${e.name} ${was} → ${now}`,
      sourceId,
      gmOnly: e.gmOnly,
    })
  }

  if (!before.concentration && after.concentration) {
    out.push({
      category: 'concentration',
      message: `${name} concentrates on ${after.concentration.spell}`,
      sourceId,
    })
  } else if (before.concentration && !after.concentration) {
    out.push({ category: 'concentration', message: `${name}'s concentration ends`, sourceId })
  }

  if (before.status !== after.status) {
    if (after.status === 'dead') out.push({ category: 'death', message: `${name} dies`, sourceId })
    else if (after.status === 'unconscious')
      out.push({ category: 'death', message: `${name} is down`, sourceId })
    else if (after.status === 'active')
      // A revive is a recovery, not a death event — group it with healing (green).
      out.push({ category: 'heal', message: `${name} is back up`, sourceId })
  }

  return out
}

/**
 * Move `id` to where `toId` sits — dragging down drops below the target, up drops
 * above it. Returns the same array reference when nothing moves. Pure; shared by the
 * reorder reducer and the drag-preview in the UI so both order rows identically.
 */
export function moveById<T extends { combatantId: string }>(
  list: T[],
  id: string,
  toId: string,
): T[] {
  if (id === toId) return list
  const from = list.findIndex((c) => c.combatantId === id)
  const to = list.findIndex((c) => c.combatantId === toId)
  if (from < 0 || to < 0) return list
  const dragged = list[from]
  const without = list.filter((c) => c.combatantId !== id)
  const targetIdx = without.findIndex((c) => c.combatantId === toId)
  const insertAt = from < to ? targetIdx + 1 : targetIdx
  return [...without.slice(0, insertAt), dragged, ...without.slice(insertAt)]
}

/** The index of a combatant id; missing or undefined ids fall back to 0. */
const indexOfId = (combatants: Combatant[], id: string | undefined): number => {
  if (!id) return 0
  const i = combatants.findIndex((c) => c.combatantId === id)
  return i >= 0 ? i : 0
}

/** Compute the next encounter state for an action, appending any game-log entries it produces. */
export function encounterReducer(state: Encounter, action: EncounterAction): Encounter {
  switch (action.type) {
    case 'begin': {
      const started = {
        ...beginEncounter(state, action.tiebreak),
        paused: false,
        // The next entry appended is this fight's first, so the shared log can begin here.
        fightLogStart: state.log.length,
        combatStats: startStats(Date.now(), assessEncounter(state.combatants)?.tier ?? null),
      }
      const active = started.combatants[started.activeIndex]
      return withLogs(
        started,
        [
          { category: 'turn', message: 'Combat begins — Round 1' },
          // The rolls that built this order, then whose turn it is — the fight reads
          // in the order it happened.
          ...(action.rolls ?? []),
          ...(active
            ? [
                {
                  category: 'turn' as const,
                  message: `${nameOf(active)}'s turn`,
                  sourceId: active.combatantId,
                },
              ]
            : []),
        ],
        started.round,
      )
    }

    case 'pause':
      return {
        ...state,
        paused: true,
        combatStats: state.combatStats && pauseStats(state.combatStats, Date.now()),
      }

    case 'resume':
      return {
        ...state,
        paused: false,
        combatStats: state.combatStats && resumeStats(state.combatStats, Date.now()),
      }

    // End combat back to setup: keep the combatants on the board, reset the clock. The
    // stats are finalized (clock stopped) and kept — App reads them for the recap.
    // Every foe leaves the table's screen with the fight, so a reveal made during it
    // doesn't outlive it: `shared` goes back to `auto`, which is nothing shown at round
    // 0 and everyone shown again at the next Begin.
    case 'stop': {
      const stopped = {
        ...state,
        round: 0,
        activeIndex: 0,
        paused: false,
        combatants: state.combatants.map((c) => (c.shared ? { ...c, shared: 'auto' as const } : c)),
        combatStats: state.combatStats && pauseStats(state.combatStats, Date.now()),
      }
      return withLogs(stopped, [{ category: 'turn', message: 'Combat ends' }], state.round)
    }

    case 'nextTurn': {
      const next = nextTurn(state)
      const entries: NewLogEntry[] = []
      if (next.round > state.round)
        entries.push({ category: 'turn', message: `Round ${next.round}` })
      const active = next.combatants[next.activeIndex]
      const prevActiveId = state.combatants[state.activeIndex]?.combatantId
      if (active && active.combatantId !== prevActiveId) {
        entries.push({
          category: 'turn',
          message: `${nameOf(active)}'s turn`,
          sourceId: active.combatantId,
        })
      }
      return withLogs(next, entries, next.round)
    }

    case 'prevTurn': {
      const prev = previousTurn(state)
      const active = prev.combatants[prev.activeIndex]
      if (!active || active.combatantId === state.combatants[state.activeIndex]?.combatantId) {
        return prev
      }
      const entries: NewLogEntry[] = []
      if (prev.round < state.round)
        entries.push({ category: 'turn', message: `Back to round ${prev.round}` })
      entries.push({
        category: 'turn',
        message: `Back to ${nameOf(active)}'s turn`,
        sourceId: active.combatantId,
      })
      return withLogs(prev, entries, prev.round)
    }

    case 'add': {
      const keepActive = activeId(state)
      const combatants = sortByInitiative([...state.combatants, action.combatant], action.tiebreak)
      return { ...state, combatants, activeIndex: indexOfId(combatants, keepActive) }
    }

    case 'remove': {
      const wasActive = activeId(state) === action.id
      const combatants = state.combatants.filter((c) => c.combatantId !== action.id)
      const activeIndex = wasActive
        ? Math.min(state.activeIndex, Math.max(0, combatants.length - 1))
        : indexOfId(combatants, activeId(state))
      return { ...state, combatants, activeIndex }
    }

    case 'update': {
      const before = state.combatants.find((c) => c.combatantId === action.id)
      const combatants = state.combatants.map((c) => {
        if (c.combatantId !== action.id) return c
        const updated = action.update(c)
        // A maxHp effect landing lowers the ceiling; current HP follows it down and,
        // per the rules, does not spring back when the reduction ends.
        const ceiling = effectiveMaxHp(updated)
        return updated.hp.current > ceiling
          ? { ...updated, hp: { ...updated.hp, current: ceiling } }
          : updated
      })
      const after = combatants.find((c) => c.combatantId === action.id)
      // Any HP drop — action damage, a save, a manual edit — is damage taken.
      const lost = before && after ? before.hp.current - after.hp.current : 0
      const next = {
        ...state,
        combatants,
        combatStats:
          state.combatStats && lost > 0
            ? addTaken(state.combatStats, action.id, lost)
            : state.combatStats,
      }
      return before && after ? withLogs(next, diffCombatantLogs(before, after)) : next
    }

    // Concentration is what sustains a spell's effects, so ending it has to clear
    // them from every target — not just the caster's own row.
    case 'endConcentration': {
      const combatants = state.combatants.map((c) => {
        const effects = c.effects.filter((e) => !(e.concentration && e.source === action.id))
        const dropped = effects.length !== c.effects.length
        const ending = c.combatantId === action.id && c.concentration !== null
        if (!dropped && !ending) return c
        return { ...c, effects, concentration: ending ? null : c.concentration }
      })
      const logs = state.combatants.flatMap((before, i) =>
        combatants[i] === before ? [] : diffCombatantLogs(before, combatants[i]),
      )
      return withLogs({ ...state, combatants }, logs)
    }

    // Setting the level replaces the whole Exhaustion bundle — under the 2014 table the
    // parts differ level by level, so there is nothing stable to patch — and the generic
    // effect diff would read that as one bundle ending and another beginning. The level
    // is the news, so this action logs it itself: one line, whatever moved underneath.
    case 'setExhaustion': {
      const target = state.combatants.find((c) => c.combatantId === action.id)
      if (!target) return state
      const was = exhaustionLevel(target.effects)
      const now = clampLevel(action.level)
      if (was === now) return state
      const combatants = state.combatants.map((c) => {
        if (c.combatantId !== action.id) return c
        const updated = { ...c, effects: withExhaustion(c.effects, now, action.edition) }
        // A halved hit point maximum lowers the ceiling; current HP follows it down and,
        // per the rules, does not spring back when the level drops again.
        const ceiling = effectiveMaxHp(updated)
        return updated.hp.current > ceiling
          ? { ...updated, hp: { ...updated.hp, current: ceiling } }
          : updated
      })
      const name = nameOf(target)
      const message =
        now === 0
          ? `${name}: Exhaustion ends`
          : was === 0
            ? `${name} gains Exhaustion ${now}`
            : `${name}: Exhaustion ${was} → ${now}`
      return withLogs({ ...state, combatants }, [
        { category: 'condition', message, sourceId: action.id },
      ])
    }

    case 'recordDamage':
      return {
        ...state,
        combatStats:
          state.combatStats && addDealt(state.combatStats, action.sourceId, action.amount),
      }

    case 'log':
      return withLogs(state, [action.entry])

    case 'renameLog':
      if (!action.from || action.from === action.to) return state
      return {
        ...state,
        log: state.log.map((e) =>
          e.message.includes(action.from)
            ? { ...e, message: e.message.split(action.from).join(action.to) }
            : e,
        ),
      }

    case 'clearLog':
      return { ...state, log: [], fightLogStart: 0 }

    // A long rest restores all player characters and friendly NPCs to full HP
    // (setCurrentHp also clears death saves and wakes the unconscious); foes are
    // untouched. The short-rest tally resets. (Monster spell slots aren't reset here:
    // monsters are always foes, so a party rest leaves them be — re-add the creature
    // for a fresh pool, or undo a cast to give a slot back.)
    case 'longRest':
      // Restore friendly HP, and also end concentration and any sub-8h effect on them
      // (a long rest is 8 hours); GM-managed `manual` and ≥8h effects survive.
      return withLogs(
        {
          ...state,
          shortRests: 0,
          combatants: state.combatants.map((c) =>
            isFoe(c)
              ? c
              : {
                  ...setCurrentHp(c, c.hp.max),
                  concentration: null,
                  effects: c.effects.filter(survivesLongRest),
                },
          ),
        },
        [{ category: 'rest', message: 'The party takes a long rest' }],
      )

    case 'shortRest':
      return withLogs(
        {
          ...state,
          shortRests: (state.shortRests ?? 0) + 1,
          combatants: state.combatants.map((c) =>
            action.hp[c.combatantId] != null ? setCurrentHp(c, action.hp[c.combatantId]) : c,
          ),
        },
        [{ category: 'rest', message: 'The party takes a short rest' }],
      )

    // Sweep the board between fights: drop every foe, keep the party. Only offered
    // outside combat, so the turn cursor resets to the top.
    case 'clearFoes':
      return { ...state, activeIndex: 0, combatants: state.combatants.filter((c) => !isFoe(c)) }

    // A full board sweep is a fresh start, so the combat record resets too. (Stop
    // keeps the log — the recap reads it; clearAll is the deliberate wipe.)
    case 'clearAll':
      return {
        ...state,
        round: 0,
        activeIndex: 0,
        paused: false,
        combatants: [],
        log: [],
        fightLogStart: 0,
      }

    // Drag-to-reorder: move the dragged combatant to the target's slot and reset its
    // initiative to sit between its new neighbours, so the order holds (and turn
    // ownership is re-derived by id, never index — the loop rule).
    case 'reorder': {
      const order = moveById(state.combatants, action.id, action.toId)
      if (order === state.combatants) return state
      const at = order.findIndex((c) => c.combatantId === action.id)
      const above = order[at - 1]
      const below = order[at + 1]
      // Sit between the new neighbours (a midpoint is fractional but the UI floors it,
      // so it just ranks above the lower neighbour and never alters anyone else).
      const initiative =
        above && below
          ? (above.initiative + below.initiative) / 2
          : above
            ? above.initiative - 1
            : below
              ? below.initiative + 1
              : order[at].initiative
      const combatants = order.map((c) => (c.combatantId === action.id ? { ...c, initiative } : c))
      return { ...state, combatants, activeIndex: indexOfId(combatants, activeId(state)) }
    }

    case 'load': {
      const e = action.encounter
      // Don't credit time the tab was closed: restart the active clock from now.
      return e.combatStats?.runningSince != null
        ? { ...e, combatStats: { ...e.combatStats, runningSince: Date.now() } }
        : e
    }

    default:
      return state
  }
}

/** A fresh local pre-combat encounter: empty board, empty log, round 0. */
export function emptyEncounter(): Encounter {
  return {
    encounterId: 'local',
    ownerId: null,
    round: 0,
    activeIndex: 0,
    combatants: [],
    log: [],
  }
}
