// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Creature } from '../schema/creature.ts'
import { ABILITIES } from './customMonster.ts'

export interface ImportResult {
  creature?: Creature
  error?: string
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''

/**
 * Parse pasted JSON (e.g. from the D&D Beyond importer) into a library Creature.
 * Validates only the fields the app can't render without; the rest of the shape is
 * trusted. The id is always regenerated in the `custom:` namespace so the import is
 * an independent, editable entity (matching the custom-creature form) — never
 * colliding with or overwriting an existing creature.
 */
export function parseImportedCreature(text: string): ImportResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { error: 'That isn’t valid JSON.' }
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { error: 'Expected a single creature object.' }
  }

  const c = raw as Record<string, unknown>
  const abilities = c.abilities as Record<string, unknown> | undefined
  const senses = c.senses as Record<string, unknown> | undefined
  const missing: string[] = []
  if (!isStr(c.name)) missing.push('name')
  if (!isStr(c.size)) missing.push('size')
  if (!isStr(c.type)) missing.push('type')
  if (!isNum(c.ac)) missing.push('ac')
  if (!isNum(c.maxHp)) missing.push('maxHp')
  if (typeof c.speed !== 'object' || c.speed === null) missing.push('speed')
  if (!abilities || ABILITIES.some((a) => !isNum(abilities[a]))) missing.push('abilities')
  if (!senses || !isNum(senses.passivePerception)) missing.push('senses.passivePerception')

  if (missing.length) {
    return { error: `Missing or invalid field${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.` }
  }

  const creature: Creature = {
    ...(c as unknown as Creature),
    id: `custom:${crypto.randomUUID()}`,
    source: isStr(c.source) ? c.source : 'custom',
  }
  if (creature.edition !== '5.0' && creature.edition !== '5.5') delete creature.edition
  return { creature }
}
