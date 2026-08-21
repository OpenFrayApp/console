// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { ICON } from './icon.ts'

/** A flag: the mark a reader is putting on something for somebody else to look at. */
export function ReportIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg {...ICON} className={className}>
      <path d="M4 21V4" />
      <path d="M4 4h11l-1.5 3.5L15 11H4" />
    </svg>
  )
}
