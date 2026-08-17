// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { Creature } from './creature.ts'

/**
 * An encounter as prep rather than as a fight: which creatures, how many, on which side.
 * This is what a shared link carries and what the cast of a saved fight reads as — never
 * hit points, effects, initiative or a log, because none of that is prep.
 *
 * A creature the app ships travels as an **id**, not as its text: the recipient resolves it
 * against the compendium JSON they already have (`loadSrdCreatures` merges every library,
 * enabled or not), which keeps a template small and keeps us from copying stat blocks
 * around. Only the Game Master's own homebrew is carried whole, because a `custom:` id
 * means nothing to anybody else.
 */
export interface TemplateEntry {
  /** Compendium creature id, e.g. `srd-5.2:goblin`. Exclusive with the other two. */
  ref?: string
  /** A homebrew stat block, copied because no one else can resolve its id. */
  creature?: Creature
  /** A quick add: a name and two numbers, no stat block at all. */
  quick?: { name: string; maxHp: number; ac: number }
  /** How many copies of it. */
  count: number
  side: 'friend' | 'foe'
  /**
   * Names the Game Master typed over the auto-numbering, in board order — "Snik" survives,
   * "Goblin 2" doesn't (see `isAutoLabel`). Shorter than `count` is fine: the rest number
   * themselves on the way in.
   */
  labels?: string[]
  /** Whether the fight happens in this creature's lair, which is a prep decision. */
  inLair?: boolean
}

export interface EncounterTemplate {
  /** Schema version, so a stored or shared template can be read by a later app. */
  v: 1
  name: string
  entries: TemplateEntry[]
  /**
   * The Game Master's word to whoever opens a shared link — the ambush's terms, what the
   * boss opens with. Markdown in a deliberately small grammar (see `SharedNote`).
   */
  note?: string
  /**
   * A byline the publisher typed for themselves, rendered as "Encounter by …". Plain text,
   * never a link, and never filled in from the account — see `state/shareByline.ts`.
   */
  by?: string
}

/**
 * The bounds a template is held to. They are here rather than inside the parser because
 * both sides need them: the forms stop a Game Master writing something that won't survive
 * the round trip, and `parseTemplate` refuses anything past them on the way back in.
 *
 * Generous enough for real prep — forty kinds of creature, thirty of each — and small
 * enough that a hostile payload can't turn into a board nobody can clear or a row nobody
 * can load.
 */
export const TEMPLATE_LIMITS = {
  /** Distinct entries: kinds of creature, not copies. */
  entries: 40,
  /** Copies of one entry. */
  count: 30,
  /** Combatants the whole template may add. */
  combatants: 100,
  name: 60,
  label: 40,
  note: 2000,
  /**
   * What we're willing to publish, in bytes of JSON. Well under the `shares.data` column's
   * own 64KB check, so a refusal happens here with a sentence the Game Master can act on
   * rather than in Postgres with a constraint violation.
   */
  publishBytes: 32 * 1024,
  /**
   * How deep and how wide the structures inside an embedded creature may be. A stat block
   * is a shallow thing; anything past this is either broken or trying something.
   */
  depth: 12,
  arrayItems: 60,
  textChars: 20_000,
} as const
