// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { Combatant } from '../../src/schema/combatant.ts'
import { CombatDifficulty } from '../../src/components/CombatDifficulty.tsx'

afterEach(cleanup)

const pc = (id: string): Combatant =>
  ({
    isPC: true,
    kind: 'pc',
    combatantId: id,
    name: 'Hero',
    ac: 16,
    initiative: 0,
    status: 'active',
    hp: { current: 38, max: 38, temp: 0 },
    abilities: { str: 12, dex: 14, con: 14, int: 10, wis: 16, cha: 10 },
    concentration: null,
    effects: [],
  }) as unknown as Combatant

const monster = (id: string, xp: number): Combatant =>
  ({
    isPC: false,
    combatantId: id,
    creatureId: 'srd:ogre',
    creature: { id: 'srd:ogre', ac: 11, maxHp: 59, xp },
    label: 'Ogre',
    initiative: 0,
    status: 'active',
    hp: { current: 59, max: 59, temp: 0 },
    slotsUsed: {},
    spellUsesSpent: {},
    limitedUseState: {},
    legendaryRemaining: 0,
    concentration: null,
    effects: [],
    visibility: { name: 'shown', hp: 'bloodied', conditions: 'shown', ac: 'hidden' },
  }) as unknown as Combatant

describe('CombatDifficulty', () => {
  it('rates the board and shows the adjusted experience', () => {
    render(
      <CombatDifficulty
        combatants={[pc('a'), pc('b'), pc('c'), pc('d'), monster('m1', 450), monster('m2', 450)]}
      />,
    )
    expect(screen.getByText('Difficulty')).toBeInTheDocument()
    expect(screen.getByText('Easy')).toBeInTheDocument()
    expect(screen.getByText('1,350 XP')).toBeInTheDocument()
  })

  it('shows no rating until both sides are on the board, but holds its column', () => {
    const { container } = render(<CombatDifficulty combatants={[pc('a'), pc('b')]} />)
    expect(screen.queryByText('Difficulty')).toBeNull()
    expect(container.firstElementChild).not.toBeNull()
  })
})
