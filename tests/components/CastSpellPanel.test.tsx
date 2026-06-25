// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { MonsterCombatant } from '../../src/schema/combatant.ts'
import type { Spell } from '../../src/schema/spell.ts'
import type { Creature } from '../../src/schema/creature.ts'

const spellBase = {
  source: 'srd-5.2',
  school: 'Evocation',
  castingTime: 'action',
  range: '150 feet',
  components: { verbal: true, somatic: true, material: false },
  duration: 'instantaneous',
  concentration: false,
  ritual: false,
  text: '',
} as const

const FIREBALL: Spell = {
  ...spellBase,
  id: 'srd-5.2:fireball',
  name: 'Fireball',
  level: 3,
  mechanics: {
    damage: [{ formula: '8d6', type: 'fire' }],
    save: { ability: 'dex', onSave: 'half' },
    scaling: [{ level: 4, by: 'slot', damage: [{ formula: '9d6', type: 'fire' }] }],
  },
}

const LIGHT: Spell = {
  ...spellBase,
  id: 'srd-5.2:light',
  name: 'Light',
  level: 0,
  // no mechanics — a utility spell, not castable here
}

vi.mock('../../src/compendium/srd.ts', () => ({
  loadSrdSpells: () => Promise.resolve([FIREBALL, LIGHT]),
  loadSrdCreatures: () => Promise.resolve([]),
}))

const { CastSpellPanel } = await import('../../src/components/CastSpellPanel.tsx')

function creature(): Creature {
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
  }
}

function monster(): MonsterCombatant {
  return {
    isPC: false,
    combatantId: 'g1',
    creatureId: 'srd:goblin',
    creature: creature(),
    label: 'Goblin (A)',
    initiative: 17,
    status: 'active',
    hp: { current: 7, max: 7, temp: 0 },
    slotsUsed: {},
    spellUsesSpent: {},
    limitedUseState: {},
    legendaryRemaining: 0,
    concentration: null,
    effects: [],
    visibility: { name: 'shown', hp: 'bloodied', conditions: 'shown', ac: 'hidden' },
  }
}

afterEach(cleanup)

describe('CastSpellPanel', () => {
  it('lists all spells (incl. buffs) and opens a save spell in the mass-save modal', async () => {
    const onRoll = vi.fn()
    const dispatch = vi.fn()
    render(<CastSpellPanel combatants={[monster()]} dispatch={dispatch} onRoll={onRoll} />)

    fireEvent.click(screen.getByText('Cast spell'))
    await waitFor(() => expect(screen.getByText('Fireball')).toBeTruthy())
    // A no-mechanics utility/buff spell is listed too (so Bless et al. are castable).
    expect(screen.getByText('Light')).toBeTruthy()

    fireEvent.click(screen.getByText('Fireball'))
    // A save spell opens the same group-save modal a monster's save action uses,
    // seeded from the spell (DEX save, GM-editable DC) — no upcast selector.
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getAllByText(/DEX save/i).length).toBeGreaterThan(0)
    expect(screen.getByLabelText('Save DC')).toBeTruthy()
    expect(screen.queryByLabelText('Cast level')).toBeNull()
    expect(screen.getByText('Roll saves')).toBeTruthy()
  })

  it('shows the reference card for a buff spell with no rollable mechanics', async () => {
    render(<CastSpellPanel combatants={[monster()]} dispatch={vi.fn()} onRoll={vi.fn()} />)
    fireEvent.click(screen.getByText('Cast spell'))
    await waitFor(() => expect(screen.getByText('Light')).toBeTruthy())
    fireEvent.click(screen.getByText('Light'))
    expect(screen.getByText(/Cast Light/)).toBeTruthy()
    // The card lists reference fields rather than a roll button.
    expect(screen.getByText('Casting Time')).toBeTruthy()
    expect(screen.queryByText('Roll damage')).toBeNull()
  })

  it('lists only spells from enabled libraries', async () => {
    render(
      <CastSpellPanel
        combatants={[monster()]}
        dispatch={vi.fn()}
        onRoll={vi.fn()}
        enabledLibraries={['srd-5.1']}
      />,
    )
    fireEvent.click(screen.getByText('Cast spell'))
    // Both mocked spells are srd-5.2, so none show when only 5.1 is enabled.
    await waitFor(() => expect(screen.getByText('No matches')).toBeTruthy())
    expect(screen.queryByText('Fireball')).toBeNull()
  })

  it('disables casting with no combatants', () => {
    render(<CastSpellPanel combatants={[]} dispatch={vi.fn()} onRoll={vi.fn()} />)
    expect((screen.getByText('Cast spell') as HTMLButtonElement).disabled).toBe(true)
  })
})
