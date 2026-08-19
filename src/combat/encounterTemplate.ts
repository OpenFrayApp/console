// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { Combatant, MonsterCombatant, PlayerCharacter } from '../schema/combatant.ts'
import type { Creature } from '../schema/creature.ts'
import type { HpMethod } from '../schema/campaign.ts'
import {
  TEMPLATE_LIMITS as LIMITS,
  type EncounterTemplate,
  type TemplateEntry,
} from '../schema/encounterTemplate.ts'
import { projectCreature } from '../schema/creatureInput.ts'
import { autoLabel, instantiate, isAutoLabel, isFoe } from './combatant.ts'
import { resolveMaxHp } from './hp.ts'
import { bylineShapeError } from '../lib/byline.ts'
import { cleanLine, cleanProse } from '../lib/text.ts'

/**
 * Turning a board into prep and back again.
 *
 * A template is the cast of a fight: which creatures, how many, on which side. Going out,
 * live state is deliberately left behind — hit points, effects, initiative, the log — so
 * what comes back is a fresh board rather than someone else's half-fought one. Coming in
 * from a shared link it is untrusted input, and `parseTemplate` is the only door.
 */

/** A live combatant that belongs in a template: a creature, or a quick add. */
const inCast = (c: Combatant): boolean => !c.isPC || c.kind === 'quick'

/** Which side of the board a combatant sits on, in the template's two words. */
const sideOf = (c: Combatant): 'friend' | 'foe' => (isFoe(c) ? 'foe' : 'friend')

/**
 * The cast of a board, grouped: one entry per kind of creature per side, counted, with the
 * names the Game Master typed kept and the auto-numbering dropped (it is rebuilt on the way
 * back in, against whoever is already on the board).
 *
 * Player characters are left out. They are the party — they live in the roster, they come
 * back with a restore, and nobody wants a stranger's party arriving with a shared ambush.
 *
 * A creature the app ships travels as its id, so a stat block edited on the board reverts to
 * the library's on the way back — the cast is prep, and a one-off tweak isn't part of it.
 * Homebrew has no library to resolve against, so it travels whole.
 */
export function templateEntries(combatants: readonly Combatant[]): TemplateEntry[] {
  const entries = new Map<string, TemplateEntry>()
  for (const c of combatants) {
    if (!inCast(c)) continue
    const side = sideOf(c)
    if (c.isPC) {
      const key = `q|${c.name}|${c.hp.max}|${c.ac}|${side}`
      const found = entries.get(key)
      if (found) {
        found.count += 1
        continue
      }
      entries.set(key, {
        quick: { name: c.name, maxHp: c.hp.max, ac: c.ac },
        count: 1,
        side,
      })
      continue
    }
    const monster: MonsterCombatant = c
    const key = `m|${monster.creatureId}|${side}|${monster.inLair ? 'lair' : ''}`
    const found = entries.get(key)
    const typed = isAutoLabel(monster.label, monster.creature.name) ? null : monster.label
    if (found) {
      found.count += 1
      if (typed) found.labels = [...(found.labels ?? []), typed]
      continue
    }
    entries.set(key, {
      ...(monster.creatureId.startsWith('custom:')
        ? { creature: monster.creature }
        : { ref: monster.creatureId }),
      count: 1,
      side,
      ...(typed ? { labels: [typed] } : {}),
      ...(monster.inLair ? { inLair: true } : {}),
    })
  }
  return [...entries.values()]
}

/** A named template built from what is on the board right now. */
export function templateFromBoard(
  combatants: readonly Combatant[],
  name: string,
): EncounterTemplate {
  return { v: 1, name: cleanLine(name).slice(0, LIMITS.name), entries: templateEntries(combatants) }
}

/** How many combatants a template would add, for a count shown before anything is added. */
export function castSize(template: EncounterTemplate): number {
  return template.entries.reduce((n, e) => n + Math.max(1, Math.floor(e.count) || 1), 0)
}

/** One line of a cast read out: what it is, how many, and which side it stands on. */
export interface CastLine {
  name: string
  count: number
  side: 'friend' | 'foe'
  /** `party` is a player character — listed, never bundled into a template. */
  kind: 'creature' | 'quick' | 'party'
}

/**
 * A board read as a list — "Goblin ×4, Goblin Boss, Astra" — for a saved fight's card and a
 * shared encounter's page.
 *
 * Grouped by the **creature's** name rather than the board label, because "Goblin, Goblin 2,
 * Goblin 3" is one line of prep and three lines of noise. A renamed creature keeps its own
 * line: "Snik" is a different thing to read than another goblin.
 */
export function castSummary(combatants: readonly Combatant[]): CastLine[] {
  const lines = new Map<string, CastLine>()
  for (const c of combatants) {
    const side = sideOf(c)
    const kind: CastLine['kind'] = !c.isPC ? 'creature' : c.kind === 'quick' ? 'quick' : 'party'
    const name = c.isPC ? c.name : isAutoLabel(c.label, c.creature.name) ? c.creature.name : c.label
    const key = `${kind}|${name}|${side}`
    const found = lines.get(key)
    if (found) found.count += 1
    else lines.set(key, { name, count: 1, side, kind })
  }
  return [...lines.values()]
}

/** A quick add rebuilt from a template entry — the shape `AddQuickForm` produces. */
function quickCombatant(
  quick: { name: string; maxHp: number; ac: number },
  side: 'friend' | 'foe',
): PlayerCharacter {
  const maxHp = Math.max(1, Math.floor(quick.maxHp) || 1)
  return {
    isPC: true,
    kind: 'quick',
    side,
    combatantId: crypto.randomUUID(),
    name: quick.name,
    initiative: 0,
    ac: Math.max(0, Math.floor(quick.ac) || 0),
    status: 'active',
    hp: { current: maxHp, max: maxHp, temp: 0 },
    concentration: null,
    effects: [],
  }
}

/**
 * Instantiate a template into fresh combatants, ready to add to a board.
 *
 * Every copy goes through `instantiate` and `resolveMaxHp` exactly as picking the creature
 * by hand does, so a loaded encounter is indistinguishable from one added a creature at a
 * time — including rolled hit points under the campaign's method. `existing` is whoever is
 * already on the board, so the auto-numbering carries on from them rather than starting
 * again at 2.
 *
 * Anything that can't be resolved comes back in `missing` to be named in the UI. Silently
 * dropping a creature would leave a Game Master running a fight short of a monster without
 * knowing it.
 */
export function templateToCombatants(
  template: EncounterTemplate,
  opts: {
    creatures: readonly Creature[]
    hpMethod: HpMethod
    existing?: readonly Combatant[]
  },
): { combatants: Combatant[]; missing: string[] } {
  const library = new Map(opts.creatures.map((c) => [c.id, c]))
  const onBoard = new Map<string, number>()
  for (const c of opts.existing ?? []) {
    if (c.isPC) continue
    onBoard.set(c.creatureId, (onBoard.get(c.creatureId) ?? 0) + 1)
  }

  const combatants: Combatant[] = []
  const missing: string[] = []
  for (const entry of template.entries) {
    if (combatants.length >= LIMITS.combatants) break
    const count = Math.max(1, Math.min(Math.floor(entry.count) || 1, LIMITS.count))

    if (entry.quick) {
      for (let i = 0; i < count && combatants.length < LIMITS.combatants; i++) {
        combatants.push(quickCombatant(entry.quick, entry.side))
      }
      continue
    }

    const creature = entry.creature ?? (entry.ref ? library.get(entry.ref) : undefined)
    if (!creature) {
      missing.push(entry.ref ?? 'an unnamed creature')
      continue
    }
    for (let i = 0; i < count && combatants.length < LIMITS.combatants; i++) {
      const already = onBoard.get(creature.id) ?? 0
      onBoard.set(creature.id, already + 1)
      const monster = instantiate(creature, {
        combatantId: crypto.randomUUID(),
        initiative: 0,
        label: entry.labels?.[i] ?? autoLabel(creature.name, already),
        maxHp: resolveMaxHp(creature, opts.hpMethod),
      })
      combatants.push({
        ...monster,
        side: entry.side,
        ...(entry.inLair ? { inLair: true } : {}),
      })
    }
  }
  return { combatants, missing }
}

/** What `parseTemplate` gives back: one or the other, never both. */
export interface ParsedTemplate {
  template?: EncounterTemplate
  error?: string
}

const UNREADABLE = 'This encounter can’t be read. Ask whoever shared it for a new link.'
const TOO_BIG = 'This encounter is too big to open. Ask whoever shared it for a smaller one.'
const TOO_NEW = 'This encounter was made with a newer version of the console than this one.'

/** A whole number inside a range, as JSON would carry it. */
const intIn = (v: unknown, min: number, max: number): number | null =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : null

/** A compendium id: the shape the app's own ids have, and nothing else. */
const isRef = (v: unknown): v is string =>
  typeof v === 'string' &&
  v.length > 0 &&
  v.length <= 120 &&
  /^[A-Za-z0-9][A-Za-z0-9:._-]*$/.test(v)

/**
 * Read a template that came from outside the app — a shared link's payload.
 *
 * Rebuilt key by key onto a fresh object: nothing is spread from the input, and an unknown
 * field is dropped rather than carried onto a board and autosaved into the reader's own
 * account. The stakes aren't only what renders, they're what persists. An embedded creature
 * goes through `projectCreature`, which asks the same of every field a formula reaches.
 *
 * Size is bounded three times, and the three aren't the same question: the column check
 * bounds the row as stored (compressed), the per-field caps bound each field, and
 * `LIMITS.readBytes` bounds the blob this turns into.
 */
export function parseTemplate(value: unknown): ParsedTemplate {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return { error: UNREADABLE }
  const raw = value as Record<string, unknown>

  if (typeof raw.v === 'number' && raw.v > 1) return { error: TOO_NEW }

  const name = typeof raw.name === 'string' ? cleanLine(raw.name) : ''
  if (!name) return { error: UNREADABLE }
  if (name.length > LIMITS.name) return { error: TOO_BIG }

  if (!Array.isArray(raw.entries) || raw.entries.length === 0) return { error: UNREADABLE }
  if (raw.entries.length > LIMITS.entries) return { error: TOO_BIG }

  const entries: TemplateEntry[] = []
  let total = 0
  for (const item of raw.entries as unknown[]) {
    if (typeof item !== 'object' || item === null || Array.isArray(item))
      return { error: UNREADABLE }
    const e = item as Record<string, unknown>

    const count = intIn(e.count, 1, LIMITS.count)
    if (count === null) return { error: UNREADABLE }
    total += count
    if (total > LIMITS.combatants) return { error: TOO_BIG }

    if (e.side !== 'friend' && e.side !== 'foe') return { error: UNREADABLE }
    const side: 'friend' | 'foe' = e.side

    // Exactly one way of naming the creature. Two would leave which one wins to the reader.
    const ways = [e.ref, e.creature, e.quick].filter((v) => v !== undefined && v !== null).length
    if (ways !== 1) return { error: UNREADABLE }

    let labels: string[] | undefined
    if (e.labels !== undefined) {
      if (!Array.isArray(e.labels) || e.labels.length > LIMITS.count) return { error: UNREADABLE }
      const cleaned: string[] = []
      for (const label of e.labels as unknown[]) {
        if (typeof label !== 'string') return { error: UNREADABLE }
        const text = cleanLine(label)
        if (text.length > LIMITS.label) return { error: TOO_BIG }
        cleaned.push(text)
      }
      if (cleaned.some((l) => l.length > 0)) labels = cleaned
    }
    const inLair = e.inLair === true ? true : undefined

    const shared = {
      count,
      side,
      ...(labels ? { labels } : {}),
      ...(inLair ? { inLair } : {}),
    }

    if (e.quick !== undefined) {
      if (typeof e.quick !== 'object' || e.quick === null) return { error: UNREADABLE }
      const q = e.quick as Record<string, unknown>
      const quickName = typeof q.name === 'string' ? cleanLine(q.name) : ''
      const maxHp = intIn(q.maxHp, 1, 9999)
      const ac = intIn(q.ac, 0, 99)
      if (!quickName || quickName.length > LIMITS.label || maxHp === null || ac === null) {
        return { error: UNREADABLE }
      }
      entries.push({ quick: { name: quickName, maxHp, ac }, ...shared })
      continue
    }

    if (e.ref !== undefined) {
      if (!isRef(e.ref)) return { error: UNREADABLE }
      entries.push({ ref: e.ref, ...shared })
      continue
    }

    const creature = projectCreature(e.creature)
    // Null means a stat block missing what it takes to render, or one bigger than any is.
    if (!creature) {
      const size = JSON.stringify(e.creature)?.length ?? 0
      return { error: size > LIMITS.creatureBytes ? TOO_BIG : UNREADABLE }
    }
    // A homebrew creature from someone else is a new entity here, never an edit of one of
    // ours: the id is re-minted so it can't collide with, or pass itself off as, a library
    // entry the reader already has.
    const own: Creature = { ...creature, id: `custom:${crypto.randomUUID()}`, source: 'custom' }
    entries.push({ creature: own, ...shared })
  }

  const note = typeof raw.note === 'string' ? cleanProse(raw.note) : ''
  if (note.length > LIMITS.note) return { error: TOO_BIG }

  // A byline that breaks the rules is dropped, not fatal. The cast is what the reader came
  // for, and refusing the whole encounter over an attribution line would hand whoever wrote
  // it the power to break the page.
  //
  // Shape only: whether it renders safely is ours to judge, whether the publisher was
  // entitled to the name is not. A reader has no way to know that the person who wrote
  // "OpenFray" was granted it, and running the claim check here would drop precisely the
  // bylines that were.
  const by = typeof raw.by === 'string' ? cleanLine(raw.by) : ''
  const byOk = by.length > 0 && bylineShapeError(by) === null

  const template: EncounterTemplate = {
    v: 1,
    name,
    entries,
    ...(note ? { note } : {}),
    ...(byOk ? { by } : {}),
  }

  // Measured on what we built, not what arrived: the bytes about to be copied onto a board
  // and autosaved. Forty entries each within every per-field cap still add up.
  if (JSON.stringify(template).length > LIMITS.readBytes) return { error: TOO_BIG }
  return { template }
}
