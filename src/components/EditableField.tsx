// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

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
        className={inputClassName}
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
      className="cursor-text rounded px-0.5 hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      {children}
    </button>
  )
}
