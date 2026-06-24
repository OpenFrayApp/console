// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import { parseImportedCreature } from '../../src/components/importCreature.ts'

const valid = {
  id: 'ddb-import:goblin',
  source: 'Monster Manual (2024)',
  edition: '5.5',
  name: 'Goblin',
  size: 'Small',
  type: 'humanoid',
  ac: 15,
  maxHp: 7,
  speed: { walk: 30 },
  abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
  senses: { passivePerception: 9 },
}

describe('parseImportedCreature', () => {
  it('accepts a valid creature, re-ids into the custom: namespace, keeps source', () => {
    const { creature, error } = parseImportedCreature(JSON.stringify(valid))
    expect(error).toBeUndefined()
    expect(creature).toBeDefined()
    expect(creature!.id.startsWith('custom:')).toBe(true)
    expect(creature!.id).not.toBe('ddb-import:goblin')
    expect(creature!.source).toBe('Monster Manual (2024)')
    expect(creature!.name).toBe('Goblin')
    expect(creature!.edition).toBe('5.5')
  })

  it('gives every import a fresh, independent id', () => {
    const a = parseImportedCreature(JSON.stringify(valid)).creature!
    const b = parseImportedCreature(JSON.stringify(valid)).creature!
    expect(a.id).not.toBe(b.id)
  })

  it('rejects invalid JSON', () => {
    expect(parseImportedCreature('{ not json').error).toMatch(/valid JSON/i)
  })

  it('rejects a non-object (array)', () => {
    expect(parseImportedCreature('[]').error).toMatch(/single creature/i)
  })

  it('reports the missing required fields', () => {
    const partial = { ...valid } as Record<string, unknown>
    delete partial.ac
    delete partial.abilities
    const { creature, error } = parseImportedCreature(JSON.stringify(partial))
    expect(creature).toBeUndefined()
    expect(error).toMatch(/ac/)
    expect(error).toMatch(/abilities/)
  })

  it('drops an unrecognized edition rather than passing it through', () => {
    const { creature } = parseImportedCreature(JSON.stringify({ ...valid, edition: '3.5' }))
    expect(creature!.edition).toBeUndefined()
  })

  it('carries an optional description through', () => {
    const { creature } = parseImportedCreature(
      JSON.stringify({ ...valid, description: 'Ancient lore from the book.' }),
    )
    expect(creature!.description).toBe('Ancient lore from the book.')
  })

  it('falls back to a generic source when none is given', () => {
    const partial = { ...valid } as Record<string, unknown>
    delete partial.source
    const { creature } = parseImportedCreature(JSON.stringify(partial))
    expect(creature!.source).toBe('custom')
  })
})
