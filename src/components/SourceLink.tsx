// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { ReactNode } from 'react'
import { sourceInfo } from '../compendium/format.ts'

/**
 * Attribution line for a compendium entry — the ruleset (with the SRD page folded
 * into its parenthetical, when known), linked to the source: our own books link to the
 * book itself, third-party ones to their publisher. The license isn't shown here;
 * CC-BY attribution lives in the in-app Credits screen + CREDITS.md. `mt-auto` pins it
 * to the bottom of the stat block / spell card.
 */
export function SourceLink({
  source,
  page,
  actions,
}: {
  source: string
  page?: number
  actions?: ReactNode
}) {
  const info = sourceInfo(source)
  // Fold the page into the ruleset's parens ("… (SRD 5.2.1)" → "… (SRD 5.2.1, pg. 266)"),
  // or append parens when the ruleset has none ("Tome of Beasts 3" → "… (pg. 16)").
  const ruleset =
    page == null
      ? info.ruleset
      : /\)\s*$/.test(info.ruleset)
        ? info.ruleset.replace(/\)\s*$/, `, pg. ${page})`)
        : `${info.ruleset} (pg. ${page})`
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
      </p>
      {actions}
    </div>
  )
}
