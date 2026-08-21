// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useEffect } from 'react'
import { COMMANDS, formatChord } from '../../state/hotkeys.ts'
import type { HotkeyCommandId } from '../../state/hotkeys.ts'

const CATEGORIES = [...new Set(COMMANDS.map((c) => c.category))]

/**
 * The keyboard cheat sheet: every command with its current chord, grouped the way
 * the Settings tab lists them. Read-only — rebinding lives in Settings, and the
 * footer says so.
 */
export function KeyboardHelp({
  bindings,
  onClose,
}: {
  bindings: Record<HotkeyCommandId, string | null>
  onClose: () => void
}) {
  useEffect(() => {
    /** Close the sheet on Escape. */
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-full w-full max-w-2xl overflow-auto rounded-lg border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">Keyboard shortcuts</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tap rounded px-2 py-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {CATEGORIES.map((category) => (
            <section key={category}>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {category}
              </h4>
              <ul className="m-0 list-none space-y-1 p-0">
                {COMMANDS.filter((c) => c.category === category).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">{c.label}</span>
                    {bindings[c.id] ? (
                      <kbd className="shrink-0 rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-800">
                        {formatChord(bindings[c.id] as string)}
                      </kbd>
                    ) : (
                      <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                        Not set
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <p className="mb-0 mt-4 text-xs text-slate-500 dark:text-slate-400">
          Change any of these in Settings, under Keyboard.
        </p>
      </div>
    </div>
  )
}
