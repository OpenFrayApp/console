// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Speeds } from '../schema/primitives.ts'
import type { Effect } from '../schema/effect.ts'

const MOVE_KEYS = ['walk', 'fly', 'swim', 'climb', 'burrow'] as const

/**
 * Speeds with the active `speed` effects folded in: flat deltas first, then any
 * halving, then a `'zero'` pins everything at 0 — each movement floors at 0. The
 * disease stages' "Speed −10 ft." is a number the board moves now, not a note.
 */
export function effectiveSpeeds(speed: Speeds, effects: Effect[]): Speeds {
  const mods = effects.flatMap((e) =>
    e.modifier?.applies === 'speed' && e.modifier.mode === 'flatBonus' ? [e.modifier.value] : [],
  )
  if (mods.length === 0) return speed
  const delta = mods.reduce<number>((sum, v) => (typeof v === 'number' ? sum + v : sum), 0)
  const halved = mods.includes('half')
  const zeroed = mods.includes('zero')
  const out: Speeds = { ...speed }
  for (const k of MOVE_KEYS) {
    const base = speed[k]
    if (typeof base !== 'number') continue
    if (zeroed) {
      out[k] = 0
      continue
    }
    const moved = Math.max(0, base + delta)
    out[k] = halved ? Math.floor(moved / 2) : moved
  }
  return out
}

const SPEED_LABEL: Record<(typeof MOVE_KEYS)[number], string> = {
  walk: 'Walk',
  fly: 'Fly',
  swim: 'Swim',
  climb: 'Climb',
  burrow: 'Burrow',
}

/** Speeds as display lines, e.g. ["Walk 40 ft.", "Fly 80 ft."]. */
export function speedLines(speed: Speeds): string[] {
  return MOVE_KEYS.filter((k) => typeof speed[k] === 'number').map(
    (k) => `${SPEED_LABEL[k]} ${speed[k] as number} ft.`,
  )
}

/**
 * Parse a free-text speed entry into structured speeds. The first bare number is
 * walking; a labelled token ("Climb 12") sets that movement; extra bare numbers
 * are ignored. e.g. "30" → walk 30; "30, Climb 12 ft" → walk 30 + climb 12;
 * "30, 15" → walk 30 (the second bare number is dropped).
 */
export function parseSpeedInput(input: string): Speeds {
  const out: Speeds = {}
  const tokens = input
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  tokens.forEach((token, i) => {
    const m = /^([a-zA-Z]+)?\s*(\d+)/.exec(token)
    if (!m) return
    const label = m[1]?.toLowerCase()
    const value = Number(m[2])
    if (label && (MOVE_KEYS as readonly string[]).includes(label)) {
      out[label as (typeof MOVE_KEYS)[number]] = value
    } else if (!label && i === 0) {
      out.walk = value
    }
  })
  return out
}
