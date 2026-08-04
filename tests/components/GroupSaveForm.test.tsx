// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { Creature } from '../../src/schema/creature.ts'
import type { MonsterCombatant, PlayerCharacter } from '../../src/schema/combatant.ts'
import { GroupSaveForm } from '../../src/components/GroupSaveForm.tsx'
import { exhaustionEffects } from '../../src/combat/exhaustion.ts'

/** A minimal goblin template (dex +2, con +0) for monster fixtures. */
function creature(over: Partial<Creature> = {}): Creature {
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
    ...over,
  }
}

/** A monster combatant on 30 HP with the given id and label. */
function monster(
  id: string,
  label: string,
  over: Partial<MonsterCombatant> = {},
): MonsterCombatant {
  return {
    isPC: false,
    combatantId: id,
    creatureId: 'srd:goblin',
    creature: creature(),
    label,
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
    ...over,
  }
}

/** A lightweight PC on 30 HP — no abilities, so the app never rolls for them. */
function pc(id: string, name: string, over: Partial<PlayerCharacter> = {}): PlayerCharacter {
  return {
    isPC: true,
    kind: 'pc',
    combatantId: id,
    name,
    initiative: 18,
    ac: 16,
    status: 'active',
    hp: { current: 30, max: 30, temp: 0 },
    concentration: null,
    effects: [],
    ...over,
  }
}

/** The form's list row containing the given combatant name. */
function rowOf(name: string): HTMLElement {
  const li = screen.getByText(name).closest('li')
  if (!li) throw new Error(`no row for ${name}`)
  return li
}

/** Unwrap dispatched encounter actions of one type from a dispatch mock. */
const actionsOf = (dispatch: ReturnType<typeof vi.fn>, type: string) =>
  dispatch.mock.calls.map((c) => c[0]).filter((a) => a.type === type)

afterEach(cleanup)

describe('GroupSaveForm', () => {
  it('seeds ability, DC, on-save rule, and damage from the cast', () => {
    render(
      <GroupSaveForm
        combatants={[monster('a', 'Goblin A')]}
        dispatch={vi.fn()}
        onClose={vi.fn()}
        title="Fireball — save"
        seed={{ ability: 'wis', dc: '13', onSave: 'negates', damage: '20' }}
      />,
    )
    expect(screen.getByText('Fireball — save')).toBeInTheDocument()
    expect((screen.getByLabelText('Save ability') as HTMLSelectElement).value).toBe('wis')
    expect((screen.getByLabelText('Save DC') as HTMLInputElement).value).toBe('13')
    expect((screen.getByLabelText('On save') as HTMLSelectElement).value).toBe('negates')

    // The pre-rolled spell damage carries into the damage step.
    fireEvent.click(screen.getByLabelText('Select Goblin A'))
    fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
    expect((screen.getByLabelText('Damage') as HTMLInputElement).value).toBe('20')
  })

  it('rolls monster saves and leaves PC rows for the GM to record', () => {
    render(
      <GroupSaveForm
        combatants={[monster('a', 'Goblin A'), pc('p', 'Thalia')]}
        dispatch={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByLabelText('Select Goblin A'))
    fireEvent.click(screen.getByLabelText('Select Thalia'))
    fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))

    // The monster auto-rolled: its row shows the d20 it rolled, the save total, and
    // the toggles.
    expect(within(rowOf('Goblin A')).getAllByText(/^\d+$/).length).toBeGreaterThanOrEqual(2)
    // The PC row awaits the player's own roll: toggles, but no total.
    expect(within(rowOf('Thalia')).queryByText(/^\d+$/)).toBeNull()
    expect(within(rowOf('Thalia')).getByRole('button', { name: 'Save' })).toBeInTheDocument()
    expect(within(rowOf('Thalia')).getByRole('button', { name: 'Fail' })).toBeInTheDocument()
  })

  it('applies full damage on a failed save and skips an unrecorded PC row', () => {
    const dispatch = vi.fn()
    const onClose = vi.fn()
    render(
      <GroupSaveForm
        combatants={[monster('a', 'Goblin A'), pc('p', 'Thalia')]}
        dispatch={dispatch}
        onClose={onClose}
      />,
    )
    // DC 30 — the goblin's d20+2 cannot reach it, so the roll always fails.
    fireEvent.change(screen.getByLabelText('Save DC'), { target: { value: '30' } })
    fireEvent.click(screen.getByLabelText('Select Goblin A'))
    fireEvent.click(screen.getByLabelText('Select Thalia'))
    fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
    fireEvent.change(screen.getByLabelText('Damage'), { target: { value: '24' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    const updates = actionsOf(dispatch, 'update')
    expect(updates.map((u) => u.id)).toEqual(['a'])
    expect(updates[0].update(monster('a', 'Goblin A')).hp.current).toBe(6)
    // No concentrators → the card closes after applying.
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('splits the damage by the on-save rule when the save is made', () => {
    // DC 1 — the goblin's d20+2 always saves; half → floor(25 / 2) applied.
    const dispatch = vi.fn()
    const { unmount } = render(
      <GroupSaveForm
        combatants={[monster('a', 'Goblin A')]}
        dispatch={dispatch}
        onClose={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByLabelText('Save DC'), { target: { value: '1' } })
    fireEvent.click(screen.getByLabelText('Select Goblin A'))
    fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
    fireEvent.change(screen.getByLabelText('Damage'), { target: { value: '25' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(actionsOf(dispatch, 'update')[0].update(monster('a', 'Goblin A')).hp.current).toBe(18)
    unmount()

    // save → no damage leaves HP untouched.
    const negated = vi.fn()
    render(
      <GroupSaveForm
        combatants={[monster('a', 'Goblin A')]}
        dispatch={negated}
        onClose={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByLabelText('Save DC'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('On save'), { target: { value: 'none' } })
    fireEvent.click(screen.getByLabelText('Select Goblin A'))
    fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
    fireEvent.change(screen.getByLabelText('Damage'), { target: { value: '24' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(actionsOf(negated, 'update')[0].update(monster('a', 'Goblin A')).hp.current).toBe(30)
  })

  it('applies the target’s defenses once the GM names a damage type', () => {
    const dispatch = vi.fn()
    const hound = monster('a', 'Hell Hound', {
      creature: creature({ name: 'Hell Hound', immunities: ['Fire'] }),
    })
    render(<GroupSaveForm combatants={[hound]} dispatch={dispatch} onClose={vi.fn()} />)

    // DC 30 — the hound cannot make the save, so it takes the full share.
    fireEvent.change(screen.getByLabelText('Save DC'), { target: { value: '30' } })
    fireEvent.click(screen.getByLabelText('Select Hell Hound'))
    fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
    fireEvent.change(screen.getByLabelText('Damage'), { target: { value: '15' } })
    fireEvent.change(screen.getByLabelText('Damage type'), { target: { value: 'fire' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(actionsOf(dispatch, 'update')[0].update(hound).hp.current).toBe(30)
  })

  it('rerolls one creature’s save and leaves a recorded PC row alone', () => {
    render(
      <GroupSaveForm
        combatants={[monster('a', 'Goblin A'), pc('p', 'Thalia')]}
        dispatch={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByLabelText('Select Goblin A'))
    fireEvent.click(screen.getByLabelText('Select Thalia'))
    fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
    fireEvent.click(within(rowOf('Thalia')).getByRole('button', { name: 'Save' }))

    // Only the creature can be rerolled — OpenFray never rolls a player's save.
    expect(within(rowOf('Thalia')).queryByRole('button', { name: 'Reroll' })).toBeNull()
    fireEvent.click(within(rowOf('Goblin A')).getByRole('button', { name: 'Reroll' }))

    expect(within(rowOf('Goblin A')).getAllByText(/^\d+$/).length).toBeGreaterThanOrEqual(2)
    expect(within(rowOf('Thalia')).getByRole('button', { name: 'Save' }).className).toContain(
      'emerald',
    )
  })

  it('lets the GM record a PC result and then applies its share', () => {
    const dispatch = vi.fn()
    render(<GroupSaveForm combatants={[pc('p', 'Thalia')]} dispatch={dispatch} onClose={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Select Thalia'))
    fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
    fireEvent.change(screen.getByLabelText('Damage'), { target: { value: '24' } })

    // Nothing recorded yet — applying touches no one.
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(dispatch).not.toHaveBeenCalled()

    fireEvent.click(within(rowOf('Thalia')).getByRole('button', { name: 'Save' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    const updates = actionsOf(dispatch, 'update')
    expect(updates[0].id).toBe('p')
    expect(updates[0].update(pc('p', 'Thalia')).hp.current).toBe(18) // half of 24
  })

  it('applies condition chips to the targets that failed', () => {
    const dispatch = vi.fn()
    render(
      <GroupSaveForm
        combatants={[monster('a', 'Goblin A'), pc('p', 'Thalia')]}
        dispatch={dispatch}
        onClose={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByLabelText('Save DC'), { target: { value: '30' } })
    fireEvent.click(screen.getByLabelText('Select Goblin A'))
    fireEvent.click(screen.getByLabelText('Select Thalia'))
    fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
    fireEvent.click(screen.getByRole('button', { name: 'Prone' }))

    // Only the failed monster is hit; the unrecorded PC is spared.
    const updates = actionsOf(dispatch, 'update')
    expect(updates.map((u) => u.id)).toEqual(['a'])
    const after = updates[0].update(monster('a', 'Goblin A'))
    expect(after.effects).toHaveLength(1)
    expect(after.effects[0].name).toBe('Prone')
    expect(after.effects[0].duration).toEqual({ type: 'manual' })
  })

  it('raises the failed targets’ Exhaustion by one, each from its own level', () => {
    const dispatch = vi.fn()
    render(
      <GroupSaveForm
        combatants={[
          monster('a', 'Goblin A'),
          monster('b', 'Goblin B', {
            effects: exhaustionEffects(2, '5.5'),
          }),
        ]}
        dispatch={dispatch}
        onClose={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByLabelText('Save DC'), { target: { value: '30' } })
    fireEvent.click(screen.getByLabelText('Select Goblin A'))
    fireEvent.click(screen.getByLabelText('Select Goblin B'))
    fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
    fireEvent.click(screen.getByRole('button', { name: '+1 Exhaustion' }))

    // Each starts from what it already carries, not from a shared number.
    expect(actionsOf(dispatch, 'setExhaustion')).toEqual([
      { type: 'setExhaustion', id: 'a', level: 1, edition: '5.5' },
      { type: 'setExhaustion', id: 'b', level: 3, edition: '5.5' },
    ])
  })

  it('queues a concentration check for a damaged, surviving concentrator', () => {
    const dispatch = vi.fn()
    const onClose = vi.fn()
    const concentrator = monster('a', 'Goblin A', {
      concentration: { spell: 'Hold Person', saveDc: 13, round: 1 },
    })
    render(<GroupSaveForm combatants={[concentrator]} dispatch={dispatch} onClose={onClose} />)
    fireEvent.change(screen.getByLabelText('Save DC'), { target: { value: '30' } })
    fireEvent.click(screen.getByLabelText('Select Goblin A'))
    fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
    fireEvent.change(screen.getByLabelText('Damage'), { target: { value: '24' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    // 24 damage → DC max(10, 12); the card waits on the check instead of closing.
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByText('Concentration checks')).toBeInTheDocument()
    expect(screen.getByText('Concentration — DC 12')).toBeInTheDocument()
    // A monster gets the optional in-app roll offered.
    expect(screen.getByRole('button', { name: 'Roll CON save' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Maintained' }))
    expect(actionsOf(dispatch, 'endConcentration')).toHaveLength(0)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('never offers the in-app concentration roll for a PC', () => {
    const thalia = pc('p', 'Thalia', {
      concentration: { spell: 'Bless', saveDc: 13, round: 1 },
    })
    render(<GroupSaveForm combatants={[thalia]} dispatch={vi.fn()} onClose={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Select Thalia'))
    fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
    fireEvent.click(within(rowOf('Thalia')).getByRole('button', { name: 'Fail' }))
    fireEvent.change(screen.getByLabelText('Damage'), { target: { value: '24' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(screen.getByText('Concentration — DC 12')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Roll CON save' })).toBeNull()
  })

  it('rolls the optional in-app concentration check and logs it', () => {
    const dispatch = vi.fn()
    const onClose = vi.fn()
    const onRoll = vi.fn()
    const concentrator = monster('a', 'Goblin A', {
      concentration: { spell: 'Hold Person', saveDc: 13, round: 1 },
    })
    render(
      <GroupSaveForm
        combatants={[concentrator]}
        dispatch={dispatch}
        onClose={onClose}
        onRoll={onRoll}
      />,
    )
    fireEvent.change(screen.getByLabelText('Save DC'), { target: { value: '30' } })
    fireEvent.click(screen.getByLabelText('Select Goblin A'))
    fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
    fireEvent.change(screen.getByLabelText('Damage'), { target: { value: '24' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    fireEvent.click(screen.getByRole('button', { name: 'Roll CON save' }))

    // The CSPRNG decides the outcome; assert the invariants, not the number.
    expect(onRoll).toHaveBeenCalledTimes(1)
    expect(onRoll.mock.calls[0][0]).toBe('Goblin A: concentration')
    expect(onRoll.mock.calls[0][1].total).toBeGreaterThanOrEqual(1)
    for (const a of actionsOf(dispatch, 'endConcentration')) expect(a.id).toBe('a')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('disables rolling until a target is selected, and Cancel closes', () => {
    const onClose = vi.fn()
    render(
      <GroupSaveForm
        combatants={[monster('a', 'Goblin A')]}
        dispatch={vi.fn()}
        onClose={onClose}
      />,
    )
    expect(screen.getByRole('button', { name: 'Roll saves' })).toBeDisabled()
    fireEvent.click(screen.getByLabelText('Select Goblin A'))
    expect(screen.getByRole('button', { name: 'Roll saves' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
