// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { LifecycleSaveStatus } from '../../state/encounterLifecycle.ts'

const LABEL = {
  saving: 'Saving',
  saved: 'Saved',
  offline: 'Offline',
  failed: 'Save failed',
  'sign-in': 'Sign in to resume saving',
} as const

const DOT = {
  saving: 'bg-amber-500',
  saved: 'bg-emerald-500',
  offline: 'bg-slate-400',
  failed: 'bg-red-500',
  'sign-in': 'bg-slate-400',
} as const

/** Show whether the working board is recoverable and expose recovery actions on failure. */
export function RecoveryStatus({
  status,
  onRetry,
  onDownload,
  onSignIn,
}: {
  status: LifecycleSaveStatus
  onRetry: () => void
  onDownload: () => void
  onSignIn?: () => void
}) {
  if (status.kind === 'failed') {
    return (
      <div
        className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-xs"
        role="status"
      >
        <span className="flex items-center gap-1.5 font-medium text-red-700 dark:text-red-300">
          <span className={`h-2 w-2 rounded-full ${DOT.failed}`} aria-hidden="true" />
          {LABEL.failed}
        </span>
        <button
          type="button"
          onClick={onRetry}
          className="tap-area font-medium text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-950 dark:text-slate-200 dark:decoration-slate-600 dark:hover:text-white"
        >
          Retry saving
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="tap-area font-medium text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-950 dark:text-slate-200 dark:decoration-slate-600 dark:hover:text-white"
        >
          Download recovery copy
        </button>
      </div>
    )
  }

  if (status.kind === 'sign-in' && onSignIn) {
    return (
      <button
        type="button"
        onClick={onSignIn}
        className="tap-area flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
      >
        <span className={`h-2 w-2 rounded-full ${DOT['sign-in']}`} aria-hidden="true" />
        {LABEL['sign-in']}
      </button>
    )
  }

  return (
    <span
      className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
      role="status"
    >
      <span className={`h-2 w-2 rounded-full ${DOT[status.kind]}`} aria-hidden="true" />
      {LABEL[status.kind]}
    </span>
  )
}
