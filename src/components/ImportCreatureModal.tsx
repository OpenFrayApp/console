// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useState } from 'react'
import type { Creature } from '../schema/creature.ts'
import { parseImportedCreature } from './importCreature.ts'

/**
 * Paste an OpenFray Creature JSON (e.g. from the D&D Beyond importer) and save it
 * to the library as an editable custom creature. Validation + re-id live in
 * `parseImportedCreature`; this is just the entry surface.
 */
export function ImportCreatureModal({
  open,
  onClose,
  onImport,
}: {
  open: boolean
  onClose: () => void
  onImport: (creature: Creature) => void
}) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setText('')
    setError(null)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const submit = () => {
    const result = parseImportedCreature(text)
    if (result.error || !result.creature) {
      setError(result.error ?? 'Could not import that creature.')
      return
    }
    onImport(result.creature)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-auto bg-black/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Import creature"
        onClick={(e) => e.stopPropagation()}
        className="my-auto w-full max-w-lg rounded-lg border border-slate-200 bg-white text-left shadow-xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="text-lg font-semibold">Import creature JSON</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Paste an OpenFray Creature JSON. It’s saved to your library as an editable
            custom creature.
          </p>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setError(null)
            }}
            placeholder={'{\n  "name": "…",\n  "abilities": { … },\n  …\n}'}
            aria-label="Creature JSON"
            autoFocus
            spellCheck={false}
            className="h-64 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        </div>

        <div className="flex items-center gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim()}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            Import
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
