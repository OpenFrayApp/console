// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Build a function that wraps cast-spell names in creature prose as
 * `[Name](spell:ref)` links, so the app can hover-preview them. SRD creatures get
 * these baked in at ingest; custom/imported creatures don't, so we link at render
 * time (mirrors `linkifyConditions`). Linking is scoped to a cast clause ("casts X,
 * Y, or Z") so spell-named common words elsewhere (a held "Shield", a dragon's "Fly
 * Speed") are left alone, and existing links are never rewritten — so it's safe to
 * run over already-baked SRD text too.
 */
export function makeSpellLinker(spells: { name: string; ref: string }[]): (text: string) => string {
  const refByLower = new Map(spells.map((s) => [s.name.toLowerCase(), s.ref]))
  // Longest names first so the alternation prefers "Mirror Image" over "Image".
  const names = [...new Set(spells.map((s) => s.name))]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
  if (names.length === 0) return (text) => text
  const spellAlt = `(?:${names.join('|')})`
  const det = `(?:the\\s+|an?\\s+)?` // an optional article before a spell ("casts the Mirror Image")
  // A cast verb, the first spell, then any spells chained on with ","/"or"/"and".
  const clauseRe = new RegExp(
    `\\b(?:casts?|casting)\\b\\s+${det}${spellAlt}\\b` +
      `(?:[,\\s]+(?:(?:or|and)\\s+)?${det}${spellAlt}\\b)*`,
    'gi',
  )
  // Within a cast clause: skip an existing markdown link (idempotent — baked SRD
  // prose is left as-is), otherwise link a bare spell name.
  const tokenRe = new RegExp(`(\\[[^\\]]*\\]\\([^)]*\\))|\\b${spellAlt}\\b`, 'gi')
  /** Wrap one spell name as a `spell:` markdown link; unknown names pass through unchanged. */
  const linkName = (name: string): string => {
    const ref = refByLower.get(name.toLowerCase())
    return ref ? `[${name}](spell:${ref})` : name
  }
  return (text) => {
    if (!text || !/\bcast(?:s|ing)?\b/i.test(text)) return text
    return text.replace(clauseRe, (clause) =>
      clause.replace(tokenRe, (whole, link: string | undefined) => (link ? link : linkName(whole))),
    )
  }
}
