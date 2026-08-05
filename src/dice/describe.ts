// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { RollResult } from './roll.ts'

/**
 * A one-line breakdown of a roll. Each die group reads `NdM [v, v, …]`; when dice
 * are dropped (advantage / keep-highest) the kept ones follow as `→ k`.
 */
export function describeRoll(result: RollResult): string {
  const dice = result.dice.map((g) => {
    const head = `${g.sign < 0 ? '−' : ''}${g.results.length}d${g.sides}`
    const rolls = `[${g.results.join(', ')}]`
    const base =
      g.results.length === g.kept.length
        ? `${head} ${rolls}`
        : `${head} ${rolls} → ${g.kept.join(', ')}`
    // A crit rule (maximised normal dice, or a doubled total) adds to this group
    // beyond the kept dice — surface it so the breakdown reconciles with the total.
    const keptSum = g.sign * g.kept.reduce((a, b) => a + b, 0)
    const critBonus = g.total - keptSum
    return critBonus === 0
      ? base
      : `${base} ${critBonus >= 0 ? '+' : '−'}${Math.abs(critBonus)} crit`
  })
  // Built as segments rather than appended to a string: the shared player view hands
  // this a roll with no dice and no modifier, and a string built by appending would
  // come back leading with its own separator.
  const arithmetic = dice.join(' + ')
  // Each flat modifier on its own — a creature's own +1 alongside an effect's −6 reads
  // as "+1 -6", where the sum alone would say -5 and hide where it came from.
  const flats = (result.modifiers ?? (result.modifier ? [result.modifier] : []))
    .filter((m) => m !== 0)
    .map((m) => (m >= 0 ? `+${m}` : `${m}`))
    .join(' ')
  const withModifier = arithmetic && flats ? `${arithmetic} ${flats}` : arithmetic
  const segments = [withModifier]
  if (result.advantageState !== 'normal') segments.push(result.advantageState)
  if (result.crit) segments.push('CRIT')
  if (result.fumble) segments.push('FUMBLE')
  return segments.filter(Boolean).join(' · ')
}

/**
 * The dice behind each damage component — the working under a line that already gives
 * the totals. One component needs no label, since the line above it names the only
 * damage there was; several are each led by their own, or the dice would be a column of
 * numbers with nothing saying which was which. A component with no roll behind it — a
 * stat block that simply reads "1 piercing damage" — contributes no line, having
 * nothing to show.
 */
export function describeDamageWorking(
  damage: { type: string; amount: number; result?: RollResult }[],
): string[] {
  const rolled = damage.filter((d) => d.result)
  return rolled.map((d) =>
    rolled.length === 1
      ? describeRoll(d.result as RollResult)
      : `${d.amount} ${d.type} · ${describeRoll(d.result as RollResult)}`,
  )
}
