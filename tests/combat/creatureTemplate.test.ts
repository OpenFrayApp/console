// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { describe, expect, it } from 'vitest'
import type { Creature } from '../../src/schema/creature.ts'
import { creatureTemplate, parseCreatureTemplate } from '../../src/combat/creatureTemplate.ts'

/**
 * A shared creature arrives from a stranger's browser and ends up in the reader's own
 * library, so the parser is the whole of what stands between the two. What is pinned here
 * is the shape of what may cross, not the wording of any refusal.
 */

const creature = (over: Partial<Creature> = {}): Creature =>
  ({
    id: 'srd-5.2:goblin',
    source: 'srd-5.2',
    name: 'Goblin',
    size: 'Small',
    type: 'humanoid',
    ac: 15,
    maxHp: 7,
    speed: { walk: 30 },
    abilities: { str: 8, dex: 15, con: 10, int: 10, wis: 8, cha: 8 },
    senses: { passivePerception: 9 },
    ...over,
  }) as Creature

describe('building the template', () => {
  it('sends a library creature as a reference, not as its text', () => {
    // A few hundred bytes against several kilobytes, and the reader's own compendium stays
    // authoritative — a stat block corrected next month is corrected for them too.
    const t = creatureTemplate(creature())
    expect(t.ref).toBe('srd-5.2:goblin')
    expect(t.creature).toBeUndefined()
  })

  it('carries homebrew whole, since there is nothing to resolve it against', () => {
    const own = creature({ id: 'custom:1', source: 'custom', name: 'Pale Nurse' })
    const t = creatureTemplate(own)
    expect(t.ref).toBeUndefined()
    expect(t.creature?.name).toBe('Pale Nurse')
  })

  it('carries the note and the byline when there are any, and nothing when not', () => {
    expect(creatureTemplate(creature())).toEqual({
      v: 1,
      name: 'Goblin',
      ref: 'srd-5.2:goblin',
    })
    const t = creatureTemplate(creature(), { note: 'Runs at half hit points.', by: 'Bob' })
    expect(t.note).toBe('Runs at half hit points.')
    expect(t.by).toBe('Bob')
  })
})

describe('reading one back', () => {
  it('accepts a reference and a carried creature, and never both at once', () => {
    // Two ways of naming it would leave which one wins to whoever wrote the payload.
    expect(parseCreatureTemplate({ v: 1, ref: 'srd-5.2:goblin' }).template?.ref).toBe(
      'srd-5.2:goblin',
    )
    expect(parseCreatureTemplate({ v: 1, creature: creature() }).template).toBeTruthy()
    expect(
      parseCreatureTemplate({ v: 1, ref: 'srd-5.2:goblin', creature: creature() }).error,
    ).toBeTruthy()
    expect(parseCreatureTemplate({ v: 1 }).error).toBeTruthy()
  })

  it('re-mints a carried creature into the custom namespace', () => {
    // So it cannot collide with, or pass itself off as, a library entry the reader has.
    const { template } = parseCreatureTemplate({
      v: 1,
      creature: creature({ id: 'srd-5.2:goblin', source: 'srd-5.2' }),
    })
    expect(template!.creature!.id.startsWith('custom:')).toBe(true)
    expect(template!.creature!.source).toBe('custom')
  })

  it('keeps what the creature says about itself', () => {
    const { template } = parseCreatureTemplate({
      v: 1,
      creature: creature({ derivedFrom: 'srd-5.2:goblin', license: 'cc-by-sa-4.0' }),
    })
    expect(template!.creature).toMatchObject({
      derivedFrom: 'srd-5.2:goblin',
      license: 'cc-by-sa-4.0',
    })
  })

  it('names the share without opening the payload, even when it is only a reference', () => {
    // A list of links selects this one field; a `ref` share has no stat block to take a
    // name from, which is why it is copied in at publish time rather than read out.
    expect(
      parseCreatureTemplate({ v: 1, ref: 'srd-5.2:goblin', name: 'Goblin' }).template?.name,
    ).toBe('Goblin')
    // Published before the field existed: the carried creature still answers for it.
    expect(parseCreatureTemplate({ v: 1, creature: creature() }).template?.name).toBe('Goblin')
    // And a reference with neither falls back to a word rather than an empty row.
    expect(parseCreatureTemplate({ v: 1, ref: 'srd-5.2:goblin' }).template?.name).toBe(
      'Shared creature',
    )
  })

  it('refuses a payload that isn’t a creature template at all', () => {
    for (const junk of [null, 'a string', 42, [], { v: 1, ref: '' }, { v: 1, ref: '../etc' }]) {
      expect(parseCreatureTemplate(junk).error, JSON.stringify(junk)).toBeTruthy()
    }
  })

  it('refuses one from a newer console rather than reading half of it', () => {
    expect(parseCreatureTemplate({ v: 2, ref: 'srd-5.2:goblin' }).error).toMatch(/newer version/)
  })

  it('drops an unusable byline instead of refusing the creature', () => {
    // The stat block is what the reader came for. Refusing the page over an attribution
    // line would hand whoever wrote it the power to break it.
    const { template, error } = parseCreatureTemplate({
      v: 1,
      ref: 'srd-5.2:goblin',
      by: '<script>alert(1)</script>',
    })
    expect(error).toBeUndefined()
    expect(template!.by).toBeUndefined()
  })

  it('carries nothing the schema does not name', () => {
    const { template } = parseCreatureTemplate({
      v: 1,
      ref: 'srd-5.2:goblin',
      note: 'Fine.',
      somethingElse: { deeply: { nested: true } },
    })
    expect(Object.keys(template!).sort()).toEqual(['name', 'note', 'ref', 'v'])
  })
})
