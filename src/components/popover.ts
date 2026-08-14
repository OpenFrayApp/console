// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { cx } from '../lib/cx.ts'

/**
 * The card a header control drops open — every picker, menu, and panel that hangs off a
 * button. From `sm` up it anchors to its trigger like a dropdown; below `sm` the same
 * card renders as a fixed sheet pinned under the header, because an anchored card
 * overflows a phone screen. Callers pass their own width (`sm:`-scoped) and padding.
 */
export function popoverClass(width: string, align: 'left' | 'right' = 'right') {
  return cx(
    'fixed z-30 rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900',
    'max-sm:inset-x-3 max-sm:top-14 max-sm:max-h-[75vh] max-sm:overflow-y-auto',
    'sm:absolute sm:mt-1',
    align === 'left' ? 'sm:left-0' : 'sm:right-0',
    width,
  )
}
