// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { sourceInfo } from '../compendium/format.ts'

/**
 * Attribution line for a compendium entry — the ruleset it's from and its license
 * (linked). `mt-auto` pins it to the very bottom of the stat block / spell card.
 */
export function SourceLink({ source }: { source: string }) {
  const info = sourceInfo(source)
  return (
    <p className="mt-auto border-t border-slate-200 pt-2 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
      Source: {info.ruleset}
      {info.license && (
        <>
          {' · '}License:{' '}
          {info.url ? (
            <a
              href={info.url}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-slate-600 dark:hover:text-slate-300"
            >
              {info.license}
            </a>
          ) : (
            info.license
          )}
        </>
      )}
    </p>
  )
}
