// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useCallback, useId, useRef, useState } from 'react'
import type { LifecycleSaveStatus } from '../../state/encounterLifecycle.ts'
import { useDismiss } from '../../hooks/useDismiss.ts'

const LABEL = {
  saving: 'Saving',
  saved: 'Saved',
  offline: 'Offline',
  failed: 'Save failed',
  'sign-in': 'Sign in to resume saving',
  'read-only': 'Saving elsewhere',
  conflict: 'Copies need attention',
} as const

const DOT = {
  saving: 'bg-amber-500',
  saved: 'bg-emerald-500',
  offline: 'bg-slate-400',
  failed: 'bg-red-500',
  'sign-in': 'bg-slate-400',
  'read-only': 'bg-amber-500',
  conflict: 'bg-red-500',
} as const

const ACTION =
  'tap-y cursor-pointer text-left font-medium text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-950 dark:text-slate-200 dark:decoration-slate-600 dark:hover:text-white'

/** Show a compact save-status dot with its message and recovery actions on demand. */
export function RecoveryStatus({
  status,
  onRetry,
  onDownload,
  onSignIn,
  onTakeOver,
  onResolveCopies,
}: {
  status: LifecycleSaveStatus
  onRetry: () => void
  onDownload: () => void
  onSignIn?: () => void
  onTakeOver?: () => void
  onResolveCopies?: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)
  const label = LABEL[status.kind]
  /** Close the status popover before handing off to a recovery action. */
  const runAction = (action: () => void) => {
    close()
    action()
  }

  return (
    <div
      ref={ref}
      className="relative flex shrink-0 items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        if (!ref.current?.contains(document.activeElement)) close()
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close()
      }}
    >
      <span className="sr-only" role="status">
        {label}
      </span>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        className="tap inline-flex h-9 w-4 shrink-0 items-center justify-center rounded"
      >
        <span className={`h-2 w-2 rounded-full ${DOT[status.kind]}`} aria-hidden="true" />
      </button>
      {open && (
        <div
          id={panelId}
          className="absolute right-0 top-full z-[60] w-max max-w-[calc(100vw-2rem)] pt-2"
        >
          <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <p className="font-medium">{label}</p>
            {status.kind === 'failed' && (
              <>
                <button type="button" onClick={() => runAction(onRetry)} className={ACTION}>
                  Retry saving
                </button>
                <button type="button" onClick={() => runAction(onDownload)} className={ACTION}>
                  Download recovery copy
                </button>
              </>
            )}
            {status.kind === 'conflict' && onResolveCopies && (
              <button type="button" onClick={() => runAction(onResolveCopies)} className={ACTION}>
                Resolve copies
              </button>
            )}
            {status.kind === 'read-only' && onTakeOver && (
              <button type="button" onClick={() => runAction(onTakeOver)} className={ACTION}>
                Take over saving
              </button>
            )}
            {status.kind === 'sign-in' && onSignIn && (
              <button type="button" onClick={() => runAction(onSignIn)} className={ACTION}>
                Sign in
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
