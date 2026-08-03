// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { Creature } from '../../src/schema/creature.ts'
import type { MonsterCombatant, PlayerCharacter } from '../../src/schema/combatant.ts'
import type { Effect } from '../../src/schema/effect.ts'
import { CombatantControls } from '../../src/components/CombatantControls.tsx'
import { condition, counter, reminder, setCount } from '../../src/combat/effects.ts'

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
  it('toggles the reaction', () => {
    const dispatch = vi.fn()
    render(
      <CombatantControls
        combatant={monster()}
        round={1}
        dispatch={dispatch}
        onRoll={() => {}}
        onGmRoll={() => {}}
      />,
    )
    fireEvent.click(screen.getByText('Use reaction'))
    const call = dispatch.mock.calls[0][0]
    expect(call.type).toBe('update')
    expect(call.id).toBe('m')
    expect(call.update(monster()).reactionUsed).toBe(true)
  })

  // A summons, a hired guard, an ogre the bard just charmed: which side a creature is
  // on is the GM's to change mid-fight, and it decides what the table's screen holds back.
  it('turns a creature into an ally and back', () => {
    const dispatch = vi.fn()
    render(
      <CombatantControls
        combatant={monster()}
        round={1}
        dispatch={dispatch}
        onRoll={() => {}}
        onGmRoll={() => {}}
      />,
    )
    fireEvent.click(screen.getByText('Make ally'))
    expect(dispatch.mock.calls[0][0].update(monster()).side).toBe('friend')

    cleanup()
    render(
      <CombatantControls
        combatant={{ ...monster(), side: 'friend' }}
        round={1}
        dispatch={dispatch}
        onRoll={() => {}}
        onGmRoll={() => {}}
      />,
    )
    fireEvent.click(screen.getByText('Ally'))
    expect(dispatch.mock.calls[1][0].update({ ...monster(), side: 'friend' }).side).toBe('foe')
  })

  it('holds a creature off the shared screen, and puts it back', () => {
    const dispatch = vi.fn()
    render(
      <CombatantControls
        combatant={monster()}
        round={1}
        dispatch={dispatch}
        onRoll={() => {}}
        onGmRoll={() => {}}
      />,
    )
    fireEvent.click(screen.getByText('Hide from players'))
    expect(dispatch.mock.calls[0][0].update(monster()).shared).toBe('hidden')

    cleanup()
    render(
      <CombatantControls
        combatant={{ ...monster(), shared: 'hidden' }}
        round={1}
        dispatch={dispatch}
        onRoll={() => {}}
        onGmRoll={() => {}}
      />,
    )
    fireEvent.click(screen.getByText('Show to players'))
    expect(dispatch.mock.calls[1][0].update({ ...monster(), shared: 'hidden' }).shared).toBe(
      'shown',
    )
  })

  it('names the reveal before the fight, when every foe is off the shared screen', () => {
    render(
      <CombatantControls
        combatant={monster()}
        round={0}
        dispatch={vi.fn()}
        onRoll={() => {}}
        onGmRoll={() => {}}
      />,
    )
    // Not yet started is not the same as held back: the button offers the reveal, and
    // nothing marks the creature as one the GM chose to hide.
    const button = screen.getByText('Show to players')
    expect(button.getAttribute('aria-pressed')).toBe('false')
  })

  it('offers no shared-screen control for a player character', () => {
    render(
      <CombatantControls
        combatant={downedPc()}
        round={1}
        dispatch={vi.fn()}
        onRoll={() => {}}
        onGmRoll={() => {}}
      />,
    )
    expect(screen.queryByText('Hide from players')).toBeNull()
  })

  it('offers no side control for a player character', () => {
    render(
      <CombatantControls
        combatant={downedPc()}
        round={1}
        dispatch={vi.fn()}
        onRoll={() => {}}
        onGmRoll={() => {}}
      />,
    )
    expect(screen.queryByText('Make ally')).toBeNull()
  })

  it('shows death-save controls for an unconscious PC, hidden once stable', () => {
    const dispatch = vi.fn()
    const { rerender } = render(
      <CombatantControls
        combatant={downedPc()}
        round={1}
        dispatch={dispatch}
        onRoll={() => {}}
        onGmRoll={() => {}}
      />,
    )
    expect(screen.getByText('Roll death save')).toBeInTheDocument()

    rerender(
      <CombatantControls
        combatant={downedPc({ deathSaves: { successes: 3, failures: 0 } })}
        round={1}
        dispatch={dispatch}
        onRoll={() => {}}
        onGmRoll={() => {}}
      />,
    )
    expect(screen.queryByText('Roll death save')).toBeNull()
  })

  it('marks a combatant as concentrating', () => {
    const dispatch = vi.fn()
    render(
      <CombatantControls
        combatant={monster()}
        round={3}
        dispatch={dispatch}
        onRoll={() => {}}
        onGmRoll={() => {}}
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

  describe('applied effects', () => {
    const withEffects = (): MonsterCombatant => ({
      ...monster(),
      effects: [
        condition('Prone'),
        condition('Paralyzed', {
          source: 'caster',
          duration: { type: 'saveEnds', save: { ability: 'wis', dc: 15 } },
        }),
      ],
    })

    it('lists each effect with how it ends, alphabetically', () => {
      render(
        <CombatantControls
          combatant={withEffects()}
          round={1}
          dispatch={vi.fn()}
          onRoll={() => {}}
          onGmRoll={() => {}}
        />,
      )
      const rows = screen.getAllByRole('listitem').map((li) => li.textContent)
      expect(rows[0]).toContain('Paralyzed')
      expect(rows[0]).toContain('WIS save DC 15')
      expect(rows[1]).toContain('Prone')
      expect(rows[1]).toContain('until removed')
    })

    it('rolls one save per effect, not one for the whole list', () => {
      render(
        <CombatantControls
          combatant={withEffects()}
          round={1}
          dispatch={vi.fn()}
          onRoll={() => {}}
          onGmRoll={() => {}}
        />,
      )
      // Only the save-ends effect offers a roll; Prone has nothing to roll against.
      expect(screen.getAllByRole('button', { name: 'Roll save' })).toHaveLength(1)
      expect(screen.getAllByRole('button', { name: 'Clear' })).toHaveLength(2)
    })

    it('clears every effect at once from the controls', () => {
      const dispatch = vi.fn()
      render(
        <CombatantControls
          combatant={withEffects()}
          round={1}
          dispatch={dispatch}
          onRoll={() => {}}
          onGmRoll={() => {}}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Clear effects' }))
      const call = dispatch.mock.calls.map((c) => c[0]).find((a) => a.type === 'update')
      expect(call.update(withEffects()).effects).toEqual([])
    })

    const withCounter = (start: number): MonsterCombatant => ({
      ...monster(),
      effects: [setCount(counter('Depth'), start)],
    })

    /** The effects the update handler in the first `update` dispatch produces. */
    const effectsAfter = (dispatch: ReturnType<typeof vi.fn>, before: MonsterCombatant) => {
      const call = dispatch.mock.calls.map((c) => c[0]).find((a) => a.type === 'update')
      return call.update(before).effects
    }

    it('raises and lowers a counter from its row', () => {
      const dispatch = vi.fn()
      const before = withCounter(3)
      render(
        <CombatantControls
          combatant={before}
          round={1}
          dispatch={dispatch}
          onRoll={() => {}}
          onGmRoll={() => {}}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Raise Depth' }))
      expect(effectsAfter(dispatch, before)[0].duration).toEqual({ type: 'counter', count: 4 })

      dispatch.mockClear()
      fireEvent.click(screen.getByRole('button', { name: 'Lower Depth' }))
      expect(effectsAfter(dispatch, before)[0].duration).toEqual({ type: 'counter', count: 2 })
    })

    it('resets a counter to zero while keeping it on the combatant', () => {
      const dispatch = vi.fn()
      const before = withCounter(5)
      render(
        <CombatantControls
          combatant={before}
          round={1}
          dispatch={dispatch}
          onRoll={() => {}}
          onGmRoll={() => {}}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
      const effects = effectsAfter(dispatch, before)
      expect(effects).toHaveLength(1)
      expect(effects[0].duration).toEqual({ type: 'counter', count: 0 })
    })

    it('can’t take a counter below zero — Lower and Reset are disabled at 0', () => {
      render(
        <CombatantControls
          combatant={withCounter(0)}
          round={1}
          dispatch={vi.fn()}
          onRoll={() => {}}
          onGmRoll={() => {}}
        />,
      )
      expect(screen.getByRole('button', { name: 'Lower Depth' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Raise Depth' })).toBeEnabled()
    })

    it('shows the tally in the row and offers no counter buttons on other effects', () => {
      render(
        <CombatantControls
          combatant={withEffects()}
          round={1}
          dispatch={vi.fn()}
          onRoll={() => {}}
          onGmRoll={() => {}}
        />,
      )
      expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull()
      cleanup()
      render(
        <CombatantControls
          combatant={withCounter(4)}
          round={1}
          dispatch={vi.fn()}
          onRoll={() => {}}
          onGmRoll={() => {}}
        />,
      )
      expect(screen.getAllByRole('listitem')[0].textContent).toContain('at 4')
    })

    it('offers nothing to clear when there are no effects', () => {
      render(
        <CombatantControls
          combatant={monster()}
          round={1}
          dispatch={vi.fn()}
          onRoll={() => {}}
          onGmRoll={() => {}}
        />,
      )
      expect(screen.queryByRole('button', { name: 'Clear effects' })).toBeNull()
      expect(screen.queryByText('Applied effects')).toBeNull()
    })

    const bundle = { id: 'b1', name: 'Drunk' }
    const withBundle = (): MonsterCombatant => ({
      ...monster(),
      effects: [
        condition('Poisoned', { bundle, duration: { type: 'rounds', rounds: 600 } }),
        reminder('Rough morning', 'Rough morning', { bundle }),
        condition('Prone'),
      ],
    })

    it('lists a bundle under its own name with its members beneath it', () => {
      render(
        <CombatantControls
          combatant={withBundle()}
          round={1}
          dispatch={vi.fn()}
          onRoll={() => {}}
          onGmRoll={() => {}}
        />,
      )
      expect(screen.getByText('Drunk')).toBeInTheDocument()
      expect(screen.getByText('Poisoned')).toBeInTheDocument()
      expect(screen.getByText('Rough morning')).toBeInTheDocument()
      // One Clear all for the bundle; one Clear per member, plus the loose Prone's.
      expect(screen.getAllByRole('button', { name: 'Clear all' })).toHaveLength(1)
      expect(screen.getAllByRole('button', { name: 'Clear' })).toHaveLength(3)
    })

    it('clears the whole bundle from its header, one member at a time underneath', () => {
      const dispatch = vi.fn()
      const before = withBundle()
      render(
        <CombatantControls
          combatant={before}
          round={1}
          dispatch={dispatch}
          onRoll={() => {}}
          onGmRoll={() => {}}
        />,
      )
      fireEvent.click(screen.getByTitle('Clear Drunk and everything it applied'))
      // One remove per member; folding them over the combatant leaves only Prone.
      const updates = dispatch.mock.calls.map((c) => c[0]).filter((a) => a.type === 'update')
      const after = updates.reduce((c, a) => a.update(c), before)
      expect(after.effects.map((e: Effect) => e.name)).toEqual(['Prone'])
    })

    it('hides an effect from the player view and shows it again from its row', () => {
      const dispatch = vi.fn()
      const before: MonsterCombatant = { ...monster(), effects: [condition('Prone')] }
      render(
        <CombatantControls
          combatant={before}
          round={1}
          dispatch={dispatch}
          onRoll={() => {}}
          onGmRoll={() => {}}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Hide' }))
      expect(effectsAfter(dispatch, before)[0].gmOnly).toBe(true)
    })

    it('marks a hidden effect and offers to show it', () => {
      const dispatch = vi.fn()
      const hidden: MonsterCombatant = {
        ...monster(),
        effects: [{ ...condition('Prone'), gmOnly: true }],
      }
      render(
        <CombatantControls
          combatant={hidden}
          round={1}
          dispatch={dispatch}
          onRoll={() => {}}
          onGmRoll={() => {}}
        />,
      )
      const toggle = screen.getByRole('button', { name: 'Hidden' })
      expect(toggle).toHaveAttribute('aria-pressed', 'true')
      fireEvent.click(toggle)
      expect(effectsAfter(dispatch, hidden)[0].gmOnly).toBeUndefined()
    })
  })
})
