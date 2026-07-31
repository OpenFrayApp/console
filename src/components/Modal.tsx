// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useRef, type ReactNode } from 'react'
import { useDismiss } from '../hooks/useDismiss.ts'
import { Button } from './ui.tsx'

/**
 * A centered modal dialog — dismissed by the Close button, an outside click, or Escape.
 * One shell for every dialog the console opens, at one width: the action resolver used
 * to keep its own copy of this, and the two had drifted to different widths.
 */
export function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: ReactNode
  subtitle?: ReactNode
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, true, onClose)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className="max-h-full w-full max-w-2xl overflow-auto rounded-lg border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold">{title}</h3>
          <Button variant="quiet" onClick={onClose}>
            Close
          </Button>
        </div>
        {subtitle && <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}
