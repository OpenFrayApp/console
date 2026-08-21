// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { Creature } from './creature.ts'
import type { ContentLicense } from './license.ts'

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
   * A byline the publisher typed for themselves, rendered as "Shared by …". Not "encounter
   * by": the cast is mostly other people's creatures, and what the byline can honestly
   * claim is that this publisher put them together and wrote the note. Plain text,
   * never a link, and never filled in from the account — see `state/shareByline.ts`.
   */
  by?: string
  /**
   * How the publisher's *own* words may be reused: the note, the name, and the arrangement
   * of the cast. It says nothing about the creatures, which carry their own — a shared
   * encounter is a collection, and collecting a stat block does not relicense it.
   *
   * Absent means unstated, which is the default and an honest one. It is set in the share
   * dialog because that is where the note is written and there is nowhere else to set it.
   */
  license?: ContentLicense
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
   * What we're willing to *read*, and the separate question. The column check bounds the row
   * **as stored**, which is compressed: forty near-identical stat blocks compress by three
   * orders of magnitude, so a row inside `pg_column_size(data) <= 65536` can be tens of
   * megabytes read back. Per-field caps don't bound the total either. This does.
   */
  readBytes: 64 * 1024,
  /** One embedded stat block. The largest the app ships is under 8KB. */
  creatureBytes: 16 * 1024,
  /** Items in any list inside a stat block; the longest the app ships is fifteen. */
  arrayItems: 60,
  /**
   * A name, an id, or one line of a list — an action's name, a damage type, a language.
   * Roomier than it looks like it needs to be because real stat blocks are: an immunity runs
   * to 82 characters. `creatureInput.test.ts` runs the shipped compendium through to check.
   */
  entryChars: 160,
  /** One entry's prose. The longest shipped is about 2,200 characters. */
  proseChars: 4000,
  /** A dice formula. The longest shipped is eight characters; opendice's own cap is 1000. */
  formulaChars: 100,
  /**
   * The ranges a stat-block number sits in to be one — because they are pasted into dice
   * formulas and counted down on screen, not because we have a view on monster strength.
   */
  bonus: 99,
  dc: 99,
  ac: 99,
  hp: 9999,
  uses: 99,
  score: 99,
  feet: 9999,
} as const
