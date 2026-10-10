// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import type { Spell } from '../../src/schema/spell.ts'
import { LIBRARIES } from '../../src/compendium/libraries.ts'
import { damageVariants, spellAction } from '../../src/combat/casting.ts'
import {
  delayedDamageEffect,
  isSupportSpell,
  spellEffectFor,
} from '../../src/combat/spellEffects.ts'

const BLESS: Spell = {
  id: 'srd:bless',
  name: 'Bless',
  source: 'srd-5.2',
  level: 1,
  school: 'Enchantment',
  castingTime: '1 action',
  range: '30 feet',
  components: { verbal: true, somatic: true, material: false },
  duration: '1 minute',
  concentration: true,
  ritual: false,
  text: 'Reference test.',
  mechanics: { attackRoll: true, damage: [{ formula: '1d6', type: 'radiant' }] },
}

describe('reference-only spell isolation', () => {
  it.each([
    [
      'deep-magic-2020-spells.json',
      503,
      '6ea27875af39266eaec4b445289204a657a411b97feee31314fe65c9eaa6ff85',
    ],
    [
      'tome-of-heroes-spells.json',
      90,
      '0dfd2cd8ddc8faf579766f7529627ea523fdf4f284fd01649405d4e673fed53d',
    ],
    [
      'kibbles-casting-v23-spells.json',
      295,
      '90f5320602e298fdba46b7fa0030bf4d6e2212faf3dc8e7d0d56396eec42a946',
    ],
    [
      'spells-that-dont-suck-spells.json',
      181,
      '5c61b4c7196f9c17ddd9cc29c510e6e789588d2593342eee256d4d96e4f7cec2',
    ],
    [
      'so-many-spells-spells.json',
      179,
      '075c612fadfb7350e0b6f1872230cebd6cbd3223a352ecbccabfd8b2e76dbd67',
    ],
  ] as const)('ships the approved %s snapshot', (file, count, sha256) => {
    const spells = JSON.parse(
      readFileSync(new URL(`../../public/compendium/${file}`, import.meta.url), 'utf8'),
    ) as Spell[]
    expect(spells).toHaveLength(count)
    expect(spells.every((spell) => spell.edition === '5.0')).toBe(true)
    expect(createHash('sha256').update(JSON.stringify(spells)).digest('hex')).toBe(sha256)
  })

  it('ships the complete source-verified Tome of Heroes copyright chain and OGC designation', () => {
    const credits = readFileSync(new URL('../../CREDITS.md', import.meta.url), 'utf8')
    const chain = credits
      .split('#### Tome of Heroes Section 15 copyright chain')[1]
      ?.split('END OF LICENSE')[0]
      .replace(/\s+/g, ' ')
      .trim()
    expect(chain).toBeTruthy()
    expect(createHash('sha256').update(chain!).digest('hex')).toBe(
      '06883ba46aad17cdc02712412ca42156c6543823c48760076fbff222bd0e22ef',
    )
    expect(credits).toContain('**Open Game Content designation:**')
    expect(credits).toContain('tome-of-heroes-spells.json')
    expect(credits).toContain('Deadly Salvo is withheld')
  })

  it('ships the verified Deep Magic 2020 notice chain, full OGL, and OGC designation', () => {
    const credits = readFileSync(new URL('../../CREDITS.md', import.meta.url), 'utf8')
    const chain = credits
      .split('#### Deep Magic 2020 Section 15 copyright chain')[1]
      ?.split('#### OpenFray copyright notice')[0]
      .replace(/\s+/g, ' ')
      .trim()
    expect(chain).toBeTruthy()
    expect(createHash('sha256').update(chain!).digest('hex')).toBe(
      '064dd0e577c58d29204afa079a10a9950ff1b077aaa323226d09b1b16b3376ef',
    )
    const source = credits.split('### Deep Magic 2020 (Kobold Press)')[1]
    expect(source).toContain('#### OPEN GAME LICENSE Version 1.0a')
    expect(source).toContain('14. Reformation:')
    expect(source).toContain('**Open Game Content designation:**')
    expect(source).toContain('deep-magic-2020-spells.json')
    expect(source).toContain('Eleven custom-ritual spells are withheld')
  })

  it('keeps all eleven ritual dependencies outside the Deep Magic dataset and preserves its corrections', () => {
    const spells = JSON.parse(
      readFileSync(
        new URL('../../public/compendium/deep-magic-2020-spells.json', import.meta.url),
        'utf8',
      ),
    ) as Spell[]
    const holds = [
      'Afflict Line',
      'Bloom',
      'Celebration',
      'Clearing the Field',
      'Desolation',
      'Encroaching Shadows',
      'Guest of Honor',
      'Shadows Brought to Light',
      'Shadowy Retribution',
      'Song of the Forest',
      'Vine Trestle',
    ]
    expect(spells.filter((spell) => holds.includes(spell.name))).toEqual([])
    expect(new Set(spells.map((spell) => spell.id)).size).toBe(503)
    expect(spells.every((spell) => spell.source === 'kobold-press-deepm' && !spell.mechanics)).toBe(
      true,
    )
    const spectral = spells.find((spell) => spell.name === 'Conjure Spectral Dead')!
    expect(spectral.text).toContain('or one [ghost]')
    expect(spectral.text).toContain('or a [wight]')
    expect(spectral.text).not.toContain('will-o')
    expect(spells.find((spell) => spell.name === 'Harry')?.duration).toBe('up to 1 hour')
    expect(spells.find((spell) => spell.name === 'Bloodshot')?.range).toBe('30 feet')
    expect(spells.filter((spell) => spell.id.includes('anchoring-rope'))).toHaveLength(1)
  })

  it('keeps custom Deep Magic copies manual and blocks same-name SRD effects', () => {
    const copy = {
      ...BLESS,
      id: 'custom:deep-magic-copy',
      source: 'kobold-press-deepm',
      mechanics: undefined,
    }
    expect(spellEffectFor(copy)).toBeNull()
    expect(isSupportSpell(copy)).toBe(false)
    expect(spellAction(copy, {})).toBeNull()
    expect(damageVariants(copy)).toEqual([])
    expect(delayedDamageEffect(copy)).toBeNull()
  })

  it('retains reviewed SRD automation', () => {
    expect(spellEffectFor(BLESS)).not.toBeNull()
    expect(isSupportSpell({ ...BLESS, mechanics: undefined })).toBe(true)
    expect(spellAction(BLESS, {})).not.toBeNull()
    expect(damageVariants(BLESS)).not.toEqual([])
  })

  it('honors structured mechanics in a user-authored copy even with its original source label', () => {
    const copy = { ...BLESS, id: 'custom:my-spell', source: 'kibblestasty-casting-compendium-v2.3' }
    expect(spellAction(copy, {})).not.toBeNull()
    expect(damageVariants(copy)).not.toEqual([])
    expect(spellEffectFor(copy)).toBeNull()
    expect(isSupportSpell(copy)).toBe(false)
  })

  it('keeps custom Tome of Heroes copies manual and blocks same-name SRD effects', () => {
    const copy = {
      ...BLESS,
      id: 'custom:tome-reference-copy',
      source: 'kobold-press-toh',
      mechanics: undefined,
    }
    expect(spellEffectFor(copy)).toBeNull()
    expect(isSupportSpell(copy)).toBe(false)
    expect(spellAction(copy, {})).toBeNull()
    expect(damageVariants(copy)).toEqual([])
    expect(delayedDamageEffect(copy)).toBeNull()
  })

  it.each(LIBRARIES.filter((library) => library.referenceOnly))(
    '$id never inherits same-name effects or rollable mechanics',
    (library) => {
      const spell = { ...BLESS, id: `${library.id}:bless`, source: library.id }
      expect(spellEffectFor(spell)).toBeNull()
      expect(isSupportSpell(spell)).toBe(false)
      expect(spellAction(spell, {})).toBeNull()
      expect(damageVariants(spell)).toEqual([])
      expect(delayedDamageEffect(spell)).toBeNull()
    },
  )
})
