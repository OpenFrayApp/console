// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { MonsterCombatant, PlayerCharacter } from '../../src/schema/combatant.ts'
import { TargetChips } from '../../src/components/TargetChips.tsx'

afterEach(cleanup)

const pc = (id: string, name: string): PlayerCharacter => ({
  isPC: true,
  kind: 'pc',
  combatantId: id,
  name,
  initiative: 0,
  ac: 15,
  status: 'active',
  hp: { current: 10, max: 10, temp: 0 },
  concentration: null,
  effects: [],
})

const foe = (id: string, label: string): MonsterCombatant => ({
  isPC: false,
  combatantId: id,
  creatureId: 'srd:goblin',
  creature: { id: 'srd:goblin', source: 'srd-5.2', name: 'Goblin', size: 'Small', type: 'humanoid', ac: 15, maxHp: 7, speed: {}, abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 }, senses: { passivePerception: 9 } },
  label,
  initiative: 0,
  status: 'active',
  hp: { current: 7, max: 7, temp: 0 },
  slotsUsed: {},
  spellUsesSpent: {},
  limitedUseState: {},
  legendaryRemaining: 0,
  concentration: null,
  effects: [],
  visibility: { name: 'shown', hp: 'bloodied', conditions: 'shown', ac: 'hidden' },
})

describe('TargetChips', () => {
  it('groups Allies and Foes, sorts each alphabetically, and omits AC', () => {
    render(
      <TargetChips
        targets={[foe('f1', 'Zombie'), pc('p1', 'Bran'), foe('f2', 'Acolyte'), pc('p2', 'Aria')]}
        selected={new Set()}
        onToggle={() => {}}
      />,
    )
    expect(screen.getByText('Allies')).toBeInTheDocument()
    expect(screen.getByText('Foes')).toBeInTheDocument()

    const buttons = screen.getAllByRole('button').map((b) => b.textContent)
    // Allies (Aria, Bran) come before Foes (Acolyte, Zombie); each group alphabetical.
    expect(buttons).toEqual(['Aria', 'Bran', 'Acolyte', 'Zombie'])
    // No AC text on the chips.
    expect(screen.queryByText(/AC \d/)).toBeNull()
  })

  it('drops the group labels when only one side is present', () => {
    render(<TargetChips targets={[foe('f1', 'Goblin'), foe('f2', 'Ogre')]} selected={new Set()} onToggle={() => {}} />)
    expect(screen.queryByText('Foes')).toBeNull()
    expect(screen.queryByText('Allies')).toBeNull()
    expect(screen.getByRole('button', { name: 'Goblin' })).toBeInTheDocument()
  })

  it('toggles selection and marks the chosen chip pressed', () => {
    const onToggle = vi.fn()
    render(<TargetChips targets={[foe('f1', 'Goblin')]} selected={new Set(['f1'])} onToggle={onToggle} />)
    const chip = screen.getByRole('button', { name: 'Goblin' })
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(chip)
    expect(onToggle).toHaveBeenCalledWith('f1')
  })

  it('shows the empty text when there are no targets', () => {
    const { container } = render(<TargetChips targets={[]} selected={new Set()} onToggle={() => {}} emptyText="Nobody here" />)
    expect(within(container).getByText('Nobody here')).toBeInTheDocument()
  })
})
