// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Senses } from '../schema/primitives.ts'

/** Senses as a single line, e.g. "Darkvision 60 ft., Passive Perception 14". */
export function formatSenses(senses: Senses): string {
  const parts: string[] = []
  if (senses.darkvision) parts.push(`Darkvision ${senses.darkvision} ft.`)
  if (senses.blindsight) parts.push(`Blindsight ${senses.blindsight} ft.`)
  if (senses.tremorsense) parts.push(`Tremorsense ${senses.tremorsense} ft.`)
  if (senses.truesight) parts.push(`Truesight ${senses.truesight} ft.`)
  parts.push(`Passive Perception ${senses.passivePerception}`)
  return parts.join(', ')
}

/** Title-case a field stored lowercase (creature type / alignment) for display,
 *  e.g. "lawful evil" → "Lawful Evil", "dragon" → "Dragon". */
export const titleCase = (s: string): string => s.replace(/\b\w/g, (c) => c.toUpperCase())

/**
 * Capitalize the first letter of each comma-separated segment, leaving the rest of
 * each segment untouched. Display-only normalization for source data that arrives
 * lowercased (e.g. ToB3 defenses "radiant, blinded" → "Radiant, Blinded", a language
 * line "understands Abyssal but can't speak" → "Understands Abyssal but can't speak").
 * Proper nouns and mid-phrase words keep their own casing — unlike `titleCase`.
 */
export function capitalizeSegments(value: string | undefined): string | undefined {
  if (!value) return value
  return value
    .split(', ')
    .map((s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s))
    .join(', ')
}

/** Display a challenge rating, rendering fractional CRs as fractions. */
export function formatCr(cr: number | undefined): string {
  if (cr == null) return '—'
  if (cr === 0.125) return '1/8'
  if (cr === 0.25) return '1/4'
  if (cr === 0.5) return '1/2'
  return String(cr)
}

/** Proficiency bonus for a challenge rating (2024 table). */
export function proficiencyBonus(cr: number): number {
  if (cr <= 4) return 2
  return 3 + Math.floor((Math.min(cr, 28) - 5) / 4) + (cr >= 29 ? 1 : 0)
}

/**
 * The parenthetical after the CR. The **reference** view (compendium) gives the
 * full SRD detail — "(XP 15,000, or 18,000 in lair; PB +5)". The **combat** view is
 * stripped to just the XP that applies right now (the lair value when `inLair`); PB
 * isn't needed at the table.
 */
export function crDetail(
  c: { cr?: number; xp?: number; xpLair?: number },
  opts: { inLair?: boolean; combat?: boolean } = {},
): string {
  const { inLair = false, combat = false } = opts
  if (combat) {
    const xp = inLair && c.xpLair != null ? c.xpLair : c.xp
    return xp != null ? ` (XP ${xp.toLocaleString('en-US')})` : ''
  }
  const parts: string[] = []
  if (c.xp != null) {
    parts.push(
      `XP ${c.xp.toLocaleString('en-US')}` +
        (c.xpLair != null ? `, or ${c.xpLair.toLocaleString('en-US')} in lair` : ''),
    )
  }
  if (c.cr != null) parts.push(`PB +${proficiencyBonus(c.cr)}`)
  return parts.length ? ` (${parts.join('; ')})` : ''
}

/**
 * The standard legendary-actions explanation, name-free and count-dynamic, shown
 * under the section header for GMs who want the reminder. 2014 wording notes that
 * some options cost more than one use; 2024 relies on per-action "(Costs N)" labels.
 */
export function legendaryPreamble(edition?: '5.0' | '5.5'): string {
  if (edition === '5.0') {
    return 'This creature can take the legendary actions below, choosing from the options shown. Only one can be used at a time and only at the end of another creature’s turn, and some cost more than one use. It regains spent uses at the start of its turn.'
  }
  return 'Immediately after another creature’s turn, this creature can expend a use to take one of the following actions. It regains all expended uses at the start of each of its turns.'
}

export interface SourceInfo {
  /** Which ruleset the content is from, e.g. "Core Rules 2024 (SRD 5.2)". */
  ruleset: string
  /** Content license, e.g. "CC-BY-4.0"; absent for user-authored content. */
  license?: string
  /** Link to the source/attribution page. */
  url?: string
}

/** Ruleset + license + link for a content source (see CREDITS.md for attribution). */
export function sourceInfo(source: string): SourceInfo {
  switch (source) {
    case 'srd-5.2':
      return {
        ruleset: 'Core Rules 2024 (SRD 5.2.1)',
        license: 'CC-BY-4.0',
        url: 'https://www.dndbeyond.com/srd',
      }
    case 'srd-5.1':
      return {
        ruleset: 'Core Rules 2014 (SRD 5.1)',
        license: 'CC-BY-4.0',
        url: 'https://www.dndbeyond.com/srd',
      }
    case 'kobold-press-tob3':
      return {
        ruleset: 'Tome of Beasts 3',
        license: 'OGL-1.0a',
        url: 'https://koboldpress.com',
      }
    case 'custom':
      return { ruleset: 'Custom (you)' }
    default:
      return { ruleset: source }
  }
}
