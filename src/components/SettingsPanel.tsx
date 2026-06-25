// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import {
  LIBRARIES,
  editionBadgeClass,
  editionLabel,
  librarySourceBadgeClass,
} from '../compendium/libraries.ts'

const BADGE = 'rounded px-1.5 py-0.5 text-[10px] font-medium'

/**
 * App settings, available to every user (anonymous included). Settings persist in
 * `localStorage`, so the panel doesn't need an account. Today it holds the content
 * libraries; future preferences (e.g. keyboard shortcuts) get their own section here.
 * Shown full-screen over the app; closes via Done.
 */
export function SettingsPanel({
  onClose,
  enabledLibraries,
  onSetEnabledLibraries,
}: {
  onClose: () => void
  enabledLibraries: string[]
  onSetEnabledLibraries: (ids: string[]) => void
}) {
  // Toggle a library; never drop the last one (an empty compendium is never useful).
  const toggleLibrary = (id: string) => {
    const next = enabledLibraries.includes(id)
      ? enabledLibraries.filter((x) => x !== id)
      : [...enabledLibraries, id]
    if (next.length > 0) onSetEnabledLibraries(next)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-white dark:bg-slate-950">
      <div className="mx-auto flex min-h-full max-w-lg flex-col px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Settings
          </h1>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Done
          </button>
        </div>

        <div className="space-y-4">
          <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <h3 className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Content libraries
            </h3>
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
              Choose which rules libraries appear in your combat console and compendium.
            </p>
            <div className="space-y-2">
              {LIBRARIES.map((lib) => (
                <label
                  key={lib.id}
                  className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-indigo-600"
                    checked={enabledLibraries.includes(lib.id)}
                    onChange={() => toggleLibrary(lib.id)}
                  />
                  <span>{lib.label}</span>
                  <span className="flex items-center gap-1.5">
                    <span className={`${BADGE} ${librarySourceBadgeClass(lib.id)}`}>
                      {lib.shortLabel}
                    </span>
                    <span className={`${BADGE} ${editionBadgeClass(lib.edition)}`}>
                      {editionLabel(lib.edition)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
