// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useEffect } from 'react'

/**
 * While active, Enter runs the open dialog's primary action — the Save/Apply
 * convention. It stands down inside a textarea and whenever a button, link, or
 * select holds focus, where Enter already belongs to the control (the browser's
 * own Enter-click stands untouched).
 */
export function useEnterCommit(active: boolean, action: () => void): void {
  useEffect(() => {
    if (!active) return
    /** Commit on a bare Enter aimed at nothing that owns the key. */
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.defaultPrevented) return
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
      const t = e.target
      if (
        t instanceof HTMLElement &&
        (t.tagName === 'TEXTAREA' ||
          t.tagName === 'BUTTON' ||
          t.tagName === 'A' ||
          t.tagName === 'SELECT')
      )
        return
      e.preventDefault()
      action()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, action])
}
