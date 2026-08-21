// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReactNode } from 'react'
import { FieldHint } from '../ui/FieldHint.tsx'

/** One settings row: a label, the control right-aligned beside it, the description behind a ?. */
export function SettingRow({
  id,
  label,
  hint,
  children,
}: {
  /** The control's element id, which the label points at. */
  id: string
  label: string
  /** What the choice does, shown from the ? beside the label. */
  hint?: ReactNode
  /** The control itself, usually a select carrying `id`. */
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5">
        <label htmlFor={id} className="text-sm text-slate-700 dark:text-slate-200">
          {label}
        </label>
        {hint && <FieldHint>{hint}</FieldHint>}
      </span>
      {children}
    </div>
  )
}
