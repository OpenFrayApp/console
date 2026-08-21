// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReactNode } from 'react'

/** One settings row: a label, the control right-aligned beside it, an optional hint below. */
export function SettingRow({
  id,
  label,
  hint,
  children,
}: {
  /** The control's element id, which the label points at. */
  id: string
  label: string
  /** A sentence under the row saying what the choice does. */
  hint?: ReactNode
  /** The control itself, usually a select carrying `id`. */
  children: ReactNode
}) {
  const control = (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="text-sm text-slate-700 dark:text-slate-200">
        {label}
      </label>
      {children}
    </div>
  )
  if (!hint) return control
  return (
    <div>
      {control}
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
    </div>
  )
}
