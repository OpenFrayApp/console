// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { Combatant } from '../../../src/schema/combatant.ts'
import type { Creature } from '../../../src/schema/creature.ts'
import { CombatDifficulty } from '../../../src/components/tracker/CombatDifficulty.tsx'
import { monster as baseMonster, pc as basePc } from '../../fixtures.ts'

afterEach(cleanup)

/** A party member the difficulty math counts. */
const pc = (id: string): Combatant =>
  basePc({
    combatantId: id,
    name: 'Hero',
    initiative: 0,
    hp: { current: 38, max: 38, temp: 0 },
    abilities: { str: 12, dex: 14, con: 14, int: 10, wis: 16, cha: 10 },
  })

/** An ogre worth the given XP — only the fields the difficulty math reads. */
const monster = (id: string, xp: number): Combatant =>
  baseMonster({
    combatantId: id,
    creatureId: 'srd:ogre',
    creature: { id: 'srd:ogre', ac: 11, maxHp: 59, xp } as unknown as Creature,
    label: 'Ogre',
    initiative: 0,
    hp: { current: 59, max: 59, temp: 0 },
  })

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
