// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import type { Creature } from '../../src/schema/creature.ts'
import type {
  MonsterCombatant,
  PlayerCharacter,
} from '../../src/schema/combatant.ts'
import {
  applyDamage,
  applyHealing,
  castSpell,
  grantTempHp,
  hpTier,
  isBloodied,
  isLimitedAvailable,
  legendaryResistanceLeft,
  parseHpInput,
  rechargeLimited,
  restoreSlot,
  restoreSpellUse,
  setCurrentHp,
  slotsRemaining,
  spendLegendary,
  spendLegendaryResistance,
  spendLimited,
  spellUsesRemaining,
  spendSlot,
} from '../../src/combat/resources.ts'
import type { Spellcasting } from '../../src/schema/creature.ts'

function creature(): Creature {
  return {
    id: 'srd:mage',
    source: 'srd-5.2',
    name: 'Mage',
    size: 'Medium',
    type: 'humanoid',
    ac: 12,
    maxHp: 40,
    speed: { walk: 30 },
    abilities: { str: 9, dex: 14, con: 11, int: 17, wis: 12, cha: 11 },
    senses: { passivePerception: 11 },
    spellcasting: {
      ability: 'int',
      saveDc: 14,
      toHit: 6,
      slots: { '1': 4, '3': 3 },
      groups: [],
    },
    limitedUse: [
      {
        id: 'fire-breath',
        name: 'Fire Breath',
        recharge: { type: 'dice', value: 5 },
        action: { id: 'fb', name: 'Fire Breath', kind: 'save', toHit: null },
      },
    ],
  }
}

function monster(overrides: Partial<MonsterCombatant> = {}): MonsterCombatant {
  return {
    isPC: false,
    combatantId: 'm',
    creatureId: 'srd:mage',
    creature: creature(),
    label: 'Mage',
    initiative: 12,
    status: 'active',
    hp: { current: 40, max: 40, temp: 0 },
    slotsUsed: {},
    spellUsesSpent: {},
    limitedUseState: { 'fire-breath': { available: true } },
    legendaryRemaining: 3,
    concentration: null,
    effects: [],
    visibility: { name: 'shown', hp: 'bloodied', conditions: 'shown', ac: 'hidden' },
    ...overrides,
  }
}

function pc(overrides: Partial<PlayerCharacter> = {}): PlayerCharacter {
  return {
    isPC: true,
    combatantId: 'p',
    name: 'Thalia',
    initiative: 18,
    ac: 16,
    passivePerception: 14,
    status: 'active',
    hp: { current: 30, max: 30, temp: 0 },
    concentration: null,
    effects: [],
    ...overrides,
  }
}

describe('applyDamage', () => {
  it('reduces current HP', () => {
    expect(applyDamage(monster(), 12).hp.current).toBe(28)
  })

  it('floors current HP at 0 and kills a monster', () => {
    const dead = applyDamage(monster({ hp: { current: 7, max: 40, temp: 0 } }), 99)
    expect(dead.hp.current).toBe(0)
    expect(dead.status).toBe('dead')
  })

  it('downs a PC at 0 HP rather than killing', () => {
    const downed = applyDamage(pc({ hp: { current: 4, max: 30, temp: 0 } }), 10)
    expect(downed.hp.current).toBe(0)
    expect(downed.status).toBe('unconscious')
  })

  it('kills a PC outright when overkill >= max HP (massive damage)', () => {
    // 20/20 PC takes 40: reduced to 0 with 20 leftover, which equals max -> dead.
    expect(applyDamage(pc({ hp: { current: 20, max: 20, temp: 0 } }), 40).status).toBe('dead')
    // 39 leaves 19 overkill, just under max -> still only downed.
    expect(applyDamage(pc({ hp: { current: 20, max: 20, temp: 0 } }), 39).status).toBe('unconscious')
  })

  it('adds a death-save failure when an already-downed PC takes damage', () => {
    const downed = pc({ status: 'unconscious', hp: { current: 0, max: 30, temp: 0 } })
    const hit = applyDamage(downed, 5)
    expect(hit.hp.current).toBe(0)
    expect(hit.isPC && hit.deathSaves).toEqual({ successes: 0, failures: 1 })
    // A crit deals two failures.
    const crit = applyDamage(downed, 5, { crit: true })
    expect(crit.isPC && crit.deathSaves).toEqual({ successes: 0, failures: 2 })
  })

  it('un-stabilizes a stable PC that takes damage (clears successes, adds a failure)', () => {
    const stable = pc({
      status: 'unconscious',
      hp: { current: 0, max: 30, temp: 0 },
      deathSaves: { successes: 3, failures: 0 },
    })
    const hit = applyDamage(stable, 5)
    expect(hit.status).toBe('unconscious')
    expect(hit.isPC && hit.deathSaves).toEqual({ successes: 0, failures: 1 })
  })

  it('consumes temporary HP before current HP', () => {
    const c = applyDamage(monster({ hp: { current: 40, max: 40, temp: 5 } }), 8)
    expect(c.hp.temp).toBe(0)
    expect(c.hp.current).toBe(37)
  })

  it('only eats temp HP when damage is fully absorbed', () => {
    const c = applyDamage(monster({ hp: { current: 40, max: 40, temp: 5 } }), 3)
    expect(c.hp.temp).toBe(2)
    expect(c.hp.current).toBe(40)
  })

  it('does not mutate the input', () => {
    const m = monster()
    applyDamage(m, 10)
    expect(m.hp.current).toBe(40)
  })
})

describe('applyHealing', () => {
  it('caps healing at max HP', () => {
    const c = applyHealing(monster({ hp: { current: 35, max: 40, temp: 0 } }), 20)
    expect(c.hp.current).toBe(40)
  })

  it('revives a dead monster healed above 0', () => {
    const c = applyHealing(
      monster({ status: 'dead', hp: { current: 0, max: 40, temp: 0 } }),
      5,
    )
    expect(c.hp.current).toBe(5)
    expect(c.status).toBe('active')
  })

  it('clears a revived PC’s death saves', () => {
    const downed = pc({
      status: 'unconscious',
      hp: { current: 0, max: 30, temp: 0 },
      deathSaves: { successes: 1, failures: 2 },
    })
    const healed = applyHealing(downed, 6)
    expect(healed.status).toBe('active')
    expect(healed.isPC && healed.deathSaves).toEqual({ successes: 0, failures: 0 })
  })

  it('leaves temp HP untouched', () => {
    const c = applyHealing(monster({ hp: { current: 20, max: 40, temp: 6 } }), 5)
    expect(c.hp.temp).toBe(6)
  })
})

describe('setCurrentHp', () => {
  it('sets current HP exactly, not through temp HP', () => {
    const c = setCurrentHp(monster({ hp: { current: 40, max: 40, temp: 5 } }), 10)
    expect(c.hp.current).toBe(10)
    expect(c.hp.temp).toBe(5) // untouched
  })

  it('clamps to 0..max', () => {
    expect(setCurrentHp(monster(), 999).hp.current).toBe(40)
    expect(setCurrentHp(monster(), -5).hp.current).toBe(0)
  })

  it('kills a monster set to 0 and revives one set above 0', () => {
    expect(setCurrentHp(monster({ hp: { current: 0, max: 40, temp: 0 }, status: 'dead' }), 12).status).toBe('active')
    expect(setCurrentHp(monster(), 0).status).toBe('dead')
  })

  it('downs a PC at 0 (not dead) and resets death saves on revive', () => {
    const downed = setCurrentHp(pc({ hp: { current: 20, max: 30, temp: 0 } }), 0)
    expect(downed.status).toBe('unconscious')
    const revived = setCurrentHp(
      pc({ status: 'unconscious', hp: { current: 0, max: 30, temp: 0 }, deathSaves: { successes: 1, failures: 2 } }),
      5,
    )
    expect(revived.status).toBe('active')
    expect(revived.isPC && revived.deathSaves).toEqual({ successes: 0, failures: 0 })
  })
})

describe('parseHpInput', () => {
  it('parses a bare number as a set', () => {
    expect(parseHpInput('12')).toEqual({ set: 12 })
  })
  it('parses +N / -N as a delta', () => {
    expect(parseHpInput('+5')).toEqual({ delta: 5 })
    expect(parseHpInput('-3')).toEqual({ delta: -3 })
  })
  it('rejects junk', () => {
    expect(parseHpInput('')).toBeNull()
    expect(parseHpInput('abc')).toBeNull()
    expect(parseHpInput('1d6')).toBeNull()
  })
})

describe('grantTempHp', () => {
  it('keeps the higher value (temp HP does not stack)', () => {
    expect(grantTempHp(monster({ hp: { current: 40, max: 40, temp: 8 } }), 5).hp.temp).toBe(8)
    expect(grantTempHp(monster({ hp: { current: 40, max: 40, temp: 3 } }), 9).hp.temp).toBe(9)
  })
})

describe('hpTier', () => {
  const at = (current: number) => hpTier(monster({ hp: { current, max: 40, temp: 0 } }))

  it('is healthy at full HP', () => {
    expect(at(40)).toBe('healthy')
  })

  it('is hurt below max but above half', () => {
    expect(at(39)).toBe('hurt')
    expect(at(21)).toBe('hurt')
  })

  it('is bloodied at or below half, above a quarter', () => {
    expect(at(20)).toBe('bloodied')
    expect(at(11)).toBe('bloodied')
  })

  it('is critical at or below a quarter', () => {
    expect(at(10)).toBe('critical')
    expect(at(1)).toBe('critical')
    expect(at(0)).toBe('critical')
  })
})

describe('isBloodied', () => {
  it('is true at or below half (bloodied or critical), false above', () => {
    expect(isBloodied(monster({ hp: { current: 20, max: 40, temp: 0 } }))).toBe(true)
    expect(isBloodied(monster({ hp: { current: 8, max: 40, temp: 0 } }))).toBe(true)
    expect(isBloodied(monster({ hp: { current: 21, max: 40, temp: 0 } }))).toBe(false)
    expect(isBloodied(monster({ hp: { current: 40, max: 40, temp: 0 } }))).toBe(false)
  })
})

describe('spell slots', () => {
  it('spends a slot and reports remaining, not exceeding max', () => {
    const after = spendSlot(monster(), '1')
    expect(slotsRemaining(after, '1')).toBe(3)
  })

  it('does not spend below zero remaining', () => {
    const drained = monster({ slotsUsed: { '1': 4 } })
    expect(spendSlot(drained, '1').slotsUsed['1']).toBe(4)
  })

  it('restores a spent slot, flooring at zero used', () => {
    expect(restoreSlot(monster({ slotsUsed: { '1': 2 } }), '1').slotsUsed['1']).toBe(1)
    expect(restoreSlot(monster(), '1').slotsUsed['1'] ?? 0).toBe(0)
  })
})

describe('spell uses (At Will / N per day, each spell on its own)', () => {
  const SPELLCASTING: Spellcasting = {
    ability: 'int',
    saveDc: 14,
    groups: [
      { usage: { type: 'atWill' }, spells: [{ name: 'Mage Hand', ref: 'srd-5.2:mage-hand' }] },
      {
        usage: { type: 'perDay', per: 2 },
        spells: [
          { name: 'Fireball', ref: 'srd-5.2:fireball' },
          { name: 'Invisibility', ref: 'srd-5.2:invisibility' },
        ],
      },
    ],
  }
  const caster = () =>
    monster({ creature: { ...creature(), spellcasting: SPELLCASTING } })
  const fireball = SPELLCASTING.groups[1].spells[0]
  const invisibility = SPELLCASTING.groups[1].spells[1]
  const mageHand = SPELLCASTING.groups[0].spells[0]

  it('reports null (unlimited) for an at-will spell', () => {
    expect(spellUsesRemaining(caster(), mageHand)).toBeNull()
  })

  it('starts a per-day spell at its full count', () => {
    expect(spellUsesRemaining(caster(), fireball)).toBe(2)
  })

  it('spends only the cast spell — each is counted on its own', () => {
    const after = castSpell(caster(), fireball)
    expect(spellUsesRemaining(after, fireball)).toBe(1)
    expect(spellUsesRemaining(after, invisibility)).toBe(2) // untouched
  })

  it('does not spend an at-will spell', () => {
    expect(castSpell(caster(), mageHand).spellUsesSpent).toEqual({})
  })

  it('clamps at zero — a drained spell can be cast no further', () => {
    let c = castSpell(castSpell(caster(), fireball), fireball)
    expect(spellUsesRemaining(c, fireball)).toBe(0)
    c = castSpell(c, fireball)
    expect(spellUsesRemaining(c, fireball)).toBe(0)
  })

  it('restores one spent use, flooring at zero', () => {
    const spent = castSpell(caster(), fireball)
    expect(spellUsesRemaining(restoreSpellUse(spent, fireball), fireball)).toBe(2)
    expect(spellUsesRemaining(restoreSpellUse(caster(), fireball), fireball)).toBe(2)
  })
})

describe('castSpell — slot casters (2014, spells of a level share a slot pool)', () => {
  const SLOT_SPELLCASTING: Spellcasting = {
    ability: 'int',
    saveDc: 17,
    slots: { '1': 4, '3': 3 },
    groups: [
      { usage: { type: 'atWill' }, spells: [{ name: 'Fire Bolt', ref: 'srd-5.2:fire-bolt' }] },
      {
        usage: { type: 'slots', level: 1 },
        spells: [
          { name: 'Magic Missile', ref: 'srd-5.2:magic-missile' },
          { name: 'Mage Armor', ref: 'srd-5.2:mage-armor' },
        ],
      },
      { usage: { type: 'slots', level: 3 }, spells: [{ name: 'Fireball', ref: 'srd-5.2:fireball' }] },
    ],
  }
  const slotCaster = () => monster({ creature: { ...creature(), spellcasting: SLOT_SPELLCASTING } })
  const magicMissile = SLOT_SPELLCASTING.groups[1].spells[0]
  const mageArmor = SLOT_SPELLCASTING.groups[1].spells[1]
  const fireball = SLOT_SPELLCASTING.groups[2].spells[0]
  const fireBolt = SLOT_SPELLCASTING.groups[0].spells[0]

  it('shows the level’s remaining slots as the spell’s count', () => {
    expect(spellUsesRemaining(slotCaster(), magicMissile)).toBe(4)
    expect(spellUsesRemaining(slotCaster(), fireball)).toBe(3)
  })

  it('casting spends one slot of that level, shared across the level’s spells', () => {
    const after = castSpell(slotCaster(), magicMissile)
    expect(after.slotsUsed['1']).toBe(1)
    expect(spellUsesRemaining(after, magicMissile)).toBe(3)
    expect(spellUsesRemaining(after, mageArmor)).toBe(3) // shares the 1st-level pool
    expect(spellUsesRemaining(after, fireball)).toBe(3) // 3rd-level untouched
  })

  it('treats cantrips in a slot caster as unlimited', () => {
    expect(spellUsesRemaining(slotCaster(), fireBolt)).toBeNull()
    expect(castSpell(slotCaster(), fireBolt).slotsUsed).toEqual({})
  })

  it('clamps a drained level at zero and restores a slot', () => {
    let c = slotCaster()
    for (let i = 0; i < 3; i++) c = castSpell(c, fireball)
    expect(spellUsesRemaining(c, fireball)).toBe(0)
    c = castSpell(c, fireball) // no slots left → no-op
    expect(c.slotsUsed['3']).toBe(3)
    c = restoreSpellUse(c, fireball)
    expect(spellUsesRemaining(c, fireball)).toBe(1)
  })
})

describe('legendary resistance', () => {
  const lichLike = (overrides: Partial<MonsterCombatant> = {}) =>
    monster({
      creature: { ...creature(), legendaryResistance: 4, legendaryResistanceLair: 5 },
      legendaryResistanceSpent: 0,
      ...overrides,
    })

  it('reports remaining uses from the base count, 0 when the creature has none', () => {
    expect(legendaryResistanceLeft(lichLike())).toBe(4)
    expect(legendaryResistanceLeft(lichLike({ legendaryResistanceSpent: 1 }))).toBe(3)
    expect(legendaryResistanceLeft(monster())).toBe(0)
  })

  it('uses the higher count when in the creature’s lair', () => {
    expect(legendaryResistanceLeft(lichLike({ inLair: true }))).toBe(5)
    expect(legendaryResistanceLeft(lichLike({ inLair: true, legendaryResistanceSpent: 2 }))).toBe(3)
  })

  it('spends one use, never below zero', () => {
    expect(spendLegendaryResistance(lichLike()).legendaryResistanceSpent).toBe(1)
    expect(
      spendLegendaryResistance(lichLike({ legendaryResistanceSpent: 4 })).legendaryResistanceSpent,
    ).toBe(4) // out of base uses
    // …but in the lair the 5th use is allowed.
    expect(
      spendLegendaryResistance(lichLike({ inLair: true, legendaryResistanceSpent: 4 }))
        .legendaryResistanceSpent,
    ).toBe(5)
  })
})

describe('spendLegendary', () => {
  it('decrements remaining legendary actions', () => {
    expect(spendLegendary(monster({ legendaryRemaining: 3 })).legendaryRemaining).toBe(2)
  })

  it('clamps at zero', () => {
    expect(spendLegendary(monster({ legendaryRemaining: 1 }), 3).legendaryRemaining).toBe(0)
  })
})

describe('limited-use abilities', () => {
  it('marks an ability used, then recharged', () => {
    const used = spendLimited(monster(), 'fire-breath')
    expect(isLimitedAvailable(used, 'fire-breath')).toBe(false)
    const back = rechargeLimited(used, 'fire-breath')
    expect(isLimitedAvailable(back, 'fire-breath')).toBe(true)
  })
})
