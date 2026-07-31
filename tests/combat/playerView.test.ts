// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import type { Creature } from '../../src/schema/creature.ts'
import type { MonsterCombatant, PlayerCharacter } from '../../src/schema/combatant.ts'
import type { Encounter, GameLogEntry } from '../../src/schema/encounter.ts'
import type { Effect } from '../../src/schema/effect.ts'
import { PLAYER_LOG_LIMIT, playerBoard } from '../../src/combat/playerView.ts'
import { DEFAULT_PLAYER_VIEW } from '../../src/state/settings.ts'

const ogre: Creature = {
  id: 'srd:ogre',
  source: 'srd-5.2',
  name: 'Ogre',
  size: 'Large',
  type: 'giant',
  ac: 11,
  maxHp: 68,
  speed: { walk: 40 },
  abilities: { str: 19, dex: 8, con: 16, int: 5, wis: 7, cha: 7 },
  senses: { passivePerception: 8 },
  // The whole point of the filter is that none of this reaches a player.
  description: 'The ogre swings a greatclub.',
}

function monster(overrides: Partial<MonsterCombatant> = {}): MonsterCombatant {
  return {
    isPC: false,
    combatantId: 'm',
    creatureId: ogre.id,
    creature: ogre,
    label: 'Ogre',
    initiative: 12.5,
    status: 'active',
    hp: { current: 68, max: 68, temp: 0 },
    slotsUsed: {},
    spellUsesSpent: {},
    limitedUseState: {},
    legendaryRemaining: 0,
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
    initiative: 17,
    ac: 16,
    status: 'active',
    hp: { current: 22, max: 40, temp: 5 },
    concentration: null,
    effects: [],
    ...overrides,
  }
}

function encounter(overrides: Partial<Encounter> = {}): Encounter {
  return {
    encounterId: 'local',
    ownerId: null,
    round: 1,
    activeIndex: 0,
    combatants: [pc(), monster()],
    log: [],
    ...overrides,
  }
}

function entry(overrides: Partial<GameLogEntry> = {}): GameLogEntry {
  return { id: '1-0', round: 1, category: 'turn', message: 'Round 1', ...overrides }
}

describe('playerBoard — what a creature gives away', () => {
  it('reports a wound word instead of a number by default', () => {
    const board = playerBoard(
      encounter({ combatants: [monster({ hp: { current: 20, max: 68, temp: 0 } })] }),
      DEFAULT_PLAYER_VIEW,
    )
    expect(board.rows[0].hp).toEqual({ kind: 'tier', tier: 'bloodied' })
  })

  it('sends exact hit points only when the GM asks for them', () => {
    const e = encounter({ combatants: [monster({ hp: { current: 20, max: 68, temp: 3 } })] })
    expect(playerBoard(e, { hp: 'exact', ac: 'hidden' }).rows[0].hp).toEqual({
      kind: 'exact',
      current: 20,
      max: 68,
      temp: 3,
    })
  })

  it('sends no hit points at all when they are hidden', () => {
    expect(playerBoard(encounter(), { hp: 'hidden', ac: 'hidden' }).rows[1].hp).toBeNull()
  })

  it('omits the armor class key entirely rather than sending it hidden', () => {
    const row = playerBoard(encounter(), DEFAULT_PLAYER_VIEW).rows[1]
    expect('ac' in row).toBe(false)
  })

  it('includes armor class when the GM turns it on', () => {
    expect(playerBoard(encounter(), { hp: 'bloodied', ac: 'shown' }).rows[1].ac).toBe(11)
  })

  it('never puts the stat block on the wire, at any setting', () => {
    for (const hp of ['exact', 'bloodied', 'hidden'] as const) {
      for (const ac of ['shown', 'hidden'] as const) {
        const json = JSON.stringify(playerBoard(encounter(), { hp, ac }))
        expect(json).not.toContain('creature')
        expect(json).not.toContain('greatclub')
        expect(json).not.toContain('srd:ogre')
      }
    }
  })

  it('floors a fractional initiative, as the GM sees it after a drag', () => {
    expect(playerBoard(encounter(), DEFAULT_PLAYER_VIEW).rows[1].initiative).toBe(12)
  })

  it('carries effect labels, including a counter tally, without their durations', () => {
    const frightened: Effect = {
      id: 'e1',
      name: 'Frightened',
      icon: 'condition',
      modifier: null,
      duration: { type: 'saveEnds', save: { ability: 'wis', dc: 15 }, when: 'endOfTurn' },
    }
    const exhaustion: Effect = {
      id: 'e2',
      name: 'Exhaustion',
      icon: 'counter',
      modifier: null,
      duration: { type: 'counter', count: 3 },
    }
    const board = playerBoard(
      encounter({ combatants: [monster({ effects: [frightened, exhaustion] })] }),
      DEFAULT_PLAYER_VIEW,
    )
    expect(board.rows[0].effects).toEqual([
      { id: 'e1', label: 'Frightened', icon: 'condition' },
      { id: 'e2', label: 'Exhaustion 3', icon: 'counter' },
    ])
    expect(JSON.stringify(board)).not.toContain('saveEnds')
  })
})

describe('playerBoard — player characters', () => {
  it('keeps a player character whole, whatever the creature settings say', () => {
    const board = playerBoard(encounter(), { hp: 'hidden', ac: 'hidden' })
    expect(board.rows[0]).toMatchObject({
      name: 'Thalia',
      ac: 16,
      hp: { kind: 'exact', current: 22, max: 40, temp: 5 },
      isFoe: false,
    })
  })

  it('shows a downed character their death saves, and flags a stable one', () => {
    const downed = pc({ status: 'unconscious', deathSaves: { successes: 3, failures: 1 } })
    const row = playerBoard(encounter({ combatants: [downed] }), DEFAULT_PLAYER_VIEW).rows[0]
    expect(row.deathSaves).toEqual({ successes: 3, failures: 1 })
    expect(row.stable).toBe(true)
  })

  it('leaves death saves off a conscious character', () => {
    expect(playerBoard(encounter(), DEFAULT_PLAYER_VIEW).rows[0].deathSaves).toBeUndefined()
  })
})

describe('playerBoard — the log', () => {
  it('drops the GM-only entries and keeps the rest', () => {
    const e = encounter({
      log: [
        entry({ id: 'a', message: 'Ogre takes 12 damage', category: 'hp' }),
        entry({ id: 'b', message: 'Ogre: Fire Breath recharge', category: 'roll', gmOnly: true }),
        entry({ id: 'c', message: 'Ogre is no longer Frightened', category: 'condition' }),
      ],
    })
    expect(playerBoard(e, DEFAULT_PLAYER_VIEW).log.map((x) => x.id)).toEqual(['a', 'c'])
  })

  it('caps the log at the most recent entries — it is a feed, not an archive', () => {
    const log = Array.from({ length: PLAYER_LOG_LIMIT + 20 }, (_, i) =>
      entry({ id: `e${i}`, message: `line ${i}` }),
    )
    const shared = playerBoard(encounter({ log }), DEFAULT_PLAYER_VIEW).log
    expect(shared).toHaveLength(PLAYER_LOG_LIMIT)
    expect(shared.at(-1)?.id).toBe(`e${PLAYER_LOG_LIMIT + 19}`)
  })

  it('counts the cap after filtering, so hidden rolls never eat a player`s entries', () => {
    const log = [
      ...Array.from({ length: PLAYER_LOG_LIMIT }, (_, i) =>
        entry({ id: `gm${i}`, gmOnly: true, category: 'roll' }),
      ),
      entry({ id: 'visible', message: 'Round 2' }),
    ]
    expect(playerBoard(encounter({ log }), DEFAULT_PLAYER_VIEW).log.map((x) => x.id)).toEqual([
      'visible',
    ])
  })
})

describe('playerBoard — where the fight is', () => {
  it('names whose turn it is while combat runs', () => {
    const board = playerBoard(encounter({ activeIndex: 1 }), DEFAULT_PLAYER_VIEW)
    expect(board.activeId).toBe('m')
  })

  it('has nobody up before the fight starts', () => {
    expect(playerBoard(encounter({ round: 0 }), DEFAULT_PLAYER_VIEW).activeId).toBeNull()
  })

  it('hides the turn cursor while the fight is held, and says so', () => {
    const board = playerBoard(encounter({ paused: true }), DEFAULT_PLAYER_VIEW)
    expect(board.activeId).toBeNull()
    expect(board.paused).toBe(true)
  })
})
