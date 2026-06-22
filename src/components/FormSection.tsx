// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { ReactNode } from 'react'

/**
 * A collapsible group of form fields, shared by the creature and PC editors so the
 * two forms look identical. Core sections start open; advanced ones closed.
 */
export function FormSection({
  title,
  children,
  open = false,
}: {
  title: string
  children: ReactNode
  open?: boolean
}) {
  return (
    <details open={open} className="rounded-md border border-slate-200 dark:border-slate-800">
      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold">
        {title}
      </summary>
      <div className="space-y-3 border-t border-slate-200 p-3 dark:border-slate-800">{children}</div>
    </details>
  )
}
