// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useEffect, useRef, useState } from 'react'
import { chordOf, formatChord } from '../state/hotkeys.ts'

const GRAMMAR_NOTE = 'Use a key, alone or with Shift or Ctrl.'

/**
 * One command's row in the Keyboard tab: the current chord, a Change button that
 * captures the next keypress, and Clear. While armed it listens on the window's
 * capture phase and swallows everything, so no dialog, popover, or global command
 * hears the key being chosen; Escape cancels the capture and nothing else.
 * Validation beyond the grammar is the caller's: `validate` returns a refusal
 * note to show (the capture stays armed), or null to accept.
 */
export function HotkeyField({
  label,
  value,
  validate,
  onChange,
  onClear,
}: {
  label: string
  /** The resolved chord, or null when the command is unbound. */
  value: string | null
  /** A refusal note for a captured chord (conflict, browser), or null to accept. */
  validate: (chord: string) => string | null
  onChange: (chord: string) => void
  onClear: () => void
}) {
  const [armed, setArmed] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!armed) return
    /** Swallow the keydown and commit, refuse, or cancel the capture. */
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const key = e.key
      if (key === 'Shift' || key === 'Control' || key === 'Alt' || key === 'Meta') return
      if (key === 'Escape') {
        setArmed(false)
        setNote(null)
        return
      }
      const chord = chordOf(e)
      if (chord === null) {
        setNote(GRAMMAR_NOTE)
        return
      }
      const refusal = validate(chord)
      if (refusal) {
        setNote(refusal)
        return
      }
      setArmed(false)
      setNote(null)
      onChange(chord)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [armed, validate, onChange])

  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
        <span className="flex shrink-0 items-center gap-2">
          {value ? (
            <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-800">
              {formatChord(value)}
            </kbd>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-500">Not set</span>
          )}
          <button
            ref={buttonRef}
            type="button"
            onClick={() => {
              setArmed((a) => !a)
              setNote(null)
            }}
            onBlur={() => setArmed(false)}
            className="tap-y rounded border border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {armed ? 'Press a key…' : 'Change'}
          </button>
          <button
            type="button"
            onClick={() => {
              setArmed(false)
              setNote(null)
              onClear()
            }}
            disabled={value === null}
            className="tap-y rounded border border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Clear
          </button>
        </span>
      </div>
      {note && <p className="mb-0 mt-1 text-xs text-amber-700 dark:text-amber-400">{note}</p>}
    </div>
  )
}
