// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { Creature } from '../schema/creature.ts'
import {
  isStr,
  listFields,
  missingCreatureFields,
  projectCreature,
} from '../schema/creatureInput.ts'

export interface ImportResult {
  creature?: Creature
  error?: string
}

/** What we'll read before parsing it. A stat block is a few kilobytes; this is generous. */
const MAX_PASTE = 256 * 1024

/**
 * Parse pasted JSON (e.g. from the D&D Beyond importer) into a library Creature.
 *
 * This goes through the same `projectCreature` as a creature embedded in a shared link: a
 * stat block gets pasted out of a forum as readily as out of a converter, and one invariant
 * beats two paths. The cost is that a field the schema doesn't name no longer survives the
 * paste — nothing read them, but they used to sit in the saved creature.
 *
 * The id is always regenerated in the `custom:` namespace so the import is an independent,
 * editable entity, never colliding with or overwriting an existing creature.
 */
export function parseImportedCreature(text: string): ImportResult {
  // Before `JSON.parse`, so a pathological paste can't spike memory to be rejected after.
  if (text.length > MAX_PASTE) {
    return { error: 'That’s far larger than a stat block. Paste one creature on its own.' }
  }

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

  // Past the required fields, null means a stat block bigger than any the app ships, or
  // numbers so far out of range there is nothing left to render.
  const projected = projectCreature(c)
  if (!projected) {
    return {
      error:
        'This creature has values the console can’t read. Check its numbers, or build it by hand instead.',
    }
  }

  const creature: Creature = {
    ...projected,
    id: `custom:${crypto.randomUUID()}`,
    source: isStr(c.source) ? c.source : 'custom',
  }
  if (creature.edition !== '5.0' && creature.edition !== '5.5') delete creature.edition
  return { creature }
}
