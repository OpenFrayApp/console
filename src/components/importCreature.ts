// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Creature } from '../schema/creature.ts'
import { ABILITIES } from './customMonster.ts'

export interface ImportResult {
  creature?: Creature
  error?: string
}

/** Whether the value is a finite number. */
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
/** Whether the value is a non-blank string. */
const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''

/** Field names as the GM knows them — the raw keys mean nothing to a reader. */
const FIELD_LABELS: Record<string, string> = {
  name: 'a name',
  size: 'a size',
  type: 'a type',
  ac: 'an armor class',
  maxHp: 'hit points',
  speed: 'a speed',
  abilities: 'its six ability scores',
  passivePerception: 'a passive Perception',
}

/** Join missing-field labels into an English list ("a name, a size and hit points"). */
const listFields = (keys: string[]): string => {
  const named = keys.map((k) => FIELD_LABELS[k] ?? k)
  if (named.length === 1) return named[0]
  return `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}`
}

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
    return {
      error:
        'That text isn’t a creature. In the importer, click Copy JSON, then paste the whole thing here.',
    }
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { error: 'Paste one creature at a time — this looks like something else.' }
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
  if (!senses || !isNum(senses.passivePerception)) missing.push('passivePerception')

  if (missing.length) {
    return {
      error: `This creature is missing ${listFields(missing)}. Copy it again from the importer, or build it by hand instead.`,
    }
  }

  const creature: Creature = {
    ...(c as unknown as Creature),
    id: `custom:${crypto.randomUUID()}`,
    source: isStr(c.source) ? c.source : 'custom',
  }
  if (creature.edition !== '5.0' && creature.edition !== '5.5') delete creature.edition
  return { creature }
}
