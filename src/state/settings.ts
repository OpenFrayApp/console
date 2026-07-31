// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { sanitizeEnabledLibraries } from '../compendium/libraries.ts'
import type { FieldVisibility, HpVisibility } from '../schema/combatant.ts'

/**
 * App preferences for every user (anonymous included), persisted in `localStorage`
 * under one key — the same durable, device-local model the theme uses. These are
 * settings, not combat/session state, so unlike the encounter they intentionally
 * survive a tab close. Grows as more preferences arrive (e.g. keyboard shortcuts).
 */
/** How the compendium orders its list: alphabetically, or by challenge rating
 *  (creatures) / spell level (spells). */
export type LibrarySort = 'name' | 'cr'

/**
 * How much of a creature the shared player view gives away. Player characters are
 * never filtered — the table already knows its own hit points. Defaults hold a
 * creature's hit points to a wound word and keep its armor class off the screen.
 */
export interface PlayerViewSettings {
  hp: HpVisibility
  ac: FieldVisibility
}

export const DEFAULT_PLAYER_VIEW: PlayerViewSettings = { hp: 'bloodied', ac: 'hidden' }

export interface AppSettings {
  /** Content library ids the compendium/picker show (see compendium/libraries.ts). */
  enabledLibraries: string[]
  /** Whether homebrew (custom) creations show in the compendium and pickers. On by default. */
  showHomebrew: boolean
  /** How the compendium sorts creatures and spells. Defaults to by name. */
  librarySort: LibrarySort
  /** What the shared player view reveals about a creature. */
  playerView: PlayerViewSettings
  /**
   * The share code an anonymous GM's player-view link uses, minted on first share and
   * kept so the link stays the same. A signed-in GM's chosen code lives on their
   * `encounters` row instead; this is the device-local fallback, a preference like the
   * theme rather than session state, so anonymous fights still never reach the database.
   */
  playerViewCode: string | null
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

const HP_VISIBILITY: HpVisibility[] = ['exact', 'bloodied', 'hidden']

/** Read back the player-view settings, falling back to the guarded defaults per field. */
function readPlayerView(value: unknown): PlayerViewSettings {
  const data = (value ?? {}) as Record<string, unknown>
  return {
    hp: HP_VISIBILITY.includes(data.hp as HpVisibility)
      ? (data.hp as HpVisibility)
      : DEFAULT_PLAYER_VIEW.hp,
    // Anything but an explicit 'shown' keeps armor class off the players' screen.
    ac: data.ac === 'shown' ? 'shown' : 'hidden',
  }
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
    playerView: readPlayerView(data.playerView),
    playerViewCode: typeof data.playerViewCode === 'string' ? data.playerViewCode : null,
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
