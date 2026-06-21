// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { Creature } from '../../src/schema/creature.ts'
import type {
  MonsterCombatant,
  PlayerCharacter,
} from '../../src/schema/combatant.ts'
import { CombatantRow } from '../../src/components/CombatantRow.tsx'
import { condition } from '../../src/combat/effects.ts'

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

function monster(overrides: Partial<MonsterCombatant> = {}): MonsterCombatant {
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
    ...overrides,
  }
}

function pc(overrides: Partial<PlayerCharacter> = {}): PlayerCharacter {
  return {
    isPC: true,
    combatantId: 'p1',
    name: 'Thalia',
    initiative: 21,
    ac: 16,
    passivePerception: 14,
    status: 'active',
    hp: { current: 38, max: 38, temp: 0 },
    concentration: null,
    effects: [],
    ...overrides,
  }
}

afterEach(cleanup)

describe('CombatantRow', () => {
  it('shows the name, HP, and AC', () => {
    render(<CombatantRow combatant={monster()} />)
    expect(screen.getByText('Goblin (A)')).toBeInTheDocument()
    expect(screen.getByText('7/7')).toBeInTheDocument()
    expect(screen.getByText('AC 15')).toBeInTheDocument()
  })

  it('uses the PC name and AC', () => {
    render(<CombatantRow combatant={pc()} />)
    expect(screen.getByText('Thalia')).toBeInTheDocument()
    expect(screen.getByText('AC 16')).toBeInTheDocument()
  })

  it('renders a badge for each effect (conditions and effects alike)', () => {
    render(
      <CombatantRow
        combatant={monster({ effects: [condition('Prone'), condition('Poisoned')] })}
      />,
    )
    expect(screen.getByText('Prone')).toBeInTheDocument()
    expect(screen.getByText('Poisoned')).toBeInTheDocument()
  })

  it('removes an effect when onRemoveEffect is provided', () => {
    const onRemoveEffect = vi.fn()
    render(
      <CombatantRow
        combatant={monster({ effects: [condition('Prone')] })}
        onRemoveEffect={onRemoveEffect}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Prone' }))
    expect(onRemoveEffect).toHaveBeenCalledOnce()
  })

  it('marks a dead monster', () => {
    render(<CombatantRow combatant={monster({ status: 'dead', hp: { current: 0, max: 7, temp: 0 } })} />)
    expect(screen.getByText('Dead')).toBeInTheDocument()
  })

  it('flags the wound tier accessibly', () => {
    render(<CombatantRow combatant={monster({ hp: { current: 6, max: 7, temp: 0 } })} />)
    expect(screen.getByText('Hurt')).toBeInTheDocument()
    cleanup()
    render(<CombatantRow combatant={monster({ hp: { current: 3, max: 7, temp: 0 } })} />)
    expect(screen.getByText('Bloodied')).toBeInTheDocument()
    cleanup()
    render(<CombatantRow combatant={monster({ hp: { current: 1, max: 7, temp: 0 } })} />)
    expect(screen.getByText('Critical')).toBeInTheDocument()
  })

  it('shows temporary HP', () => {
    render(<CombatantRow combatant={pc({ hp: { current: 20, max: 38, temp: 5 } })} />)
    expect(screen.getByText('+5')).toBeInTheDocument()
  })

  it('shows a concentration C badge with the spell in its tooltip', () => {
    render(
      <CombatantRow
        combatant={pc({ concentration: { spell: 'Hold Person', saveDc: 13, round: 2 } })}
      />,
    )
    expect(screen.getByTitle('Concentrating: Hold Person')).toBeInTheDocument()
  })

  it('marks the active combatant with aria-current', () => {
    const { container } = render(<CombatantRow combatant={pc()} active />)
    expect(container.querySelector('[aria-current="true"]')).not.toBeNull()
  })

  it('colour-codes the row border by type (rose for monsters, sky for PCs)', () => {
    const { container, rerender } = render(<CombatantRow combatant={monster()} />)
    expect(container.firstElementChild?.className).toMatch(/border-l-rose-400/)

    rerender(<CombatantRow combatant={pc()} />)
    expect(container.firstElementChild?.className).toMatch(/border-l-sky-400/)
  })

  it('removes the combatant via the hover X when onRemove is provided', () => {
    const onRemove = vi.fn()
    render(<CombatantRow combatant={monster()} onRemove={onRemove} />)
    fireEvent.click(screen.getByRole('button', { name: /Remove/ }))
    expect(onRemove).toHaveBeenCalledOnce()
  })

  it('selects on click when onSelect is provided', () => {
    const onSelect = vi.fn()
    const { container } = render(<CombatantRow combatant={pc()} onSelect={onSelect} />)
    const row = container.querySelector('[role="button"]')
    expect(row).not.toBeNull()
    fireEvent.click(row as Element)
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('shows death-save pips for a downed PC', () => {
    render(
      <CombatantRow
        combatant={pc({
          status: 'unconscious',
          hp: { current: 0, max: 30, temp: 0 },
          deathSaves: { successes: 1, failures: 2 },
        })}
      />,
    )
    expect(screen.getByText('Unconscious')).toBeInTheDocument()
    expect(screen.getByText('1 of 3 successes')).toBeInTheDocument()
    expect(screen.getByText('2 of 3 failures')).toBeInTheDocument()
  })

  it('shows full HP in the healthy color', () => {
    render(<CombatantRow combatant={pc({ hp: { current: 38, max: 38, temp: 0 } })} />)
    expect(screen.getByText('38/38').className).toContain('text-emerald')
  })

  it('shows 0 HP in the critical color', () => {
    render(
      <CombatantRow
        combatant={pc({ status: 'unconscious', hp: { current: 0, max: 28, temp: 0 } })}
      />,
    )
    expect(screen.getByText('0/28').className).toContain('text-red')
  })

  it('flags a stabilized PC', () => {
    render(
      <CombatantRow
        combatant={pc({
          status: 'unconscious',
          hp: { current: 0, max: 30, temp: 0 },
          deathSaves: { successes: 3, failures: 0 },
        })}
      />,
    )
    expect(screen.getByText('Stable')).toBeInTheDocument()
  })
})
