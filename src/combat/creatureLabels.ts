// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { Combatant, MonsterCombatant } from '../schema/combatant.ts'
import { isAutoLabel } from './combatant.ts'

export type CreatureLabelStyle = 'numeric' | 'roman' | 'letters'

/** Format a positive creature ordinal in the selected style. */
export function creatureSuffix(ordinal: number, style: CreatureLabelStyle): string {
  if (style === 'numeric') return String(ordinal)
  let result = ''
  if (style === 'letters') {
    while (ordinal > 0) {
      ordinal--
      result = String.fromCharCode(65 + (ordinal % 26)) + result
      ordinal = Math.floor(ordinal / 26)
    }
    return result
  }
  for (const [value, symbol] of [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ] as const) {
    while (ordinal >= value) {
      result += symbol
      ordinal -= value
    }
  }
  return result
}

/** Recover a generated ordinal, including numeric labels from older encounters. */
function ordinalOf(c: MonsterCombatant): number {
  if (c.autoLabel && Number.isSafeInteger(c.autoLabel.ordinal) && c.autoLabel.ordinal > 0) {
    return c.autoLabel.ordinal
  }
  if (c.autoLabel === null || c.label === c.creature.name || !isAutoLabel(c.label, c.creature.name))
    return 1
  const ordinal = Number(c.label.slice(c.creature.name.length + 1))
  return Number.isSafeInteger(ordinal) && ordinal > 0 ? ordinal : 1
}

/** Assign a generated label while keeping its ordinal independent of its spelling. */
function labeled(
  c: MonsterCombatant,
  ordinal: number,
  style: CreatureLabelStyle,
): MonsterCombatant {
  const label = `${c.creature.name} ${creatureSuffix(ordinal, style)}`
  return { ...c, label, autoLabel: { ordinal, label } }
}

/** Append an eligible creature, labeling its first copy only when another arrives. */
export function appendLabeledCreature(
  existing: readonly Combatant[],
  incoming: Combatant,
  style: CreatureLabelStyle,
): Combatant[] {
  if (incoming.isPC) return [...existing, incoming]
  const siblings = existing.filter(
    (c): c is MonsterCombatant => !c.isPC && c.creatureId === incoming.creatureId,
  )
  const automatic = isAutoLabel(incoming.label, incoming.creature.name, incoming.autoLabel)
  if (siblings.length === 0) {
    return [
      ...existing,
      automatic ? { ...incoming, label: incoming.creature.name, autoLabel: undefined } : incoming,
    ]
  }
  const used = new Set(siblings.map((c) => c.label))
  if (!automatic) used.add(incoming.label)

  /** Reserve a free label without changing any existing labeled creature. */
  const reserve = (c: MonsterCombatant, ordinal: number): MonsterCombatant => {
    let result = labeled(c, ordinal, style)
    while (used.has(result.label)) result = labeled(c, ++ordinal, style)
    used.add(result.label)
    return result
  }

  let highest = Math.max(siblings.length, ...siblings.map(ordinalOf))
  const combatants = existing.map((c) => {
    if (
      c.isPC ||
      c.creatureId !== incoming.creatureId ||
      c.label !== c.creature.name ||
      !isAutoLabel(c.label, c.creature.name, c.autoLabel)
    )
      return c
    const result = reserve(c, ordinalOf(c))
    highest = Math.max(highest, result.autoLabel!.ordinal)
    return result
  })
  return [...combatants, automatic ? reserve(incoming, highest + 1) : incoming]
}
