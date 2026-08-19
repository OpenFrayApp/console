// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

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
    expect(parseImportedCreature('{ not json').error).toMatch(/isn’t a creature/i)
  })

  it('rejects a non-object (array)', () => {
    expect(parseImportedCreature('[]').error).toMatch(/one creature at a time/i)
  })

  it('names the missing fields the way the GM knows them', () => {
    const partial = { ...valid } as Record<string, unknown>
    delete partial.ac
    delete partial.abilities
    const { creature, error } = parseImportedCreature(JSON.stringify(partial))
    expect(creature).toBeUndefined()
    expect(error).toMatch(/armor class/)
    expect(error).toMatch(/ability scores/)
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

  /**
   * A paste now goes through the same `projectCreature` as a creature embedded in a shared
   * link. `tests/combat/untrustedInput.test.ts` fuzzes both doors; these are the things a
   * Game Master would notice about the change.
   */
  describe('holds a paste to the same bar as a stranger’s creature', () => {
    it('no longer carries fields the schema doesn’t name', () => {
      const { creature } = parseImportedCreature(
        JSON.stringify({ ...valid, homebrewNotes: 'from the forum', ddbId: 17, extra: { a: 1 } }),
      )
      // Nothing read them, so nothing displayed them — but they used to sit in the saved
      // creature, and now they don't.
      expect(Object.prototype.hasOwnProperty.call(creature!, 'homebrewNotes')).toBe(false)
      expect(Object.prototype.hasOwnProperty.call(creature!, 'ddbId')).toBe(false)
      expect(Object.prototype.hasOwnProperty.call(creature!, 'extra')).toBe(false)
    })

    it('repairs the numbers that would otherwise break a roll, and keeps the creature', () => {
      const { creature, error } = parseImportedCreature(
        JSON.stringify({
          ...valid,
          hpFormula: '4000d20',
          saves: { dex: 'a lot', con: 2 },
          actions: [
            {
              id: 'scimitar',
              name: 'Scimitar',
              kind: 'melee',
              toHit: '+4',
              damage: [{ formula: '1d6+2', type: 'slashing' }],
            },
          ],
        }),
      )
      expect(error).toBeUndefined()
      expect(creature!.name).toBe('Goblin')
      expect(creature!.hpFormula).toBeUndefined()
      expect(creature!.saves).toEqual({ con: 2 })
      expect(creature!.actions![0].toHit).toBeNull()
      // The half that was fine is still fine — a repair, not a refusal.
      expect(creature!.actions![0].damage).toEqual([{ formula: '1d6+2', type: 'slashing' }])
    })

    it('refuses a paste too large to be a stat block, and says which problem it is', () => {
      const huge = JSON.stringify({ ...valid, description: 'x'.repeat(400_000) })
      expect(parseImportedCreature(huge).error).toMatch(/larger than a stat block/)
      // Under the read limit but past what any shipped stat block runs to: a different
      // sentence, because "paste less" isn't the advice for it.
      const fat = JSON.stringify({
        ...valid,
        traits: Array.from({ length: 20 }, (_, i) => ({ name: `t${i}`, text: 'x'.repeat(3000) })),
      })
      expect(parseImportedCreature(fat).error).toMatch(/values the console can’t read/)
    })
  })
})
