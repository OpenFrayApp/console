// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { Ability } from './primitives.ts'
import type { Creature } from './creature.ts'
import { TEMPLATE_LIMITS } from './encounterTemplate.ts'

/**
 * Reading a Creature that came from outside the app: pasted from the importer, or embedded
 * in a shared encounter. Both need the same question answered — does this have the fields
 * the app can't render without? — so it is asked in one place.
 *
 * The two callers differ in how much they trust the rest of the shape, which is the whole
 * reason `projectCreature` exists. A Game Master pasting their own JSON gets the benefit of
 * the doubt on fields we don't check; a stranger's creature arriving over a link does not,
 * because whatever we accept ends up in the recipient's own autosaved encounter.
 */

const ABILITY_KEYS: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

/** Whether the value is a finite number. */
export const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
/** Whether the value is a non-blank string. */
export const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''

/** Field names as the Game Master knows them — the raw keys mean nothing to a reader. */
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
export const listFields = (keys: string[]): string => {
  const named = keys.map((k) => FIELD_LABELS[k] ?? k)
  if (named.length === 1) return named[0]
  return `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}`
}

/**
 * The fields the app can't render a stat block without, missing from this value. An empty
 * list means it's renderable; it does not mean every other field is sound.
 */
export function missingCreatureFields(value: unknown): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return ['name']
  const c = value as Record<string, unknown>
  const abilities = c.abilities as Record<string, unknown> | undefined
  const senses = c.senses as Record<string, unknown> | undefined
  const missing: string[] = []
  if (!isStr(c.name)) missing.push('name')
  if (!isStr(c.size)) missing.push('size')
  if (!isStr(c.type)) missing.push('type')
  if (!isNum(c.ac)) missing.push('ac')
  if (!isNum(c.maxHp)) missing.push('maxHp')
  if (typeof c.speed !== 'object' || c.speed === null) missing.push('speed')
  if (!abilities || ABILITY_KEYS.some((a) => !isNum(abilities[a]))) missing.push('abilities')
  if (!senses || !isNum(senses.passivePerception)) missing.push('passivePerception')
  return missing
}

/**
 * Every key the Creature schema defines. A creature from a stranger is copied key by key
 * from this list, so anything else — a `__proto__`, a payload hidden in a field we don't
 * know, sixty kilobytes of nothing — is dropped rather than carried onto a board and saved
 * to an account.
 *
 * Keep this in step with `schema/creature.ts`. A field missing here is a field that
 * silently stops travelling in a shared encounter, which is the safe direction to fail.
 */
const CREATURE_KEYS = [
  'id',
  'source',
  'edition',
  'sourcePage',
  'name',
  'size',
  'type',
  'alignment',
  'description',
  'ac',
  'maxHp',
  'hpFormula',
  'initiative',
  'speed',
  'abilities',
  'saves',
  'skills',
  'senses',
  'languages',
  'resistances',
  'immunities',
  'vulnerabilities',
  'conditionImmunities',
  'gear',
  'cr',
  'xp',
  'xpLair',
  'traits',
  'actions',
  'bonusActions',
  'reactions',
  'legendaryActions',
  'lairActions',
  'spellcasting',
  'limitedUse',
  'legendaryResistance',
  'legendaryResistanceLair',
] as const satisfies readonly (keyof Creature)[]

/**
 * Whether a value is shallow enough, small enough and plain enough to be part of a stat
 * block. Depth, array length and string length are bounded because a stat block is a
 * shallow, small thing; anything past those bounds is broken or hostile, and either way
 * we don't want it in the recipient's saved encounter.
 */
function isPlainEnough(value: unknown, depth = 0): boolean {
  if (depth > TEMPLATE_LIMITS.depth) return false
  if (value === null) return true
  switch (typeof value) {
    case 'string':
      return value.length <= TEMPLATE_LIMITS.textChars
    case 'number':
      return Number.isFinite(value)
    case 'boolean':
      return true
    case 'object': {
      if (Array.isArray(value)) {
        return (
          value.length <= TEMPLATE_LIMITS.arrayItems &&
          value.every((item) => isPlainEnough(item, depth + 1))
        )
      }
      const entries = Object.entries(value as Record<string, unknown>)
      if (entries.length > TEMPLATE_LIMITS.arrayItems) return false
      // A key named for the prototype chain never appears in a stat block, and copying one
      // onto an object is the whole trick — refuse the value rather than filtering the key.
      return entries.every(
        ([key, v]) =>
          key !== '__proto__' &&
          key !== 'constructor' &&
          key !== 'prototype' &&
          isPlainEnough(v, depth + 1),
      )
    }
    default:
      // undefined, function, symbol, bigint — nothing JSON produces.
      return false
  }
}

/**
 * Copy a creature from outside the app onto the schema's own keys, dropping everything
 * else. Returns null when a value is missing the fields a stat block needs, or carries a
 * structure too deep, too wide or too long to be one.
 *
 * The result is a fresh object built key by key — never a spread of the input — so a
 * `__proto__` in attacker JSON has nothing to attach to.
 */
export function projectCreature(value: unknown): Creature | null {
  if (missingCreatureFields(value).length > 0) return null
  const raw = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const key of CREATURE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(raw, key)) continue
    const v = raw[key]
    if (v === undefined) continue
    if (!isPlainEnough(v)) return null
    out[key] = v
  }
  return out as unknown as Creature
}
