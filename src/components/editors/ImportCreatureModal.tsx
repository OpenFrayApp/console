// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useEffect, useState } from 'react'
import type { Creature } from '../../schema/creature.ts'
import { parseImportedCreature } from '../../combat/importCreature.ts'
import { track, EVENTS } from '../../lib/analytics.ts'
import { FormModal } from '../ui/FormModal.tsx'
import { Button } from '../ui/primitives.tsx'

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
    /** Close the modal on Escape. */
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  /** Parse the pasted JSON and import the creature (then close), or show the error inline. */
  const submit = () => {
    const result = parseImportedCreature(text)
    if (result.error || !result.creature) {
      setError(
        result.error ??
          "That doesn't look like an OpenFray creature. Copy it again from the importer and paste the whole thing.",
      )
      return
    }
    track(EVENTS.creatureImported)
    onImport(result.creature)
    onClose()
  }

  return (
    <FormModal
      title="Import a creature"
      ariaLabel="Import creature"
      maxWidth="max-w-lg"
      onClose={onClose}
    >
      <div className="space-y-3 p-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Paste what the OpenFray Importer copied for you. The creature is saved to your library,
          where you can edit it like any you built yourself.
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
        <Button variant="primary" size="lg" onClick={submit} disabled={!text.trim()}>
          Import
        </Button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
      </div>
    </FormModal>
  )
}
