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
    expect(dice.filter((el) => el.className.includes('font-semibold'))).toHaveLength(1)
    expect(dice.filter((el) => el.className.includes('font-bold'))).toHaveLength(1)
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
