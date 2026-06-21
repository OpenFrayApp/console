// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { Creature } from '../../src/schema/creature.ts'
import type { MonsterCombatant } from '../../src/schema/combatant.ts'
import type { Action } from '../../src/schema/action.ts'
import { ActionResolver } from '../../src/components/ActionResolver.tsx'

function creature(over: Partial<Creature> = {}): Creature {
  return {
    id: 'srd:goblin',
    source: 'srd-5.2',
    name: 'Goblin',
    size: 'Small',
    type: 'humanoid',
    ac: 15,
    maxHp: 7,
    speed: { walk: 30 },
    abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
    senses: { passivePerception: 9 },
    ...over,
  }
}

function monster(over: Partial<MonsterCombatant> = {}): MonsterCombatant {
  return {
    isPC: false,
    combatantId: 'm',
    creatureId: 'srd:goblin',
    creature: creature(),
    label: 'Goblin',
    initiative: 12,
    status: 'active',
    hp: { current: 7, max: 7, temp: 0 },
    slotsUsed: {},
    spellUsesSpent: {},
    limitedUseState: {},
    legendaryRemaining: 0,
    concentration: null,
    effects: [],
    visibility: { name: 'shown', hp: 'bloodied', conditions: 'shown', ac: 'hidden' },
    ...over,
  }
}

const scimitar: Action = {
  id: 'scimitar',
  name: 'Scimitar',
  kind: 'melee',
  toHit: 4,
  damage: [{ formula: '1d6+2', type: 'slashing' }],
  text: 'Melee Attack Roll: +4.',
}

const fireBreath: Action = {
  id: 'fire-breath',
  name: 'Fire Breath',
  kind: 'save',
  toHit: null,
  save: { ability: 'dex', dc: 21, onSave: 'half' },
  damage: [{ formula: '2d6', type: 'fire' }],
  text: 'Dexterity Saving Throw: DC 21.',
}

beforeEach(() => {
  // Force reduced motion so the die settles instantly (no rAF in jsdom tests).
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ActionResolver — attacks', () => {
  it('logs the attack at the selected target, with advantage from an unconscious target', () => {
    const onRoll = vi.fn()
    const ogre = monster({ combatantId: 't', label: 'Ogre', status: 'unconscious' })
    render(
      <ActionResolver
        attacker={monster()}
        action={scimitar}
        combatants={[monster(), ogre]}
        dispatch={vi.fn()}
        onRoll={onRoll}
        onClose={() => {}}
      />,
    )
    // Single target is auto-selected; roll the attack.
    fireEvent.click(screen.getByText('Roll attack'))
    const [label, result, applied] = onRoll.mock.calls[0]
    expect(label).toBe('Goblin: Scimitar → Ogre')
    expect(result.kind).toBe('attack')
    expect(applied).toEqual([{ source: 'Unconscious', effect: 'advantage' }])
  })
})

describe('ActionResolver — save actions', () => {
  it('seeds the DC and ability from the action', () => {
    render(
      <ActionResolver
        attacker={monster()}
        action={fireBreath}
        combatants={[monster(), monster({ combatantId: 't', label: 'Ogre' })]}
        dispatch={vi.fn()}
        onRoll={vi.fn()}
        onClose={() => {}}
      />,
    )
    expect((screen.getByLabelText('Save DC') as HTMLInputElement).value).toBe('21')
    expect((screen.getByLabelText('On save') as HTMLSelectElement).value).toBe('half')
  })
})
