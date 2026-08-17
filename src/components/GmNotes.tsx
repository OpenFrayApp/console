// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useState } from 'react'
import { Markdown } from './Markdown.tsx'

/**
 * The Game Master's private notes on something, wherever they hang: a character's own
 * notes on its stat block, a campaign's on its card. Read-only markdown without
 * `onCommit`; with it, click to edit and click away to save — no Save button, because
 * the note is a scratchpad and a button would make it a form.
 *
 * `label` is the field's accessible name, `prompt` the noun the empty state asks for
 * (its own prop because the label's capitals don't survive mid-sentence — "GM notes"
 * stays as it is, "Campaign notes" reads lowercase there), and `savedTo` is what the
 * tooltip says the note is kept on.
 *
 * These render with `links` on, which almost nothing else does: this is the Game Master's
 * own prose on their own screen, and a note pointing at the map they drew should open it.
 * Nothing here ever arrives from someone else — a shared encounter carries no notes.
 */
export function GmNotes({
  value,
  onCommit,
  label = 'GM notes',
  prompt = label,
  savedTo = 'this character',
}: {
  value?: string
  /** Absent leaves the notes read-only — a viewer who can't edit them. */
  onCommit?: (text: string) => void
  label?: string
  prompt?: string
  savedTo?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')

  if (!onCommit) {
    if (!value?.trim()) return null
    return (
      <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <Markdown links>{value}</Markdown>
      </div>
    )
  }
  if (editing) {
    /** Save the trimmed draft via onCommit and leave edit mode. */
    const commit = () => {
      onCommit(draft.trim())
      setEditing(false)
    }
    return (
      <textarea
        autoFocus
        value={draft}
        rows={4}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setEditing(false)
        }}
        aria-label={label}
        placeholder="Notes only you can see. Click away to save."
        className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
      />
    )
  }
  return (
    <button
      type="button"
      title={`Click to edit — saved to ${savedTo}`}
      onClick={() => {
        setDraft(value ?? '')
        setEditing(true)
      }}
      className="block w-full cursor-text rounded px-1 py-0.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      {value?.trim() ? (
        <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <Markdown links>{value}</Markdown>
        </div>
      ) : (
        <span className="text-sm italic text-slate-400 dark:text-slate-500">{`Add ${prompt}…`}</span>
      )}
    </button>
  )
}
