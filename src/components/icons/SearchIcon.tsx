// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { ICON } from './icon.ts'

/** Magnifying glass for the quick reference search. */
export function SearchIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg {...ICON} className={className}>
      <circle cx="10.5" cy="10.5" r="7.5" />
      <path d="m16 16 5 5" />
    </svg>
  )
}
