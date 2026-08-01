// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import type { Creature } from '../../src/schema/creature.ts'
import type { MonsterCombatant, PlayerCharacter } from '../../src/schema/combatant.ts'
import type { Encounter, GameLogEntry } from '../../src/schema/encounter.ts'
import type { Effect } from '../../src/schema/effect.ts'
import type { RollResult } from '../../src/dice/roll.ts'
import { PLAYER_LOG_LIMIT, playerBoard, type PlayerRecap } from '../../src/combat/playerView.ts'
import { DEFAULT_PLAYER_VIEW, type PlayerViewSettings } from '../../src/state/settings.ts'

/** Player-view settings with the defaults filled in, so a case names only what it changes. */
const view = (over: Partial<PlayerViewSettings> = {}): PlayerViewSettings => ({
  ...DEFAULT_PLAYER_VIEW,
  ...over,
})

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

/** A roll result carrying just the fields the shared view reasons about. */
function roll(over: Partial<RollResult> = {}): RollResult {
  return {
    formula: '1d20',
    kind: 'check',
    dice: [{ sides: 20, results: [15], kept: [15], sign: 1, total: 15 }],
    modifier: 0,
    total: 15,
    crit: false,
    fumble: false,
    advantageState: 'normal',
    ...over,
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
    expect(playerBoard(e, view({ hp: 'exact' })).rows[0].hp).toEqual({
      kind: 'exact',
      current: 20,
      max: 68,
      temp: 3,
    })
  })

  it('sends no hit points at all when they are hidden', () => {
    expect(playerBoard(encounter(), view({ hp: 'hidden' })).rows[1].hp).toBeNull()
  })

  it('omits the armor class key entirely rather than sending it hidden', () => {
    const row = playerBoard(encounter(), DEFAULT_PLAYER_VIEW).rows[1]
    expect('ac' in row).toBe(false)
  })

  it('includes armor class when the GM turns it on', () => {
    expect(playerBoard(encounter(), view({ ac: 'shown' })).rows[1].ac).toBe(11)
  })

  it('never puts the stat block on the wire, at any setting', () => {
    for (const hp of ['exact', 'bloodied', 'hidden'] as const) {
      for (const ac of ['shown', 'hidden'] as const) {
        const json = JSON.stringify(playerBoard(encounter(), view({ hp, ac })))
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

describe('playerBoard — which side a combatant is on', () => {
  // Whose numbers are withheld follows the side of the fight, not whether the app
  // holds a stat block: a quick-add bandit is a foe, a summoned wolf is not.
  it('withholds a quick-add foe`s numbers like any other creature', () => {
    const bandit = pc({ combatantId: 'q', name: 'Bandit', kind: 'quick', side: 'foe' })
    const board = playerBoard(encounter({ combatants: [bandit] }), DEFAULT_PLAYER_VIEW)
    expect(board.rows[0]).toMatchObject({ name: 'Bandit', isFoe: true, hp: { kind: 'tier' } })
    expect('ac' in board.rows[0]).toBe(false)
  })

  it('keeps an allied creature whole, and on the board before the fight', () => {
    const wolf = monster({ combatantId: 'w', label: 'Wolf', side: 'friend' })
    const board = playerBoard(
      encounter({ round: 0, combatants: [pc(), wolf] }),
      DEFAULT_PLAYER_VIEW,
    )
    expect(board.rows.map((r) => r.name)).toEqual(['Thalia', 'Wolf'])
    expect(board.rows[1]).toMatchObject({
      isFoe: false,
      hp: { kind: 'exact', current: 68, max: 68 },
      ac: 11,
    })
  })

  it('leaves death saves off an ally that has none to make', () => {
    const wolf = monster({ combatantId: 'w', side: 'friend', status: 'unconscious' })
    const row = playerBoard(encounter({ combatants: [wolf] }), DEFAULT_PLAYER_VIEW).rows[0]
    expect(row.deathSaves).toBeUndefined()
    expect(row.stable).toBeUndefined()
  })
})

describe('playerBoard — player characters', () => {
  it('keeps a player character whole, whatever the creature settings say', () => {
    const board = playerBoard(encounter(), view({ hp: 'hidden' }))
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

describe('playerBoard — how much of the log the table follows', () => {
  /** A fight in progress whose log carries a previous fight's lines and this one's. */
  const twoFights = (round = 2) =>
    encounter({
      round,
      fightLogStart: 2,
      log: [
        entry({ id: 'old-1', round: 1, message: 'Combat begins — Round 1' }),
        entry({ id: 'old-2', round: 3, message: 'Combat ends' }),
        entry({ id: 'new-1', round: 1, message: 'Combat begins — Round 1' }),
        entry({ id: 'new-2', round: 2, message: 'Round 2' }),
      ],
    })

  it('carries only the fight in progress by default', () => {
    expect(playerBoard(twoFights(), DEFAULT_PLAYER_VIEW).log.map((e) => e.id)).toEqual([
      'new-1',
      'new-2',
    ])
  })

  it('empties when the fight ends, so the next one starts fresh', () => {
    expect(playerBoard(twoFights(0), DEFAULT_PLAYER_VIEW).log).toEqual([])
  })

  it('carries the whole record when the GM asks for the session', () => {
    const board = playerBoard(twoFights(), view({ log: 'session' }))
    expect(board.log.map((e) => e.id)).toEqual(['old-1', 'old-2', 'new-1', 'new-2'])
    // And a fight that has ended keeps it on screen rather than clearing.
    expect(playerBoard(twoFights(0), view({ log: 'session' })).log).toHaveLength(4)
  })

  // An encounter saved before the marker existed, or one whose log the GM cleared
  // mid-fight, reads as "from the top" rather than slicing past the end.
  it('falls back to the whole log when there is no mark to start from', () => {
    const e = encounter({ round: 2, log: [entry({ id: 'a' }), entry({ id: 'b' })] })
    expect(playerBoard(e, DEFAULT_PLAYER_VIEW).log.map((x) => x.id)).toEqual(['a', 'b'])
    const cleared = encounter({ round: 2, fightLogStart: 9, log: [entry({ id: 'a' })] })
    expect(playerBoard(cleared, DEFAULT_PLAYER_VIEW).log.map((x) => x.id)).toEqual([])
  })
})

describe('playerBoard — the end-of-fight summary', () => {
  const summary: PlayerRecap = {
    outcome: 'victory',
    difficulty: 'hard',
    rounds: 3,
    inGameSeconds: 18,
    activeMs: 60_000,
    totalXp: 450,
    partySize: 3,
    xpPerPlayer: 150,
    damageDealtTotal: 88,
    damageTakenTotal: 41,
    spellsCast: 2,
    effectsApplied: 1,
    knockouts: 1,
    awards: [],
    showXp: true,
  }

  it('travels with the board while the GM has it up', () => {
    const board = playerBoard(encounter({ round: 0 }), DEFAULT_PLAYER_VIEW, summary)
    expect(board.recap).toEqual(summary)
  })

  it('is absent when the GM keeps it to themselves', () => {
    const board = playerBoard(encounter({ round: 0 }), view({ recap: 'hidden' }), summary)
    expect('recap' in board).toBe(false)
  })

  it('is absent when there is no summary on screen', () => {
    expect('recap' in playerBoard(encounter(), DEFAULT_PLAYER_VIEW)).toBe(false)
  })
})

describe('playerBoard — a creature`s numbers in the log', () => {
  /** An encounter whose log is about the creature `m`, unless a PC id is given. */
  const withLog = (...log: GameLogEntry[]) => encounter({ log })

  it('keeps the event but drops the amount when a creature is hurt', () => {
    const board = playerBoard(
      withLog(
        entry({ category: 'hp', message: 'Ogre takes 45 damage', sourceId: 'm', amount: 45 }),
      ),
      DEFAULT_PLAYER_VIEW,
    )
    expect(board.log[0].message).toBe('Ogre takes damage')
    expect(board.log[0].amount).toBeUndefined()
    expect(JSON.stringify(board.log)).not.toContain('45')
  })

  it('says a creature was healed without saying by how much', () => {
    const board = playerBoard(
      withLog(
        entry({ category: 'heal', message: 'Ogre regains 12 HP', sourceId: 'm', amount: 12 }),
      ),
      DEFAULT_PLAYER_VIEW,
    )
    expect(board.log[0].message).toBe('Ogre is healed')
    expect(JSON.stringify(board.log)).not.toContain('12')
  })

  it('leaves a player character`s hit points alone', () => {
    const board = playerBoard(
      withLog(
        entry({ category: 'hp', message: 'Thalia takes 13 damage', sourceId: 'p', amount: 13 }),
      ),
      DEFAULT_PLAYER_VIEW,
    )
    expect(board.log[0].message).toBe('Thalia takes 13 damage')
  })

  // The table watched the ogre swing and connect; what they didn't see is its to-hit.
  it('keeps a creature`s total, its hit and its damage, and drops the arithmetic', () => {
    const attack = entry({
      category: 'roll',
      message: 'Ogre: Greatclub → Thalia',
      sourceId: 'm',
      result: roll({ total: 23, modifier: 6 }),
      outcome: 'hit',
      damage: [{ type: 'bludgeoning', amount: 13 }],
    })
    const row = playerBoard(withLog(attack), DEFAULT_PLAYER_VIEW).log[0]
    expect(row.outcome).toBe('hit')
    expect(row.damage).toEqual([{ type: 'bludgeoning', amount: 13 }])
    expect(row.message).toBe('Ogre: Greatclub → Thalia')
    // The total alone says nothing — the die behind it is unknown.
    expect(row.result?.total).toBe(23)
    expect(row.result?.dice).toEqual([])
    expect(row.result?.modifier).toBe(0)
  })

  it('keeps whether a creature crit or had advantage — the table saw that happen', () => {
    const attack = entry({
      category: 'roll',
      message: 'Ogre: Greatclub → Thalia',
      sourceId: 'm',
      result: roll({ total: 28, modifier: 6, crit: true, advantageState: 'advantage' }),
    })
    const row = playerBoard(withLog(attack), DEFAULT_PLAYER_VIEW).log[0]
    expect(row.result?.crit).toBe(true)
    expect(row.result?.advantageState).toBe('advantage')
  })

  // A save reads like an attack: what it came to, and how it went.
  it('says what a creature`s save came to as well as whether it failed', () => {
    const save = entry({
      category: 'roll',
      message: 'Ogre: DEX save',
      sourceId: 'm',
      saved: false,
      result: roll({ total: 7, modifier: -1, kind: 'save' }),
    })
    const row = playerBoard(withLog(save), DEFAULT_PLAYER_VIEW).log[0]
    expect(row.saved).toBe(false)
    expect(row.result?.total).toBe(7)
    expect(row.result?.modifier).toBe(0)
  })

  // An area's dice belong to the spell rather than to any one combatant, so they carry
  // no sourceId — and would otherwise let the table work out what a creature took.
  it('drops the dice from an area damage roll but keeps what it came to', () => {
    const damage = entry({
      category: 'roll',
      message: 'Mage: Fireball fire damage',
      result: roll({
        total: 30,
        dice: [{ sides: 6, results: [6, 6, 1, 4], kept: [6, 6, 1, 4], sign: 1, total: 17 }],
      }),
    })
    const row = playerBoard(withLog(damage), DEFAULT_PLAYER_VIEW).log[0]
    expect(row.result?.total).toBe(30)
    expect(row.result?.dice).toEqual([])
  })

  // Initiative is the one roll whose total is already on the row, so hiding it would
  // be theatre; the breakdown is the part that states the modifier outright.
  it('keeps a creature`s initiative total and drops the modifier behind it', () => {
    const init = entry({
      category: 'roll',
      message: 'Ogre: initiative',
      sourceId: 'm',
      result: roll({ total: 14, modifier: -1 }),
    })
    const row = playerBoard(withLog(init), DEFAULT_PLAYER_VIEW).log[0]
    expect(row.result?.total).toBe(14)
    expect(JSON.stringify(row)).not.toContain('-1')
  })

  it('drops the effects that swung a creature`s roll, since they name the bonus', () => {
    const save = entry({
      category: 'roll',
      message: 'Ogre: WIS save',
      sourceId: 'm',
      saved: true,
      applied: [{ effect: 'advantage', source: 'Magic Resistance' }] as never,
    })
    expect(playerBoard(withLog(save), DEFAULT_PLAYER_VIEW).log[0].applied).toBeUndefined()
  })

  // Choosing exact hit points is the GM saying the table may do the arithmetic.
  it('withholds nothing once the GM shows exact hit points', () => {
    const log = [
      entry({ category: 'hp', message: 'Ogre takes 45 damage', sourceId: 'm', amount: 45 }),
      entry({
        category: 'roll',
        message: 'Ogre: DEX save',
        sourceId: 'm',
        saved: false,
        result: { total: 7, dice: [], modifier: -1, advantageState: 'normal' } as never,
      }),
    ]
    const board = playerBoard(withLog(...log), view({ hp: 'exact' }))
    expect(board.log[0].message).toBe('Ogre takes 45 damage')
    expect(board.log[1].result).toBeDefined()
  })

  it('leaves an entry with no subject alone — it belongs to nobody in particular', () => {
    const board = playerBoard(
      withLog(entry({ category: 'turn', message: 'Round 2' })),
      DEFAULT_PLAYER_VIEW,
    )
    expect(board.log[0].message).toBe('Round 2')
  })

  it('carries conditions, concentration and casts through untouched', () => {
    const board = playerBoard(
      withLog(
        entry({ category: 'condition', message: 'Ogre is Frightened', sourceId: 'm' }),
        entry({
          category: 'concentration',
          message: 'Ogre concentrates on Hold Person',
          sourceId: 'm',
        }),
        entry({ category: 'cast', message: 'Ogre casts Fireball' }),
      ),
      DEFAULT_PLAYER_VIEW,
    )
    expect(board.log.map((e) => e.message)).toEqual([
      'Ogre is Frightened',
      'Ogre concentrates on Hold Person',
      'Ogre casts Fireball',
    ])
  })
})

describe('playerBoard — creatures before the fight starts', () => {
  it('shares only the party while the GM is still setting the board up', () => {
    const board = playerBoard(encounter({ round: 0 }), DEFAULT_PLAYER_VIEW)
    expect(board.rows.map((r) => r.name)).toEqual(['Thalia'])
  })

  it('withholds how many creatures are waiting, not just what they are', () => {
    const e = encounter({
      round: 0,
      combatants: [monster({ combatantId: 'm1' }), monster({ combatantId: 'm2' })],
    })
    expect(playerBoard(e, DEFAULT_PLAYER_VIEW).rows).toEqual([])
  })

  it('brings the creatures in when combat begins', () => {
    const board = playerBoard(encounter({ round: 1 }), DEFAULT_PLAYER_VIEW)
    expect(board.rows.map((r) => r.name)).toEqual(['Thalia', 'Ogre'])
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

describe('playerBoard — hiding a creature`s rolls', () => {
  const hidden = { ...DEFAULT_PLAYER_VIEW, rolls: 'hidden' as const }
  const withLog = (...log: GameLogEntry[]) => encounter({ log })

  it('drops the total from an attack but keeps the hit and the damage dealt', () => {
    const attack = entry({
      category: 'roll',
      message: 'Ogre: Greatclub → Thalia',
      sourceId: 'm',
      result: roll({ total: 23, kind: 'attack' }),
      outcome: 'hit',
      damage: [{ type: 'bludgeoning', amount: 13 }],
    })
    const row = playerBoard(withLog(attack), hidden).log[0]
    expect(row.result).toBeUndefined()
    expect(row.outcome).toBe('hit')
    expect(row.damage).toEqual([{ type: 'bludgeoning', amount: 13 }])
  })

  it('drops the total from a save but keeps whether it was made', () => {
    const save = entry({
      category: 'roll',
      message: 'Ogre: DEX save',
      sourceId: 'm',
      saved: true,
      result: roll({ total: 19, kind: 'save' }),
    })
    const row = playerBoard(withLog(save), hidden).log[0]
    expect(row.result).toBeUndefined()
    expect(row.saved).toBe(true)
  })

  // Initiative carries no kind of its own, so anything that isn't damage has to count
  // as a d20 or it would slip through.
  it('drops the total from initiative and from a check', () => {
    const log = [
      entry({
        id: 'i',
        category: 'roll',
        message: 'Ogre: initiative',
        sourceId: 'm',
        result: roll({ total: 14, kind: 'raw' }),
      }),
      entry({
        id: 'c',
        category: 'roll',
        message: 'Ogre: STR check',
        sourceId: 'm',
        result: roll({ total: 18, kind: 'check' }),
      }),
    ]
    expect(playerBoard(withLog(...log), hidden).log.every((e) => e.result === undefined)).toBe(true)
  })

  // What a blow came to is what the table felt, and it gives no bonus away.
  it('never touches a damage roll, however it is set', () => {
    const damage = entry({
      category: 'roll',
      message: 'Ogre: Greatclub bludgeoning damage',
      sourceId: 'm',
      result: roll({ total: 13, kind: 'damage' }),
    })
    expect(playerBoard(withLog(damage), hidden).log[0].result?.total).toBe(13)
  })

  it('leaves a player character`s rolls alone — the setting is about creatures', () => {
    const init = entry({
      category: 'roll',
      message: 'Thalia: initiative',
      sourceId: 'p',
      result: roll({ total: 17, kind: 'raw' }),
    })
    expect(playerBoard(withLog(init), hidden).log[0].result?.total).toBe(17)
  })

  it('is independent of the hit-points setting', () => {
    const save = entry({
      category: 'roll',
      message: 'Ogre: DEX save',
      sourceId: 'm',
      result: roll({ total: 19, kind: 'save' }),
    })
    // Exact hit points, rolls still hidden: the two calls don't ride on each other.
    const board = playerBoard(withLog(save), view({ hp: 'exact', ac: 'shown', rolls: 'hidden' }))
    expect(board.log[0].result).toBeUndefined()
  })
})
