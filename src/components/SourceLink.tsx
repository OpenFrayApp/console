// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { sourceInfo } from '../compendium/format.ts'

/** Attribution line for a compendium entry — where it came from, with a link. */
export function SourceLink({ source }: { source: string }) {
  const info = sourceInfo(source)
  return (
    <p className="border-t border-slate-200 pt-2 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
      Source:{' '}
      {info.url ? (
        <a
          href={info.url}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-slate-600 dark:hover:text-slate-300"
        >
          {info.label}
        </a>
      ) : (
        info.label
      )}
    </p>
  )
}
