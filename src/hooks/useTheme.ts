// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useState } from 'react'
import type { Theme } from '../state/persistence.ts'

/** Shared with the marketing site, so both surfaces open in the same theme. */
const KEY = 'openfray-theme'

/** The stored choice, or null when nothing valid is saved (or storage is blocked). */
function stored(): Theme | null {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    // localStorage can be unavailable in private mode; the caller's default applies.
    return null
  }
}

/**
 * Dark or light, applied to the document and remembered across visits. Both screens
 * the app serves — the console and the shared player view — run this, so a player
 * opening a link on their phone lands in the same theme the GM's site uses.
 */
export function useTheme(fallback: Theme = 'dark'): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => stored() ?? fallback)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      // Persisting is best-effort; the theme still applies for this visit.
    }
  }, [theme])

  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))]
}
