// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useRef, type ReactNode } from 'react'
import { useDismiss } from '../../hooks/useDismiss.ts'
import { Button } from './primitives.tsx'

/** A centered dialog dismissed by its close control, an outside click, or Escape. */
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  size = 'md',
  showTitle = true,
  header,
}: {
  title: ReactNode
  subtitle?: ReactNode
  onClose: () => void
  children: ReactNode
  size?: 'md' | 'lg'
  /** Reference cards already carry their own visible heading. */
  showTitle?: boolean
  /** Search places its input and close control in the header. */
  header?: ReactNode
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
        className={`max-h-full w-full ${size === 'lg' ? 'max-w-4xl' : 'max-w-2xl'} overflow-auto rounded-lg border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:[--stat-header-bg:var(--color-slate-900)]`}
      >
        {header ?? (
          <div className="mb-1 flex items-start justify-between gap-3">
            {showTitle && <h3 className="text-base font-semibold">{title}</h3>}
            <Button variant="quiet" className="ml-auto" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
        {subtitle && <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}
