// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { MonsterCombatant } from '../../../src/schema/combatant.ts'
import type { Action } from '../../../src/schema/action.ts'
import type { Spell } from '../../../src/schema/spell.ts'
import { ActionResolver } from '../../../src/components/resolve/ActionResolver.tsx'
import { monster as goblin } from '../../fixtures.ts'

/** The attacking goblin ('m', label 'Goblin'); overrides shape it into targets. */
function monster(over: Partial<MonsterCombatant> = {}): MonsterCombatant {
  return goblin({ combatantId: 'm', label: 'Goblin', initiative: 12, ...over })
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
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener() {},
    removeEventListener() {},
  }))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
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

  it('shows what was rolled, by damage type, like the attack modal does', () => {
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
    fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
    fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))

    // 2d6 fire: the pill carries the roll every target's share is split from.
    const pill = screen.getByText(/^\d+ fire$/)
    expect(pill).toBeInTheDocument()
    const rolled = Number(pill.textContent!.split(' ')[0])
    expect(rolled).toBeGreaterThanOrEqual(2)
    expect(rolled).toBeLessThanOrEqual(12)
  })

  it("leaves a spell's later damage as a reminder on the creatures that failed", () => {
    const dispatch = vi.fn()
    const vitriolic: Spell = {
      id: 'srd-5.2:vitriolic-sphere',
      source: 'srd-5.2',
      name: 'Vitriolic Sphere',
      level: 4,
      school: 'Evocation',
      castingTime: 'action',
      range: '150 feet',
      components: { verbal: true, somatic: true, material: true },
      duration: 'Instantaneous',
      concentration: false,
      ritual: false,
      text: '',
      mechanics: {
        damage: [{ formula: '10d4', type: 'acid' }],
        delayed: { damage: [{ formula: '5d4', type: 'acid' }], when: 'endOfNextTurn' },
        save: { ability: 'dex', onSave: 'half' },
      },
    }
    // DC 99 for the target, so its save is a certain failure.
    const action: Action = {
      id: 'spell:vitriolic-sphere',
      name: 'Vitriolic Sphere',
      kind: 'save',
      toHit: null,
      save: { ability: 'dex', dc: 99, onSave: 'half' },
      damage: [{ formula: '10d4', type: 'acid' }],
      text: '',
    }
    const target = monster({ combatantId: 't', label: 'Ogre' })
    render(
      <ActionResolver
        attacker={monster()}
        action={action}
        combatants={[monster(), target]}
        dispatch={dispatch}
        onRoll={vi.fn()}
        spell={vitriolic}
        onClose={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
    fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply damage' }))

    const update = dispatch.mock.calls
      .map((c) => c[0])
      .find((a) => a.type === 'update' && a.id === 't')
    const [effect] = update.update(target).effects
    expect(effect.name).toBe('Vitriolic Sphere')
    expect(effect.note).toBe('5d4 acid at the end of this turn')
    expect(effect.duration).toEqual({ type: 'rounds', rounds: 1 })
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
