// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { Creature } from '../../src/schema/creature.ts'
import type { MonsterCombatant, PlayerCharacter } from '../../src/schema/combatant.ts'
import { CombatantControls } from '../../src/components/CombatantControls.tsx'

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
    actions: [
      {
        id: 'scimitar',
        name: 'Scimitar',
        kind: 'melee',
        toHit: 4,
        damage: [{ formula: '1d6+2', type: 'slashing' }],
        text: 'Melee Attack Roll: +4.',
      },
    ],
  }
}

function monster(): MonsterCombatant {
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
    limitedUseState: {},
    legendaryRemaining: 0,
    concentration: null,
    effects: [],
    visibility: { name: 'shown', hp: 'bloodied', conditions: 'shown', ac: 'hidden' },
  }
}

function downedPc(over: Partial<PlayerCharacter> = {}): PlayerCharacter {
  return {
    isPC: true,
    combatantId: 'p',
    name: 'Thalia',
    initiative: 18,
    ac: 16,
    passivePerception: 14,
    status: 'unconscious',
    hp: { current: 0, max: 30, temp: 0 },
    concentration: null,
    effects: [],
    deathSaves: { successes: 0, failures: 0 },
    ...over,
  }
}

afterEach(cleanup)

describe('CombatantControls', () => {
  it('dispatches a damage update with the entered amount', () => {
    const dispatch = vi.fn()
    render(
      <CombatantControls
        combatant={monster()}
        combatants={[monster()]}
        round={1}
        dispatch={dispatch}
        onRoll={() => {}}
      />,
    )
    fireEvent.change(screen.getByLabelText(/HP amount/), { target: { value: '3' } })
    fireEvent.click(screen.getByText('Damage'))

    const call = dispatch.mock.calls.find((c) => c[0].type === 'update')
    expect(call?.[0].id).toBe('m')
    expect(call?.[0].update(monster()).hp.current).toBe(4)
  })

  it('dispatches a remove', () => {
    const dispatch = vi.fn()
    render(
      <CombatantControls
        combatant={monster()}
        combatants={[monster()]}
        round={1}
        dispatch={dispatch}
        onRoll={() => {}}
      />,
    )
    fireEvent.click(screen.getByText('Remove'))
    expect(dispatch).toHaveBeenCalledWith({ type: 'remove', id: 'm' })
  })

  it('rolls a monster attack through onRoll', () => {
    const onRoll = vi.fn()
    render(
      <CombatantControls
        combatant={monster()}
        combatants={[monster()]}
        round={1}
        dispatch={vi.fn()}
        onRoll={onRoll}
      />,
    )
    fireEvent.click(screen.getByText('Scimitar +4'))
    expect(onRoll).toHaveBeenCalledOnce()
    const [label, result] = onRoll.mock.calls[0]
    expect(label).toBe('Goblin: Scimitar')
    expect(result.kind).toBe('attack')
  })

  it('shows death-save controls for an unconscious PC, hidden once stable', () => {
    const dispatch = vi.fn()
    const { rerender } = render(
      <CombatantControls
        combatant={downedPc()}
        combatants={[downedPc()]}
        round={1}
        dispatch={dispatch}
        onRoll={() => {}}
      />,
    )
    expect(screen.getByText('Roll death save')).toBeInTheDocument()

    rerender(
      <CombatantControls
        combatant={downedPc({ deathSaves: { successes: 3, failures: 0 } })}
        combatants={[downedPc()]}
        round={1}
        dispatch={dispatch}
        onRoll={() => {}}
      />,
    )
    expect(screen.queryByText('Roll death save')).toBeNull()
  })

  it('prompts a concentration save when a concentrator takes damage and survives', () => {
    const dispatch = vi.fn()
    const conc = (): MonsterCombatant => ({
      ...monster(),
      hp: { current: 30, max: 30, temp: 0 },
      concentration: { spell: 'Hold Person', saveDc: 13, round: 1 },
    })
    render(
      <CombatantControls
        combatant={conc()}
        combatants={[conc()]}
        round={1}
        dispatch={dispatch}
        onRoll={() => {}}
      />,
    )
    fireEvent.change(screen.getByLabelText(/HP amount/), { target: { value: '24' } })
    fireEvent.click(screen.getByText('Damage'))

    expect(screen.getByText('Concentration — DC 12')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Broken'))
    const breakCall = dispatch.mock.calls
      .map((c) => c[0])
      .find((a) => a.type === 'update' && a.update(conc()).concentration === null)
    expect(breakCall).toBeTruthy()
  })

  it('marks a combatant as concentrating', () => {
    const dispatch = vi.fn()
    render(
      <CombatantControls
        combatant={monster()}
        combatants={[monster()]}
        round={3}
        dispatch={dispatch}
        onRoll={() => {}}
      />,
    )
    fireEvent.click(screen.getByText('Concentrate'))
    fireEvent.change(screen.getByLabelText(/Concentration spell/), {
      target: { value: 'Hold Person' },
    })
    fireEvent.click(screen.getByText('Set'))

    const call = dispatch.mock.calls.map((c) => c[0]).find((a) => a.type === 'update')
    const updated = call?.update(monster())
    expect(updated?.concentration).toEqual({ spell: 'Hold Person', saveDc: 0, round: 3 })
  })

  it('toggles the source stat block', () => {
    render(
      <CombatantControls
        combatant={monster()}
        combatants={[monster()]}
        round={1}
        dispatch={vi.fn()}
        onRoll={() => {}}
      />,
    )
    expect(screen.queryByText('Scimitar +4')).toBeTruthy() // chip present
    expect(screen.queryByText(/Passive Perception/)).toBeNull()
    fireEvent.click(screen.getByText('Stat block'))
    expect(screen.getByText(/Passive Perception/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Hide stat block'))
    expect(screen.queryByText(/Passive Perception/)).toBeNull()
  })

  it('opens a seeded group save for a save action (breath weapon)', () => {
    const onRoll = vi.fn()
    const dragon = (): MonsterCombatant => ({
      ...monster(),
      creature: {
        ...creature(),
        actions: [
          {
            id: 'fire-breath',
            name: 'Fire Breath',
            kind: 'save',
            toHit: null,
            save: { ability: 'dex', dc: 21, onSave: 'half' },
            damage: [{ formula: '2d6', type: 'fire' }],
            text: 'Dexterity Saving Throw: DC 21.',
          },
        ],
      },
    })
    render(
      <CombatantControls
        combatant={dragon()}
        combatants={[dragon()]}
        round={1}
        dispatch={vi.fn()}
        onRoll={onRoll}
      />,
    )
    fireEvent.click(screen.getByText(/Fire Breath/))
    // Damage is rolled and logged, and the seeded group save appears.
    expect(onRoll).toHaveBeenCalled()
    const dc = screen.getByLabelText('Save DC') as HTMLInputElement
    expect(dc.value).toBe('21')
    const ability = screen.getByLabelText('Save ability') as HTMLSelectElement
    expect(ability.value).toBe('dex')
  })

  it('aims an attack at a selected target and notes it in the log', () => {
    const onRoll = vi.fn()
    const targetMon: MonsterCombatant = {
      ...monster(),
      combatantId: 't',
      label: 'Ogre',
      status: 'unconscious',
    }
    render(
      <CombatantControls
        combatant={monster()}
        combatants={[monster(), targetMon]}
        round={1}
        dispatch={vi.fn()}
        onRoll={onRoll}
      />,
    )
    fireEvent.change(screen.getByLabelText(/Attack target/), { target: { value: 't' } })
    fireEvent.click(screen.getByText('Scimitar +4'))

    const [label, , applied] = onRoll.mock.calls[0]
    expect(label).toBe('Goblin: Scimitar → Ogre')
    // An unconscious target grants advantage.
    expect(applied).toEqual([{ source: 'Unconscious', effect: 'advantage' }])
  })
})
