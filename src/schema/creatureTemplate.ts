// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { Creature } from './creature.ts'

/**
 * One creature, published to a link. The second `kind` under `/s/`, not a second URL shape
 * and not a second table — `kind` was made a namespace for exactly this.
 *
 * A creature travels one of two ways, and which one is decided by size rather than by
 * permission. An unmodified library creature goes as a **reference**: a few hundred bytes
 * against several kilobytes, and the recipient's own compendium stays authoritative, so a
 * stat block corrected next month is corrected for them too. Anything else — homebrew, or a
 * library creature somebody has edited — is carried **whole**, with its own `derivedFrom`
 * and `license` along for the ride, because there is nothing for a recipient to resolve it
 * against.
 *
 * That split is also what keeps a payload from claiming to be a library creature it isn't.
 * A `ref` resolves against the reader's own JSON, which already excludes the Product
 * Identity those books reserve; a carried creature always lands in the `custom:` namespace
 * on the way in. Nothing a stranger sends can add text to a book.
 */
export interface CreatureTemplate {
  /** Schema version, so a stored or shared template can be read by a later app. */
  v: 1
  /** A compendium id, when the reader can resolve the stat block themselves. */
  ref?: string
  /** The stat block itself, for homebrew and for anything edited away from its source. */
  creature?: Creature
  /**
   * What it is called, copied here at publish time rather than read out of the creature.
   *
   * It is the one field a list of links can select without dragging every payload back, and
   * a `ref` share has no stat block to take a name from at all. Duplicating one short string
   * is cheaper than either.
   */
  name: string
  /**
   * The publisher's word to whoever opens the link: where it came from, how to run it.
   * Markdown in the same deliberately small grammar the encounter note uses.
   */
  note?: string
  /**
   * A byline they typed, rendered as "Shared by …". Not "creature by": whoever publishes a
   * creature may have written it, or found it in a book, or been sent it by somebody else,
   * and the byline can only honestly claim they are the one who put it here. Plain text,
   * never a link, and never filled in from the account.
   */
  by?: string
}
