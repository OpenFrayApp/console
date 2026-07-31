// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { Creature } from '../../src/schema/creature.ts'
import type { MonsterCombatant } from '../../src/schema/combatant.ts'
import type { Spell } from '../../src/schema/spell.ts'
import { SpellResolution } from '../../src/components/SpellResolution.tsx'

/** A minimal goblin template for the group-save target. */
function creature(): Creature {
  return {
    id: 'srd:goblin',
    source: 'srd-5.2',
    name: 'Goblin',
    size: 'Small',
    type: 'humanoid',
    ac: 15,
    maxHp: 30,
    speed: { walk: 30 },
    abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
    senses: { passivePerception: 9 },
  }
}

/** A monster combatant the seeded group save can target. */
function monster(): MonsterCombatant {
  return {
    isPC: false,
    combatantId: 'a',
    creatureId: 'srd:goblin',
    creature: creature(),
    label: 'Goblin A',
    initiative: 12,
    status: 'active',
    hp: { current: 30, max: 30, temp: 0 },
    slotsUsed: {},
    spellUsesSpent: {},
    limitedUseState: {},
    legendaryRemaining: 0,
    concentration: null,
    effects: [],
    visibility: { name: 'shown', hp: 'bloodied', conditions: 'shown', ac: 'hidden' },
  }
}

/** A spell fixture; overrides add level, school, and mechanics. */
function spell(name: string, over: Partial<Spell> = {}): Spell {
  return {
    id: `srd-5.2:${name.toLowerCase().replace(/ /g, '-')}`,
    source: 'srd-5.2',
    name,
    level: 1,
    school: 'Evocation',
    castingTime: 'action',
    range: '60 feet',
    components: { verbal: true, somatic: true, material: false },
    duration: 'instantaneous',
    concentration: false,
    ritual: false,
    text: '',
    ...over,
  }
}

/** A cantrip resolved by a spell attack roll (1d10 fire). */
const fireBolt = (): Spell =>
  spell('Fire Bolt', {
    level: 0,
    mechanics: { damage: [{ formula: '1d10', type: 'fire' }], attackRoll: true },
  })

/** A save-plus-damage spell with one upcast variant. */
const fireball = (): Spell =>
  spell('Fireball', {
    level: 3,
    mechanics: {
      damage: [{ formula: '8d6', type: 'fire' }],
      save: { ability: 'dex', onSave: 'half' },
      scaling: [{ level: 4, by: 'slot', damage: [{ formula: '9d6', type: 'fire' }] }],
    },
  })

/** Render the resolution with mocked callbacks, returning them for assertions. */
function renderResolution(sp: Spell, extra: { saveDc?: number } = {}) {
  const onRoll = vi.fn()
  const onClose = vi.fn()
  const dispatch = vi.fn()
  const view = render(
    <SpellResolution
      spell={sp}
      combatants={[monster()]}
      dispatch={dispatch}
      onRoll={onRoll}
      onClose={onClose}
      saveDc={extra.saveDc}
    />,
  )
  return { onRoll, onClose, dispatch, view }
}

afterEach(cleanup)

describe('SpellResolution', () => {
  it('renders nothing for a spell with no mechanics', () => {
    const { view } = renderResolution(spell('Detect Magic'))
    expect(view.container.firstChild).toBeNull()
  })

  it('notes when the mechanics carry nothing to auto-resolve', () => {
    renderResolution(spell('Gust', { level: 0, school: 'Transmutation', mechanics: {} }))
    expect(
      screen.getByText('No automatic effect to resolve — Cantrip Transmutation.'),
    ).toBeInTheDocument()
  })

  it('rolls attack-spell damage through the log and shows the total', () => {
    const { onRoll } = renderResolution(fireBolt())
    expect(screen.getByText(/Spell attack — roll to hit/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Roll damage' }))

    // The CSPRNG owns the number; assert it is a legal 1d10 and matches the display.
    expect(onRoll).toHaveBeenCalledTimes(1)
    const [label, result] = onRoll.mock.calls[0]
    expect(label).toBe('Fire Bolt · Cantrip')
    expect(result.total).toBeGreaterThanOrEqual(1)
    expect(result.total).toBeLessThanOrEqual(10)
    expect(screen.getByText(String(result.total))).toBeInTheDocument()
    expect(screen.getByText('(1d10 fire)')).toBeInTheDocument()
  })

  it('resolves a save-only spell immediately, seeded from the caster DC', () => {
    const holdPerson = spell('Hold Person', {
      level: 2,
      school: 'Enchantment',
      mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    })
    const { onClose } = renderResolution(holdPerson, { saveDc: 13 })
    expect(screen.queryByRole('button', { name: 'Roll damage' })).toBeNull()
    expect(screen.getByText('Hold Person — save')).toBeInTheDocument()
    expect((screen.getByLabelText('Save ability') as HTMLSelectElement).value).toBe('wis')
    expect((screen.getByLabelText('Save DC') as HTMLInputElement).value).toBe('13')
    expect((screen.getByLabelText('On save') as HTMLSelectElement).value).toBe('negates')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('gates the save on rolling damage first, then seeds the rolled total', () => {
    const { onRoll } = renderResolution(fireball(), { saveDc: 15 })
    expect(screen.getByText('Roll damage to resolve the DEX save.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Roll saves' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Roll damage' }))
    const total = onRoll.mock.calls[0][1].total
    expect(screen.getByText('Fireball — save')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Select Goblin A'))
    fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
    expect((screen.getByLabelText('Damage') as HTMLInputElement).value).toBe(String(total))
  })

  it('re-seeds the damage on a reroll and keeps the saves already settled', () => {
    const { onRoll } = renderResolution(fireball(), { saveDc: 15 })
    fireEvent.click(screen.getByRole('button', { name: 'Roll damage' }))
    fireEvent.click(screen.getByLabelText('Select Goblin A'))
    fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))

    fireEvent.click(screen.getByRole('button', { name: 'Reroll damage' }))
    const rerolled = onRoll.mock.calls[1][1].total

    expect((screen.getByLabelText('Damage') as HTMLInputElement).value).toBe(String(rerolled))
    // The card stayed put: the target is still selected and its row still resolved.
    expect((screen.getByLabelText('Select Goblin A') as HTMLInputElement).checked).toBe(true)
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument()
  })

  it('offers upcast variants and re-arms the roll on change', () => {
    const { onRoll } = renderResolution(fireball())
    const select = screen.getByLabelText('Cast level') as HTMLSelectElement
    expect([...select.options].map((o) => o.textContent)).toEqual(['Level 3', 'Slot 4'])

    fireEvent.click(screen.getByRole('button', { name: 'Roll damage' }))
    expect(screen.getByText('(8d6 fire)')).toBeInTheDocument()

    // Switching level clears the stale roll before the next one.
    fireEvent.change(select, { target: { value: 'slot-4' } })
    expect(screen.queryByText('(8d6 fire)')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Roll damage' }))
    expect(onRoll).toHaveBeenLastCalledWith('Fireball · Slot 4', expect.anything())
    expect(screen.getByText('(9d6 fire)')).toBeInTheDocument()
  })
})
