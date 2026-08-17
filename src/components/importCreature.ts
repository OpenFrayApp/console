// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { Creature } from '../schema/creature.ts'
import { isStr, listFields, missingCreatureFields } from '../schema/creatureInput.ts'

export interface ImportResult {
  creature?: Creature
  error?: string
}

/**
 * Parse pasted JSON (e.g. from the D&D Beyond importer) into a library Creature.
 * Validates only the fields the app can't render without; the rest of the shape is
 * trusted, because this is the Game Master's own clipboard. (A creature arriving from
 * someone else — embedded in a shared encounter — goes through `projectCreature` instead,
 * which copies only the schema's own keys.) The id is always regenerated in the `custom:`
 * namespace so the import is an independent, editable entity (matching the custom-creature
 * form) — never colliding with or overwriting an existing creature.
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
  const missing = missingCreatureFields(c)
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
