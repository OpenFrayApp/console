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
  /** Compact source label for the dropdown/list badge, e.g. "Core" / "ToB3". */
  shortLabel: string
  /** Source family for badge coloring — sibling books share a color (every SRD
   *  "Core" set, every Tome of Beasts volume, …). */
  family: string
  edition: Edition
  creaturesFile: string
  /** Absent for creatures-only libraries (e.g. a bestiary like Tome of Beasts). */
  spellsFile?: string
}

export const LIBRARIES: Library[] = [
  {
    id: 'srd-5.2',
    label: 'Core Rules 2024 (SRD 5.2.1)',
    shortLabel: 'Core',
    family: 'srd',
    edition: '5.5',
    creaturesFile: 'srd-creatures.json',
    spellsFile: 'srd-spells.json',
  },
  {
    id: 'srd-5.1',
    label: 'Core Rules 2014 (SRD 5.1)',
    shortLabel: 'Core',
    family: 'srd',
    edition: '5.0',
    creaturesFile: 'srd-2014-creatures.json',
    spellsFile: 'srd-2014-spells.json',
  },
  {
    id: 'kobold-press-tob2',
    label: 'Tome of Beasts 2 (Kobold Press)',
    shortLabel: 'ToB2',
    family: 'tob',
    edition: '5.0',
    creaturesFile: 'tob2-creatures.json',
  },
  {
    id: 'kobold-press-tob3',
    label: 'Tome of Beasts 3 (Kobold Press)',
    shortLabel: 'ToB3',
    family: 'tob',
    edition: '5.0',
    creaturesFile: 'tob3-creatures.json',
  },
]

/** Source-badge colors, keyed by family so sibling books share one (full class
 *  strings so Tailwind detects them). Unknown families fall back to neutral slate. */
const SOURCE_BADGE_CLASS: Record<string, string> = {
  srd: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
  tob: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
}
const SOURCE_BADGE_FALLBACK = 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'

/** Edition-badge colors, so 5.5 and 5.0 read distinctly (full class strings for Tailwind). */
const EDITION_BADGE_CLASS: Record<string, string> = {
  '5.5': 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  '5.0': 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
}

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

/** The compact source label for a source (e.g. "Core" / "ToB3"), for the source badge. */
export function librarySource(source: string): string | undefined {
  return LIBRARIES.find((l) => l.id === source)?.shortLabel
}

/** Color classes for a source badge — sibling books (same family) share a color. */
export function librarySourceBadgeClass(source: string): string {
  const family = LIBRARIES.find((l) => l.id === source)?.family
  return (family && SOURCE_BADGE_CLASS[family]) || SOURCE_BADGE_FALLBACK
}

/** Color classes for an edition badge (e.g. "5.5" / "5.0"). */
export function editionBadgeClass(edition: string | undefined): string {
  return (edition && EDITION_BADGE_CLASS[edition]) || SOURCE_BADGE_FALLBACK
}

/** Display label for an edition: "5.5" → "5.5e", "5.0" → "5e" (the value stays "5.5"/"5.0"). */
export function editionLabel(edition: string | undefined): string | undefined {
  if (edition === '5.5') return '5.5e'
  if (edition === '5.0') return '5e'
  return edition
}
