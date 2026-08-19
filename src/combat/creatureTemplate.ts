// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { Creature } from '../schema/creature.ts'
import type { CreatureTemplate } from '../schema/creatureTemplate.ts'
import { TEMPLATE_LIMITS as LIMITS } from '../schema/encounterTemplate.ts'
import { projectCreature } from '../schema/creatureInput.ts'
import { bylineShapeError } from '../lib/byline.ts'
import { cleanLine, cleanProse } from '../lib/text.ts'

/**
 * Turning one creature into a shareable template, and reading one back.
 *
 * The read half is the part that matters: a shared creature arrives from a stranger's
 * browser, so nothing about its shape may be assumed. It reuses `projectCreature`, the same
 * door a creature inside a shared encounter comes through, rather than growing a second
 * idea of what a safe stat block is — one invariant beats two, and the two would drift.
 *
 * The limits are the encounter's. A creature is far smaller than an encounter, so those
 * bounds are generous here; one set of numbers is easier to reason about than two, and the
 * generous direction is the safe one to be wrong in.
 */

export interface ParsedCreature {
  template?: CreatureTemplate
  error?: string
}

const UNREADABLE = 'This creature can’t be read. Ask whoever shared it for a new link.'
const TOO_BIG = 'This creature is too big to open. Ask whoever shared it for a smaller one.'
const TOO_NEW = 'This creature was made with a newer version of the console than this one.'

/** A compendium id, shaped as one. Same rule the encounter template's refs are held to. */
const isRef = (v: unknown): v is string =>
  typeof v === 'string' &&
  v.length > 0 &&
  v.length <= 120 &&
  /^[A-Za-z0-9][A-Za-z0-9:._-]*$/.test(v)

/**
 * Build the template for one creature.
 *
 * A creature the recipient can resolve travels as its id; everything else is carried. The
 * test is the `custom:` namespace, which is what the console mints for homebrew and for a
 * library creature somebody has edited — both cases where there is nothing on the other
 * side to resolve against.
 */
export function creatureTemplate(
  creature: Creature,
  extras: { note?: string; by?: string } = {},
): CreatureTemplate {
  const shared = {
    ...(extras.note ? { note: extras.note } : {}),
    ...(extras.by ? { by: extras.by } : {}),
  }
  const named = { v: 1 as const, name: creature.name.slice(0, LIMITS.name), ...shared }
  return creature.id.startsWith('custom:') ? { ...named, creature } : { ...named, ref: creature.id }
}

/**
 * Read a shared creature back, refusing anything that isn't one.
 *
 * Rebuilt key by key onto a fresh object: nothing is spread from the input, so a field the
 * schema doesn't name cannot ride along into the reader's own library.
 */
export function parseCreatureTemplate(value: unknown): ParsedCreature {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { error: UNREADABLE }
  }
  const raw = value as Record<string, unknown>

  if (typeof raw.v === 'number' && raw.v > 1) return { error: TOO_NEW }

  // Exactly one way of naming the creature. Two would leave which one wins to the reader.
  const ways = [raw.ref, raw.creature].filter((v) => v !== undefined && v !== null).length
  if (ways !== 1) return { error: UNREADABLE }

  let creature: Creature | undefined
  let ref: string | undefined
  if (raw.ref !== undefined) {
    if (!isRef(raw.ref)) return { error: UNREADABLE }
    ref = raw.ref
  } else {
    const projected = projectCreature(raw.creature)
    // Null means a stat block missing what it takes to render, or one bigger than any is.
    if (!projected) {
      const size = JSON.stringify(raw.creature)?.length ?? 0
      return { error: size > LIMITS.creatureBytes ? TOO_BIG : UNREADABLE }
    }
    // A creature from somebody else is a new entity here, never an edit of one of ours: the
    // id is re-minted so it cannot collide with, or pass itself off as, a library entry the
    // reader already has.
    creature = { ...projected, id: `custom:${crypto.randomUUID()}`, source: 'custom' }
  }

  // Falls back to the creature's own name for a template published before the field
  // existed, and to a plain word for a `ref` share, which has no stat block to ask.
  const given = typeof raw.name === 'string' ? cleanLine(raw.name) : ''
  if (given.length > LIMITS.name) return { error: TOO_BIG }
  const name = given || creature?.name || 'Shared creature'

  const note = typeof raw.note === 'string' ? cleanProse(raw.note) : ''
  if (note.length > LIMITS.note) return { error: TOO_BIG }

  // A byline that breaks the rules is dropped, not fatal: the creature is what the reader
  // came for, and refusing the whole page over an attribution line would hand whoever wrote
  // it the power to break it. Shape only — whether the publisher was entitled to the name
  // is not something a reader can check, and running that test here would drop precisely
  // the bylines that were granted.
  const by = typeof raw.by === 'string' ? cleanLine(raw.by) : ''
  const byOk = by.length > 0 && bylineShapeError(by) === null

  return {
    template: {
      v: 1,
      name,
      ...(ref ? { ref } : {}),
      ...(creature ? { creature } : {}),
      ...(note ? { note } : {}),
      ...(byOk ? { by } : {}),
    },
  }
}
