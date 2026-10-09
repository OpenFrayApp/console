// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { Edition } from '../schema/primitives.ts'
import type { ContentLicense } from '../schema/license.ts'

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
  /** Publisher-verified reuse license, independent of the settings group. */
  license: ContentLicense
  label: string
  /** Compact source label for the dropdown/list badge, e.g. "Core" / "ToB3". */
  shortLabel: string
  /** Source family for badge coloring — sibling books share a color (every SRD
   *  "Core" set, every Tome of Beasts volume, …). */
  family: string
  /** Settings-panel grouping header: 'core' (SRD), 'openfray' (first-party content),
   *  'other' (third-party books). Homebrew is injected into 'other' by the panel — it's a
   *  preference, not a library. */
  group: 'core' | 'openfray' | 'other'
  /** Omitted for an unverified edition or a distinct non-SRD ruleset. */
  edition?: Edition
  /** A verified alternative ruleset; never treated as an SRD edition. */
  ruleset?: 'a5e'
  /** Readable spell cards whose automation has not been reviewed for this source. */
  referenceOnly?: boolean
  /** Absent for a library that ships no stat blocks (e.g. a book of spells and presets). */
  creaturesFile?: string
  /** Absent for creatures-only libraries (e.g. a bestiary like Tome of Beasts). */
  spellsFile?: string
  /** Where this library is published to read, for the libraries we write ourselves.
   *  Absent for third-party books, which we reference but don't host. */
  bookUrl?: string
}

export const LIBRARIES: Library[] = [
  {
    id: 'srd-5.2',
    license: 'cc-by-4.0',
    label: 'Basic Rules 2024 (SRD 5.2.1)',
    shortLabel: 'Core',
    family: 'srd',
    group: 'core',
    edition: '5.5',
    creaturesFile: 'srd-creatures.json',
    spellsFile: 'srd-spells.json',
  },
  {
    id: 'srd-5.1',
    license: 'cc-by-4.0',
    label: 'Basic Rules 2014 (SRD 5.1)',
    shortLabel: 'Core',
    family: 'srd',
    group: 'core',
    edition: '5.0',
    creaturesFile: 'srd-2014-creatures.json',
    spellsFile: 'srd-2014-spells.json',
  },
  {
    id: 'kobold-press-tob',
    license: 'ogl-1.0a',
    label: 'Tome of Beasts 1 (Kobold Press)',
    shortLabel: 'ToB1',
    family: 'tob',
    group: 'other',
    edition: '5.0',
    creaturesFile: 'tob1-creatures.json',
  },
  {
    id: 'kobold-press-tob2',
    license: 'ogl-1.0a',
    label: 'Tome of Beasts 2 (Kobold Press)',
    shortLabel: 'ToB2',
    family: 'tob',
    group: 'other',
    edition: '5.0',
    creaturesFile: 'tob2-creatures.json',
  },
  {
    id: 'kobold-press-tob3',
    license: 'ogl-1.0a',
    label: 'Tome of Beasts 3 (Kobold Press)',
    shortLabel: 'ToB3',
    family: 'tob',
    group: 'other',
    edition: '5.0',
    creaturesFile: 'tob3-creatures.json',
  },
  {
    id: 'kobold-press-ccdx',
    license: 'ogl-1.0a',
    label: 'Creature Codex (Kobold Press)',
    shortLabel: 'CCdx',
    family: 'tob',
    group: 'other',
    edition: '5.0',
    creaturesFile: 'creature-codex-creatures.json',
  },
  {
    id: 'en-publishing-a5e-ag',
    license: 'cc-by-4.0',
    label: 'A5E SRD: Adventurer’s Guide spells',
    shortLabel: 'A5AG',
    family: 'en-publishing',
    group: 'other',
    ruleset: 'a5e',
    referenceOnly: true,
    spellsFile: 'a5e-srd-spells.json',
  },
  {
    id: 'kibblestasty-casting-compendium-v2.3',
    license: 'cc-by-4.0',
    label: 'Kibbles’ Casting Compendium v2.3',
    shortLabel: 'KCC',
    family: 'kibbles',
    group: 'other',
    edition: '5.0',
    referenceOnly: true,
    spellsFile: 'kibbles-casting-v23-spells.json',
  },
  {
    id: 'somanyrobots-spells-that-dont-suck',
    license: 'cc-by-4.0',
    label: 'Spells That Don’t Suck',
    shortLabel: 'STDS',
    family: 'somanyrobots',
    group: 'other',
    edition: '5.0',
    referenceOnly: true,
    spellsFile: 'spells-that-dont-suck-spells.json',
  },
  {
    id: 'somanyrobots-so-many-spells',
    license: 'cc-by-4.0',
    label: 'So Many Spells',
    shortLabel: 'SMS',
    family: 'somanyrobots',
    group: 'other',
    edition: '5.0',
    referenceOnly: true,
    spellsFile: 'so-many-spells-spells.json',
  },
  {
    id: 'openfray-brood-and-bloom',
    license: 'cc-by-4.0',
    label: 'Brood & Bloom',
    shortLabel: 'B&B',
    family: 'openfray',
    group: 'openfray',
    edition: '5.5',
    creaturesFile: 'brood-and-bloom-creatures.json',
    spellsFile: 'brood-and-bloom-spells.json',
    bookUrl: '/brood-and-bloom/',
  },
  {
    id: 'openfray-strong-waters',
    license: 'cc-by-4.0',
    label: 'On Strong Waters and Potent Simples',
    shortLabel: 'SW&PS',
    family: 'openfray',
    group: 'openfray',
    edition: '5.5',
    // No creatures: an apothecary's book ships spells and presets and no stat blocks.
    spellsFile: 'strong-waters-spells.json',
    bookUrl: '/strong-waters/',
  },
  {
    id: 'openfray-waking-garden',
    license: 'cc-by-4.0',
    label: 'The Waking Garden',
    shortLabel: 'TWG',
    family: 'openfray',
    group: 'openfray',
    edition: '5.5',
    creaturesFile: 'waking-garden-creatures.json',
    bookUrl: '/the-waking-garden/',
  },
]

/** Source-badge colors, keyed by family so sibling books share one (full class
 *  strings so Tailwind detects them). Unknown families fall back to neutral slate. */
const SOURCE_BADGE_CLASS: Record<string, string> = {
  srd: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
  tob: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  openfray: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
  'en-publishing': 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/50 dark:text-fuchsia-300',
  kibbles: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  somanyrobots: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300',
}
const SOURCE_BADGE_FALLBACK = 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'

/** Edition-badge colors, so 5.5 and 5.0 read distinctly (full class strings for Tailwind). */
const EDITION_BADGE_CLASS: Record<string, string> = {
  '5.5': 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  '5.0': 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
  a5e: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
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

/** Whether an item should show: homebrew (custom) content follows the show-homebrew
 *  preference; otherwise its source must be an enabled library. Defaults to showing
 *  homebrew, so callers that don't pass the flag keep the old always-show behavior. */
export function inEnabledLibrary(
  item: { id: string; source: string },
  enabled: string[],
  showHomebrew = true,
): boolean {
  if (item.id.startsWith('custom:')) return showHomebrew
  return enabled.includes(item.source)
}

/** Whether a source's spells are reference cards without reviewed automation. */
export function libraryReferenceOnly(source: string): boolean {
  return LIBRARIES.some((library) => library.id === source && library.referenceOnly)
}

/** Identify reference-only library templates without restricting user-authored copies. */
export function isReferenceOnlySpell(spell: { id: string; source: string }): boolean {
  return libraryReferenceOnly(spell.source) && !spell.id.startsWith('custom:')
}

/** The verified edition or distinct ruleset tag displayed on source reference cards. */
export function libraryTag(source: string): string | undefined {
  const library = LIBRARIES.find((l) => l.id === source)
  return library?.ruleset ?? library?.edition
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
  if (edition === 'a5e') return 'A5E'
  return edition
}
