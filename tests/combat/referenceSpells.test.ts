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

  it('ships the publisher-verified A5E subset without converting its ruleset', () => {
    const spells = JSON.parse(
      readFileSync(new URL('../../public/compendium/a5e-srd-spells.json', import.meta.url), 'utf8'),
    ) as Spell[]
    expect(spells).toHaveLength(369)
    expect(createHash('sha256').update(JSON.stringify(spells)).digest('hex')).toBe(
      '926a1d330ac3e8ae4930878c13326898070dafa40027842b0741e6f9321a3c91',
    )
    expect(
      spells.every(
        (spell) => !spell.edition && !spell.mechanics && spell.source === 'en-publishing-a5e-ag',
      ),
    ).toBe(true)
    expect(spells.some((spell) => ['Guardian of Faith', 'Wish'].includes(spell.name))).toBe(false)
    const acid = spells.find((spell) => spell.name === 'Acid Arrow')!
    expect(acid.components.materials).toBe('flint arrowhead')
    expect(acid.classes).toEqual(['sorcerer', 'wizard'])
    for (const spell of spells) expect(spellEffectFor(spell)).toBeNull()
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
