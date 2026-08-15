// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { cx } from '../lib/cx.ts'

/**
 * The card a header control drops open — every picker, menu, and panel that hangs off a
 * button. On a roomy screen it anchors to its trigger like a dropdown; on a compact one
 * the same card renders as a fixed sheet pinned under the header, because an anchored
 * card overflows a phone screen. Callers pass their own width (`roomy:`-scoped) and
 * padding.
 *
 * The sheet is capped in `dvh`, not `vh`: on iOS Safari `vh` is the tall viewport with
 * the URL bar hidden, so a `vh` cap runs the card under the browser chrome on the very
 * screens this branch exists for.
 */
export function popoverClass(width: string, align: 'left' | 'right' = 'right') {
  return cx(
    'fixed z-30 rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900',
    // Hangs below the header, whose height App publishes as `--header-h`: it is two or
    // three rows on a phone and changes as its clusters wrap, and a fixed offset put the
    // sheet over the button that opened it. The fallback is one row's worth.
    'compact:inset-x-3 compact:top-[calc(var(--header-h,3.5rem)+0.5rem)]',
    'compact:max-h-[calc(100dvh-var(--header-h,3.5rem)-1.5rem)] compact:overflow-y-auto',
    'roomy:absolute roomy:mt-1',
    align === 'left' ? 'roomy:left-0' : 'roomy:right-0',
    width,
  )
}
