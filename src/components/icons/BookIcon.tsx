// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { ICON } from './icon.ts'

/** Open-book icon — the compendium. The empty state draws it big and a stroke lighter. */
export function BookIcon({
  className = 'h-5 w-5',
  strokeWidth = 2,
}: {
  className?: string
  strokeWidth?: number
}) {
  return (
    <svg {...ICON} strokeWidth={strokeWidth} className={className}>
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </svg>
  )
}
