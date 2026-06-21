// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { ReactNode } from 'react'
import { sourceInfo } from '../compendium/format.ts'

/**
 * Attribution line for a compendium entry — the ruleset it's from and its license
 * (linked), with optional trailing `actions` (e.g. Edit / Delete for a custom
 * creature). `mt-auto` pins it to the very bottom of the stat block / spell card.
 */
export function SourceLink({ source, actions }: { source: string; actions?: ReactNode }) {
  const info = sourceInfo(source)
  return (
    <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-200 pt-2 dark:border-slate-800">
      <p className="text-xs text-slate-400 dark:text-slate-500">
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
      {actions}
    </div>
  )
}
