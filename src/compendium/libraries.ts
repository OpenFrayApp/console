// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Edition } from '../schema/primitives.ts'

/**
 * Content libraries the compendium can surface. A library's `id` matches the
 * `source` on every creature/spell it ships, so filtering the display is a source
 * check. Which libraries are enabled is a user preference (see below); custom
 * content is never a library — it always shows. Adding Tome of Beasts etc. later is
 * a new entry here plus its ingested JSON.
 */
export interface Library {
  /** Matches the entries' `source`. */
  id: string
  label: string
  edition: Edition
  creaturesFile: string
  spellsFile: string
}

export const LIBRARIES: Library[] = [
  {
    id: 'srd-5.2',
    label: 'Core Rules 2024 (SRD 5.2.1)',
    edition: '5.5',
    creaturesFile: 'srd-creatures.json',
    spellsFile: 'srd-spells.json',
  },
  {
    id: 'srd-5.1',
    label: 'Core Rules 2014 (SRD 5.1)',
    edition: '5.0',
    creaturesFile: 'srd-2014-creatures.json',
    spellsFile: 'srd-2014-spells.json',
  },
]

/** 5.2 only by default — 5.1 is opt-in, so existing/anonymous users see no change.
 *  The enabled set is a per-account setting (cloudSettings / the `user_settings`
 *  table); anonymous users always get this default and the toggle is signed-in-only. */
export const DEFAULT_ENABLED_LIBRARIES = ['srd-5.2']

/** Validate a stored enabled-library list, falling back to the default. */
export function sanitizeEnabledLibraries(ids: unknown): string[] {
  if (Array.isArray(ids)) {
    const valid = ids.filter((id) => LIBRARIES.some((l) => l.id === id))
    if (valid.length) return valid
  }
  return DEFAULT_ENABLED_LIBRARIES
}

/** Whether an item should show: custom content always; otherwise its source must be enabled. */
export function inEnabledLibrary(
  item: { id: string; source: string },
  enabled: string[],
): boolean {
  return item.id.startsWith('custom:') || enabled.includes(item.source)
}

/** The edition tag for a source (e.g. "5.5" / "5.0"), for the compendium badge. */
export function libraryTag(source: string): string | undefined {
  return LIBRARIES.find((l) => l.id === source)?.edition
}
