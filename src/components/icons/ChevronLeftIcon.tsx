// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { ICON } from './icon.ts'

/** Chevron pointing left — the swipe shell's back control. */
export function ChevronLeftIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg {...ICON} className={className}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}
