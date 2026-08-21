// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { FormEvent, ReactNode } from 'react'

/**
 * The form dialogs' shared shell: the dimmed backdrop that closes on click, the
 * top-aligned panel, and the header with its title and close ✕. The body and footer
 * are the caller's children, below the header, so each dialog keeps its own padding
 * and buttons. Escape stays the caller's to bind — this adds no key listener.
 */
export function FormModal({
  title,
  ariaLabel,
  maxWidth,
  onClose,
  onSubmit,
  children,
}: {
  title: ReactNode
  /** The dialog's accessible name; defaults to `title` when that is a string. */
  ariaLabel?: string
  /** The panel's width cap, as the Tailwind class (e.g. `max-w-md`). */
  maxWidth: string
  onClose: () => void
  /** When set the panel is a `<form>` submitting here; without it, a plain `<div>`. */
  onSubmit?: (e: FormEvent) => void
  children: ReactNode
}) {
  const Panel = onSubmit ? 'form' : 'div'
  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-auto bg-black/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <Panel
        role="dialog"
        aria-label={ariaLabel ?? (typeof title === 'string' ? title : undefined)}
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
        className={`my-auto w-full ${maxWidth} rounded-lg border border-slate-200 bg-white text-left shadow-xl dark:border-slate-700 dark:bg-slate-900`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>
        {children}
      </Panel>
    </div>
  )
}
