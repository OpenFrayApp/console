// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useState, type ReactNode } from 'react'

/**
 * Click-to-edit text: shows `children`, swaps to an input on click, commits on
 * Enter or blur, cancels on Escape.
 */
export function EditableField({
  initial,
  onCommit,
  title,
  inputClassName,
  inputMode = 'text',
  children,
}: {
  initial: string
  onCommit: (value: string) => void
  title: string
  inputClassName: string
  inputMode?: 'numeric' | 'text'
  children: ReactNode
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(initial)
  if (editing) {
    /** Push the draft to `onCommit` and leave editing mode. */
    const commit = () => {
      onCommit(draft)
      setEditing(false)
    }
    return (
      <input
        autoFocus
        value={draft}
        inputMode={inputMode}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
        className={`tap-y ${inputClassName}`}
      />
    )
  }
  return (
    <button
      type="button"
      title={title}
      onClick={() => {
        setDraft(initial)
        setEditing(true)
      }}
      // The strip, not the floor: this sits in a combatant row, and a 44px-tall button
      // pads every row on the board to match it.
      className="tap-area cursor-text rounded px-0.5 hover:bg-slate-100 coarse:px-1.5 dark:hover:bg-slate-800"
    >
      {children}
    </button>
  )
}
