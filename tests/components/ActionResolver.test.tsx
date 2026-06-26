// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { Creature } from '../../src/schema/creature.ts'
import type { MonsterCombatant } from '../../src/schema/combatant.ts'
import type { Action } from '../../src/schema/action.ts'
import type { Spell } from '../../src/schema/spell.ts'
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
    const dispatch = vi.fn()
    const ogre = monster({ combatantId: 't', label: 'Ogre', status: 'unconscious' })
    render(
      <ActionResolver
        attacker={monster()}
        action={scimitar}
        combatants={[monster(), ogre]}
        dispatch={dispatch}
        onRoll={vi.fn()}
        onClose={() => {}}
      />,
    )
    // Single target is auto-selected; roll the attack.
    fireEvent.click(screen.getByText('Roll attack'))
    // The attack is now one merged log entry dispatched to the encounter (to-hit +
    // outcome + damage), not a separate onRoll call.
    const logAction = dispatch.mock.calls.map((c) => c[0]).find((a) => a.type === 'log')
    expect(logAction).toBeTruthy()
    const { entry } = logAction
    expect(entry.message).toBe('Goblin: Scimitar → Ogre')
    expect(entry.result.kind).toBe('attack')
    expect(entry.applied).toEqual([{ source: 'Unconscious', effect: 'advantage' }])
    expect(['hit', 'crit', 'miss']).toContain(entry.outcome)
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

  it("applies a save spell's board effect to the targets that fail", () => {
    const dispatch = vi.fn()
    const bane: Spell = {
      id: 'srd-5.2:bane',
      source: 'srd-5.2',
      name: 'Bane',
      level: 1,
      school: 'Enchantment',
      castingTime: 'action',
      range: '30 feet',
      components: { verbal: true, somatic: true, material: true },
      duration: 'up to 1 minute',
      concentration: true,
      ritual: false,
      text: '',
    }
    // A Charisma save the target can't make (DC 99 → guaranteed failure).
    const baneAction: Action = {
      id: 'spell:bane',
      name: 'Bane',
      kind: 'save',
      toHit: null,
      save: { ability: 'cha', dc: 99, onSave: 'negates' },
      text: '',
    }
    render(
      <ActionResolver
        attacker={monster()}
        action={baneAction}
        combatants={[monster(), monster({ combatantId: 't', label: 'Ogre' })]}
        dispatch={dispatch}
        onRoll={vi.fn()}
        spell={bane}
        onClose={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Ogre/ })) // select the target
    fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
    fireEvent.click(screen.getByRole('button', { name: /Apply Bane/ }))

    const update = dispatch.mock.calls
      .map((c) => c[0])
      .find((a) => a.type === 'update' && a.id === 't')
    expect(update).toBeTruthy()
    const after = update.update(monster({ combatantId: 't', label: 'Ogre' }))
    const bless = after.effects.find((e: { name: string }) => e.name === 'Bane')
    expect(bless).toBeTruthy()
    expect(bless.modifier).toMatchObject({ mode: 'flatBonus', value: '-1d4' })
  })
})
