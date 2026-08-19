// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReactNode } from 'react'
import { sourceInfo } from '../compendium/format.ts'
import { effectiveLicense, type ContentLicense } from '../schema/license.ts'
import { LicenseLink } from './LicenseLink.tsx'

/**
 * Attribution line for a compendium entry — the ruleset, with the SRD page folded into
 * its parenthetical when known. Only the books we publish ourselves are linked, and they
 * link to the book; SRD and third-party sources are plain text, because their licenses
 * are satisfied by CREDITS.md and a publisher's home page is not that attribution. The
 * A library entry's own license isn't shown, because CREDITS.md is what satisfies it. What
 * is shown is a creature's *own* provenance when it has any — where it was built from, and
 * what its author said it may be reused for. Those are claims a Game Master made about
 * their own work, and the person reading the stat block is the person who needs them.
 * `mt-auto` pins the line to the bottom of the stat block / spell card.
 */

/** Words that stay lowercase when an id's slug is read back as a name. */
const SMALL = new Set(['of', 'the', 'and', 'a', 'an', 'in', 'on', 'from'])

/**
 * A derivation as a reader should see it: the creature's name and nothing else.
 *
 * A compendium id carries its library too (`kobold-press-tob:ghast-of-leng`), and naming
 * the book here put a parenthetical inside the one the ruleset already has. The Source
 * beside it names the book anyway. When creatures get public pages this becomes a link to
 * the one it was built from, which is the version of "where did this come from" worth
 * having; until then the name is the useful half.
 *
 * Anything without an id is free text the Game Master typed, and is shown exactly as typed.
 */
function derivation(from: string): string {
  const at = from.indexOf(':')
  if (at < 0) return from
  return from
    .slice(at + 1)
    .split('-')
    .map((w, i) => (i > 0 && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}
export function SourceLink({
  source,
  page,
  derivedFrom,
  license,
  strangers = false,
  actions,
}: {
  source: string
  page?: number
  /**
   * Whether this stat block is being read by somebody who doesn't own it — a shared link.
   * `custom` reads as "Custom (you)" everywhere else, which is true in a Game Master's own
   * library and false the moment the page is somebody else's.
   */
  strangers?: boolean
  /** What this was built from, when its author said so. */
  derivedFrom?: string
  /**
   * What its author said it may be reused for. Absent falls back to what the source is
   * published under, so a library entry shows its book's terms without every stat block
   * having to carry a copy of them.
   */
  license?: ContentLicense
  actions?: ReactNode
}) {
  const info = strangers && source === 'custom' ? { ruleset: 'Homebrew' } : sourceInfo(source)
  // Fold the page into the ruleset's parens ("… (SRD 5.2.1)" → "… (SRD 5.2.1, pg. 266)"),
  // or append parens when the ruleset has none ("Tome of Beasts 3" → "… (pg. 16)").
  const ruleset =
    page == null
      ? info.ruleset
      : /\)\s*$/.test(info.ruleset)
        ? info.ruleset.replace(/\)\s*$/, `, pg. ${page})`)
        : `${info.ruleset} (pg. ${page})`
  // The book's terms when nobody has said otherwise, and the author's when they have. Only
  // a custom creature nobody has spoken for ends up with nothing to show, which is right:
  // silence is not a license, and printing "not stated" would read as though it were.
  const effective = effectiveLicense({ source, license })
  return (
    <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-200 pt-2 dark:border-slate-800">
      <p className="text-xs text-slate-400 dark:text-slate-500">
        Source:{' '}
        {info.url ? (
          // A new tab always: following a source from the middle of a fight must never
          // take the board off the screen.
          <a
            href={info.url}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-dotted underline-offset-2 hover:text-slate-600 dark:hover:text-slate-300"
          >
            {ruleset}
          </a>
        ) : (
          ruleset
        )}
        {derivedFrom && ` · Based on ${derivation(derivedFrom)}`}
        {effective !== 'unstated' && (
          <>
            {' · '}
            <span className="font-semibold">
              <LicenseLink license={effective} />
            </span>
          </>
        )}
      </p>
      {actions}
    </div>
  )
}
