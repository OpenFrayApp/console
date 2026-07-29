// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { sanitizeEnabledLibraries } from '../compendium/libraries.ts'

/**
 * App preferences for every user (anonymous included), persisted in `localStorage`
 * under one key — the same durable, device-local model the theme uses. These are
 * settings, not combat/session state, so unlike the encounter they intentionally
 * survive a tab close. Grows as more preferences arrive (e.g. keyboard shortcuts).
 */
/** How the compendium orders its list: alphabetically, or by challenge rating
 *  (creatures) / spell level (spells). */
export type LibrarySort = 'name' | 'cr'

export interface AppSettings {
  /** Content library ids the compendium/picker show (see compendium/libraries.ts). */
  enabledLibraries: string[]
  /** Whether homebrew (custom) creations show in the compendium and pickers. On by default. */
  showHomebrew: boolean
  /** How the compendium sorts creatures and spells. Defaults to by name. */
  librarySort: LibrarySort
}

const KEY = 'openfray-settings'

/** Parse the stored settings JSON; missing, malformed, or blocked storage yields {}. */
function read(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Record<string, unknown>
  } catch {
    /* localStorage unavailable, or malformed JSON — fall back to defaults */
  }
  return {}
}

/** The persisted settings with every field sanitized and defaulted (safe with nothing stored). */
export function loadSettings(): AppSettings {
  const data = read()
  return {
    enabledLibraries: sanitizeEnabledLibraries(data.enabledLibraries),
    // On by default; only an explicit stored `false` hides homebrew.
    showHomebrew: data.showHomebrew !== false,
    // By name unless an explicit 'cr' is stored.
    librarySort: data.librarySort === 'cr' ? 'cr' : 'name',
  }
}

/** Persist a settings patch, merged over what's already stored — so saving one preference
 *  never drops another. */
export function saveSettings(patch: Partial<AppSettings>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...loadSettings(), ...patch }))
  } catch {
    /* ignore when localStorage is unavailable (private mode, quota) */
  }
}
