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
 * The SRD parenthetical after the CR, e.g. "(XP 15,000, or 18,000 in lair; PB +5)".
 * In a creature's lair (`inLair`), the lair XP becomes the headline value.
 */
export function crDetail(
  c: { cr?: number; xp?: number; xpLair?: number },
  inLair = false,
): string {
  const parts: string[] = []
  if (c.xp != null) {
    const headline = inLair && c.xpLair != null ? c.xpLair : c.xp
    const alt = inLair && c.xpLair != null ? c.xp : c.xpLair
    parts.push(
      `XP ${headline.toLocaleString('en-US')}` +
        (alt != null ? `, or ${alt.toLocaleString('en-US')} ${inLair ? 'out of lair' : 'in lair'}` : ''),
    )
  }
  if (c.cr != null) parts.push(`PB +${proficiencyBonus(c.cr)}`)
  return parts.length ? ` (${parts.join('; ')})` : ''
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
    case 'custom':
      return { ruleset: 'Custom (you)' }
    default:
      return { ruleset: source }
  }
}
