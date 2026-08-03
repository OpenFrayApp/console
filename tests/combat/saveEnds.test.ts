// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import { saveEndsClears, saveEndsEffects, saveEndsOf } from '../../src/combat/saveEnds.ts'
import type { Ability } from '../../src/schema/primitives.ts'
import type { Effect } from '../../src/schema/effect.ts'

const saveEnd = (
  name: string,
  ability: Ability,
  dc: number,
  when?: 'startOfTurn' | 'endOfTurn',
): Effect => ({
  id: name,
  name,
  icon: 'condition',
  modifier: null,
  duration: { type: 'saveEnds', save: { ability, dc }, when },
})

describe('saveEndsOf', () => {
  it('reads the escape save off an effect', () => {
    expect(saveEndsOf(saveEnd('Frightened', 'wis', 12))).toMatchObject({
      ability: 'wis',
      dc: 12,
      when: 'endOfTurn',
    })
  })

  it('keeps an explicit start-of-turn timing', () => {
    expect(saveEndsOf(saveEnd('Prone', 'dex', 15, 'startOfTurn'))?.when).toBe('startOfTurn')
  })

  it('returns null for an effect no save ends', () => {
    const condition: Effect = {
      id: 'c',
      name: 'Grappled',
      icon: 'condition',
      modifier: null,
      duration: { type: 'manual' },
    }
    expect(saveEndsOf(condition)).toBeNull()
  })
})

describe('saveEndsEffects', () => {
  it('gives each effect its own save, even when the ability and DC match', () => {
    // Two effects at DEX 15 came from different sources — one die can't end both.
    const saves = saveEndsEffects([
      saveEnd('Frightened', 'dex', 15),
      saveEnd('Restrained', 'dex', 15),
    ])
    expect(saves).toHaveLength(2)
    expect(saves.map((s) => s.effect.name)).toEqual(['Frightened', 'Restrained'])
  })

  it('skips effects that are not save-ends', () => {
    const manual: Effect = {
      id: 'c',
      name: 'Grappled',
      icon: 'condition',
      modifier: null,
      duration: { type: 'manual' },
    }
    expect(
      saveEndsEffects([manual, saveEnd('Stunned', 'con', 13)]).map((s) => s.effect.name),
    ).toEqual(['Stunned'])
  })
})

describe('saveEndsClears', () => {
  const inBundle = (id: string, bundleId: string, over: Partial<Effect> = {}): Effect => ({
    id,
    name: 'Slow',
    modifier: null,
    duration: { type: 'rounds', rounds: 10 },
    bundle: { id: bundleId, name: 'Slow' },
    ...over,
  })

  it('clears only the effect itself when it was applied alone', () => {
    const anchor = saveEnd('Frightened', 'wis', 12)
    const other = saveEnd('Restrained', 'dex', 15)
    expect(saveEndsClears(anchor, [anchor, other])).toEqual([anchor.id])
  })

  it('clears every bundle-mate with the anchor — the save ends the whole spell', () => {
    const anchor = { ...saveEnd('Slow', 'wis', 15), bundle: { id: 'b1', name: 'Slow' } }
    const speed = inBundle('speed', 'b1')
    const saves = inBundle('saves', 'b1')
    const unrelated = inBundle('other', 'b2', { name: 'Haste' })
    expect(saveEndsClears(anchor, [anchor, speed, saves, unrelated])).toEqual([
      anchor.id,
      'speed',
      'saves',
    ])
  })
})
