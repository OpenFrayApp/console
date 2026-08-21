// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { MonsterCombatant } from '../../../src/schema/combatant.ts'
import type { Action } from '../../../src/schema/action.ts'
import type { Spell } from '../../../src/schema/spell.ts'
import { ActionResolver } from '../../../src/components/resolve/ActionResolver.tsx'
import { exhaustionEffects } from '../../../src/combat/exhaustion.ts'
import { monster as goblin } from '../../fixtures.ts'

/** The attacking goblin ('m', label 'Goblin'); overrides shape it into targets. */
function monster(over: Partial<MonsterCombatant> = {}): MonsterCombatant {
  return goblin({ combatantId: 'm', label: 'Goblin', initiative: 12, ...over })
}

const scimitar: Action = {
  id: 'scimitar',
  name: 'Scimitar',
  kind: 'melee',
  toHit: 4,
  damage: [{ formula: '1d6+2', type: 'slashing' }],
  text: 'Melee Attack Roll: +4.',
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

describe('ActionResolver — attacks', () => {
  /** Every `log` action the resolver dispatched, in order. */
  const logs = (dispatch: ReturnType<typeof vi.fn>) =>
    dispatch.mock.calls.map((c) => c[0]).filter((a) => a.type === 'log')

  it('logs the attack at the selected target, with advantage from an unconscious target', () => {
    const dispatch = vi.fn()
    const ogre = monster({ combatantId: 't', label: 'Ogre', status: 'unconscious' })
    const { unmount } = render(
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
    unmount()
    // The attack is one merged log entry dispatched to the encounter (to-hit +
    // outcome + damage), not a separate onRoll call.
    const [logAction] = logs(dispatch)
    expect(logAction).toBeTruthy()
    const { entry } = logAction
    expect(entry.message).toBe('Goblin: Scimitar → Ogre')
    expect(entry.result.kind).toBe('attack')
    expect(entry.applied).toEqual([{ source: 'Unconscious', effect: 'advantage' }])
    expect(['hit', 'crit', 'miss']).toContain(entry.outcome)
  })

  // A great many creatures cost a failed save one level, from the Troll's missing
  // limbs to a salt devil's scimitar. None of that is data on the action — the
  // stat-block text is display-only — so the chip serves all of them.
  it('raises the target’s Exhaustion by one from the condition chips', () => {
    const dispatch = vi.fn()
    const ogre = monster({ combatantId: 't', label: 'Ogre', effects: exhaustionEffects(1, '5.5') })
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
    fireEvent.click(screen.getByText('Roll attack'))
    fireEvent.click(screen.getByRole('button', { name: '+1 Exhaustion' }))
    expect(dispatch.mock.calls.map((c) => c[0]).filter((a) => a.type === 'setExhaustion')).toEqual([
      { type: 'setExhaustion', id: 't', level: 2, edition: '5.5' },
    ])
  })

  // A creature is Frightened or it is not, so the chip is the target's state and not a
  // button that stacks — tapping it twice used to leave two identical badges on the row.
  it('lights the chip for a condition the target already has, and clears it on a second tap', () => {
    const dispatch = vi.fn()
    const frightened = monster({
      combatantId: 't',
      label: 'Ogre',
      effects: [
        {
          id: 'e1',
          name: 'Frightened',
          icon: 'condition',
          modifier: null,
          duration: { type: 'manual' },
        },
      ],
    })
    render(
      <ActionResolver
        attacker={monster()}
        action={scimitar}
        combatants={[monster(), frightened]}
        dispatch={dispatch}
        onRoll={vi.fn()}
        onClose={() => {}}
      />,
    )
    fireEvent.click(screen.getByText('Roll attack'))
    const chip = screen.getByRole('button', { name: 'Frightened' })
    expect(chip).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(chip)
    const updates = dispatch.mock.calls.map((c) => c[0]).filter((a) => a.type === 'update')
    expect(updates).toHaveLength(1)
    expect(updates[0].update(frightened).effects).toEqual([])
  })

  it('applies a condition the target does not have, without a second copy', () => {
    const dispatch = vi.fn()
    const target = monster({ combatantId: 't', label: 'Ogre' })
    render(
      <ActionResolver
        attacker={monster()}
        action={scimitar}
        combatants={[monster(), target]}
        dispatch={dispatch}
        onRoll={vi.fn()}
        onClose={() => {}}
      />,
    )
    fireEvent.click(screen.getByText('Roll attack'))
    const chip = screen.getByRole('button', { name: 'Prone' })
    expect(chip).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(chip)
    const updates = dispatch.mock.calls.map((c) => c[0]).filter((a) => a.type === 'update')
    expect(updates).toHaveLength(1)
    const after = updates[0].update(target)
    expect(after.effects.map((e: { name: string }) => e.name)).toEqual(['Prone'])
  })

  // A Game Master fishing for a hit used to leave every attempt in the log, and the
  // shared player view showed the table all of them.
  it('records nothing until it closes, then one entry however often it was rerolled', () => {
    const dispatch = vi.fn()
    const ogre = monster({ combatantId: 't', label: 'Ogre' })
    const { unmount } = render(
      <ActionResolver
        attacker={monster()}
        action={scimitar}
        combatants={[monster(), ogre]}
        dispatch={dispatch}
        onRoll={vi.fn()}
        onClose={() => {}}
      />,
    )
    fireEvent.click(screen.getByText('Roll attack'))
    expect(logs(dispatch)).toHaveLength(0)
    fireEvent.click(screen.getByText('Reroll'))
    fireEvent.click(screen.getByText('Reroll'))
    expect(logs(dispatch)).toHaveLength(0)

    unmount()
    const recorded = logs(dispatch)
    expect(recorded).toHaveLength(1)
    // And it is the roll that stood: the one on screen when the modal closed.
    expect(recorded[0].entry.message).toBe('Goblin: Scimitar → Ogre')
  })

  // Held lines are recorded before the board changes, so the log reads in the order
  // it happened rather than putting the damage above the attack that dealt it.
  it('records the attack before the damage it dealt', () => {
    const dispatch = vi.fn()
    const ogre = monster({ combatantId: 't', label: 'Ogre' })
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
    fireEvent.click(screen.getByText('Roll attack'))
    fireEvent.click(screen.getByText(/^Apply to /))

    const kinds = dispatch.mock.calls.map((c) => c[0].type)
    expect(kinds.indexOf('log')).toBeGreaterThanOrEqual(0)
    expect(kinds.indexOf('log')).toBeLessThan(kinds.lastIndexOf('update'))
  })
  it('shows both d20s when the roll had advantage, one of them dimmed', () => {
    const ogre = monster({ combatantId: 't', label: 'Ogre', status: 'unconscious' })
    const { container } = render(
      <ActionResolver
        attacker={monster()}
        action={scimitar}
        combatants={[monster(), ogre]}
        dispatch={vi.fn()}
        onRoll={vi.fn()}
        onClose={() => {}}
      />,
    )
    fireEvent.click(screen.getByText('Roll attack'))

    // An Unconscious target grants advantage, so the pair is rolled and both show:
    // the die that counted stands out, the dropped one is dimmed beside it, and the
    // arrow carries them to the total.
    const group = [...container.querySelectorAll('span')].find((el) =>
      /^\[\d+, \d+\] → \d+$/.test(el.textContent ?? ''),
    )
    expect(group).toBeTruthy()
    const dice = [...group!.querySelectorAll('span')]
    expect(dice).toHaveLength(3) // two dice and the total
    // The separator is punctuation, not part of either die — it keeps the muted colour
    // whichever of the two was kept.
    expect(dice.some((el) => el.textContent?.includes(','))).toBe(false)
  })

  /** Render one attack at a single target, reporting how it went. */
  const attackWith = (onResolved: ReturnType<typeof vi.fn>) =>
    render(
      <ActionResolver
        attacker={monster()}
        action={scimitar}
        combatants={[monster(), monster({ combatantId: 't', label: 'Ogre' })]}
        dispatch={vi.fn()}
        onRoll={vi.fn()}
        onResolved={onResolved}
        onClose={() => {}}
      />,
    )

  // What the caller does with this is start concentration — so an attack spell that
  // was opened and abandoned must not leave the caster sustaining anything.
  it('reports nothing when the attack was never rolled', () => {
    const onResolved = vi.fn()
    attackWith(onResolved).unmount()
    expect(onResolved).not.toHaveBeenCalled()
  })

  it('reports whether it landed, once, from the roll that stood', () => {
    const onResolved = vi.fn()
    const { unmount } = attackWith(onResolved)
    fireEvent.click(screen.getByText('Roll attack'))
    fireEvent.click(screen.getByText('Reroll'))
    // The roll is honest, so read the outcome the modal is showing rather than
    // assuming one.
    const landed = ['Hit', 'Critical hit!'].some((t) => screen.queryByText(t) != null)
    unmount()
    expect(onResolved).toHaveBeenCalledTimes(1)
    expect(onResolved).toHaveBeenCalledWith(landed)
  })
})

describe('an attack-roll spell', () => {
  const guidingBolt: Spell = {
    id: 'srd-5.2:guiding-bolt',
    source: 'srd-5.2',
    name: 'Guiding Bolt',
    level: 1,
    school: 'Evocation',
    castingTime: 'action',
    range: '120 feet',
    components: { verbal: true, somatic: true, material: false },
    duration: '1 round',
    concentration: false,
    ritual: false,
    text: '',
    mechanics: { attackRoll: true, damage: [{ formula: '4d6', type: 'radiant' }] },
  }

  const action: Action = {
    id: 'spell:guiding-bolt',
    name: 'Guiding Bolt',
    kind: 'ranged',
    toHit: 5,
    damage: [{ formula: '4d6', type: 'radiant' }],
    text: '',
  }

  /** A player casting: they roll nothing, so they are the caster and never the attacker. */
  const pcCaster = {
    isPC: true,
    combatantId: 'cleric',
    name: 'Hexena',
  } as unknown as MonsterCombatant

  const renderCast = (dispatch = vi.fn()) => {
    const target = monster({ combatantId: 't', label: 'Ogre' })
    render(
      <ActionResolver
        action={action}
        combatants={[pcCaster, target]}
        dispatch={dispatch}
        onRoll={vi.fn()}
        spell={guidingBolt}
        casterId="cleric"
        onClose={() => {}}
      />,
    )
    return { dispatch, target }
  }

  it('names the caster in the title, player or creature', () => {
    renderCast()
    expect(screen.getByText('Hexena · Guiding Bolt')).toBeTruthy()
  })

  it("offers the spell's board effect once the attack is rolled, and applies it to the target", () => {
    const { dispatch, target } = renderCast()
    fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
    fireEvent.click(screen.getByRole('button', { name: 'Roll attack' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply Guiding Bolt to Ogre' }))

    const update = dispatch.mock.calls
      .map((c) => c[0])
      .find((a) => a.type === 'update' && a.id === 't')
    const [effect] = update.update(target).effects
    expect(effect.name).toBe('Guiding Bolt')
    expect(effect.modifier).toMatchObject({ mode: 'advantage', direction: 'incoming' })
    // Sourced to the player who cast it, which is also the turn that ends it.
    expect(effect.source).toBe('cleric')
    expect(effect.duration).toEqual({
      type: 'untilSourceTurn',
      when: 'endOfTurn',
      endsOnRoll: true,
    })
  })

  it('offers nothing before the attack is rolled', () => {
    renderCast()
    fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
    expect(screen.queryByRole('button', { name: /Apply Guiding Bolt/ })).toBeNull()
  })

  it("keys a condition to the caster's turn, which a player caster used to lose", () => {
    const { dispatch, target } = renderCast()
    fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
    fireEvent.click(screen.getByRole('button', { name: 'Roll attack' }))
    fireEvent.change(screen.getByLabelText('Condition duration'), {
      target: { value: 'untilSource' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Prone' }))
    const updates = dispatch.mock.calls
      .map((c) => c[0])
      .filter((a) => a.type === 'update' && a.id === 't')
    const effect = updates[updates.length - 1].update(target).effects.at(-1)
    expect(effect.name).toBe('Prone')
    expect(effect.source).toBe('cleric')
  })
})
