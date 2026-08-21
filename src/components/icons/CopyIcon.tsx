// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { ICON } from './icon.ts'

/** Copy icon — one sheet laid over another. */
export function CopyIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg {...ICON} className={className}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  )
}
