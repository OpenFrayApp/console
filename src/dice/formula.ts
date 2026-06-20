// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { DamageType } from '../schema/primitives.ts'

/**
 * The formula grammar, parsed into a structured form the engine evaluates.
 *
 *   NdM              standard            2d6
 *   NdM+K / NdM-K    modifier            1d20+7, 10-1d4
 *   1d20adv/1d20dis  advantage/disadv    roll two, keep highest/lowest
 *   NdMkhX / NdMklX  keep highest/lowest  4d6kh3
 *   +1d4             additive sub-roll   1d8+1d4+3
 *   " fire"          trailing damage tag (metadata, not math)
 *
 * Exploding dice (`NdM!`) are in the grammar but deferred (homebrew); they parse
 * as an error for now.
 */

export type AdvantageState = 'normal' | 'advantage' | 'disadvantage'

export interface DiceTerm {
  kind: 'dice'
  sign: 1 | -1
  count: number
  sides: number
  /** Keep the highest/lowest N rolled dice. */
  keep?: { mode: 'kh' | 'kl'; n: number }
  /** adv/dis sugar, recorded so the roll result can report it. */
  advantage?: 'advantage' | 'disadvantage'
}

export interface FlatTerm {
  kind: 'flat'
  value: number
}

export type Term = DiceTerm | FlatTerm

export interface Formula {
  source: string
  terms: Term[]
  damageType?: DamageType
}

const DAMAGE_TYPES: ReadonlySet<string> = new Set<DamageType>([
  'acid',
  'bludgeoning',
  'cold',
  'fire',
  'force',
  'lightning',
  'necrotic',
  'piercing',
  'poison',
  'psychic',
  'radiant',
  'slashing',
  'thunder',
])

function diceTerm(
  sign: 1 | -1,
  countStr: string,
  sidesStr: string,
  suffix: string | undefined,
): DiceTerm {
  const sides = Number(sidesStr)
  const term: DiceTerm = {
    kind: 'dice',
    sign,
    count: countStr === '' ? 1 : Number(countStr),
    sides,
  }
  if (suffix === 'adv' || suffix === 'dis') {
    term.advantage = suffix === 'adv' ? 'advantage' : 'disadvantage'
    term.count = 2
    term.keep = { mode: suffix === 'adv' ? 'kh' : 'kl', n: 1 }
  } else if (suffix) {
    term.keep = { mode: suffix.slice(0, 2) as 'kh' | 'kl', n: Number(suffix.slice(2)) }
  }
  return term
}

/** Parse a dice formula string into structured terms. Throws on malformed input. */
export function parseFormula(input: string): Formula {
  const source = input.trim()
  let expr = source.toLowerCase()

  let damageType: DamageType | undefined
  const typeMatch = /\s+([a-z]+)$/.exec(expr)
  if (typeMatch && DAMAGE_TYPES.has(typeMatch[1])) {
    damageType = typeMatch[1] as DamageType
    expr = expr.slice(0, typeMatch.index)
  }
  expr = expr.replace(/\s+/g, '')
  if (expr === '') throw new Error(`Empty dice formula: "${source}"`)

  const terms: Term[] = []
  const re = /([+-]?)(?:(\d*)d(\d+)(adv|dis|kh\d+|kl\d+)?|(\d+))/y
  let pos = 0
  while (pos < expr.length) {
    re.lastIndex = pos
    const m = re.exec(expr)
    if (!m || m.index !== pos) {
      throw new Error(`Cannot parse "${source}" near "${expr.slice(pos)}"`)
    }
    const sign: 1 | -1 = m[1] === '-' ? -1 : 1
    if (m[5] !== undefined) {
      terms.push({ kind: 'flat', value: sign * Number(m[5]) })
    } else {
      terms.push(diceTerm(sign, m[2], m[3], m[4]))
    }
    pos = re.lastIndex
  }

  return { source, terms, damageType }
}
