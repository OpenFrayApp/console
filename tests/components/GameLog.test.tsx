// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { roll } from '../../src/dice/roll.ts'
import { GameLog, GameLogModal } from '../../src/components/GameLog.tsx'
import type { GameLogEntry } from '../../src/schema/encounter.ts'

function faceSeq(...faces: number[]) {
  let i = 0
  return () => faces[i++] - 1
}

afterEach(cleanup)

describe('GameLog feed', () => {
  it('shows an empty state', () => {
    render(<GameLog entries={[]} />)
    expect(screen.getByText('Nothing logged yet.')).toBeInTheDocument()
  })

  it('renders a roll with its total and breakdown', () => {
    const result = roll('1d20+7', { kind: 'attack', rand: faceSeq(20) })
    const entries: GameLogEntry[] = [
      { id: 'r1', round: 1, category: 'roll', message: 'Goblin: Bite', result },
    ]
    render(<GameLog entries={entries} />)
    expect(screen.getByText('Goblin: Bite')).toBeInTheDocument()
    expect(screen.getByText('27')).toBeInTheDocument()
    expect(screen.getByText(/CRIT/)).toBeInTheDocument()
  })

  it('surfaces a max-plus-roll crit bonus so the breakdown reconciles', () => {
    const result = roll('1d6+1', { kind: 'damage', crit: 'max-plus-roll', rand: faceSeq(2) })
    render(
      <GameLog
        entries={[{ id: 'rc', round: 1, category: 'roll', message: 'Scimitar damage', result }]}
      />,
    )
    expect(screen.getByText(/1d6 \[2\] \+6 crit \+1/)).toBeInTheDocument()
    expect(screen.getByText('9')).toBeInTheDocument()
  })

  it('collapses an attack into one line with outcome and damage by type', () => {
    const result = roll('1d20+7', { kind: 'attack', rand: faceSeq(14) })
    render(
      <GameLog
        entries={[
          {
            id: 'a1',
            round: 1,
            category: 'roll',
            message: 'Dragon: Bite → Ogre',
            result,
            outcome: 'hit',
            damage: [
              { type: 'piercing', amount: 18 },
              { type: 'fire', amount: 7 },
            ],
          },
        ]}
      />,
    )
    expect(screen.getByText('Dragon: Bite → Ogre')).toBeInTheDocument()
    expect(screen.getByText('Hit')).toBeInTheDocument()
    expect(screen.getByText(/18 piercing \+ 7 fire = 25/)).toBeInTheDocument()
  })

  it('shows the dice behind the damage, not just its total', () => {
    render(
      <GameLog
        entries={[
          {
            id: 'a2',
            round: 1,
            category: 'roll',
            message: 'Ogre: Greatclub → TeeFey',
            result: roll('1d20+6', { kind: 'attack', rand: faceSeq(18) }),
            outcome: 'hit',
            damage: [
              {
                type: 'bludgeoning',
                amount: 13,
                result: roll('2d8+4', { kind: 'damage', rand: faceSeq(5, 4) }),
              },
            ],
          },
        ]}
      />,
    )
    // The outcome line above it already reads "Hit · 13 bludgeoning", so the one damage
    // type isn't named twice.
    expect(screen.getByText('2d8 [5, 4] +4')).toBeInTheDocument()
  })

  it('names each damage type when several were rolled', () => {
    render(
      <GameLog
        entries={[
          {
            id: 'a4',
            round: 1,
            category: 'roll',
            message: 'Dragon: Bite → TeeFey',
            result: roll('1d20+10', { kind: 'attack', rand: faceSeq(15) }),
            outcome: 'hit',
            damage: [
              { type: 'piercing', amount: 9, result: roll('2d6', { rand: faceSeq(5, 4) }) },
              { type: 'fire', amount: 7, result: roll('2d6', { rand: faceSeq(3, 4) }) },
            ],
          },
        ]}
      />,
    )
    expect(screen.getByText('9 piercing · 2d6 [5, 4]')).toBeInTheDocument()
    expect(screen.getByText('7 fire · 2d6 [3, 4]')).toBeInTheDocument()
  })

  it('leaves the damage line as a total when there were no dice to show', () => {
    render(
      <GameLog
        entries={[
          {
            id: 'a3',
            round: 1,
            category: 'roll',
            message: 'Rat: Bite → TeeFey',
            result: roll('1d20+4', { kind: 'attack', rand: faceSeq(12) }),
            outcome: 'hit',
            damage: [{ type: 'piercing', amount: 1 }],
          },
        ]}
      />,
    )
    expect(screen.getByText(/1 piercing/)).toBeInTheDocument()
    expect(screen.queryByText(/·\s*d/)).toBeNull()
  })

  it('shows a miss without a damage breakdown', () => {
    const result = roll('1d20+7', { kind: 'attack', rand: faceSeq(2) })
    render(
      <GameLog
        entries={[
          {
            id: 'm1',
            round: 1,
            category: 'roll',
            message: 'Dragon: Bite → Ogre',
            result,
            outcome: 'miss',
          },
        ]}
      />,
    )
    expect(screen.getByText('Miss')).toBeInTheDocument()
  })

  it('renders a board event (non-roll) message', () => {
    render(
      <GameLog
        entries={[{ id: 'e1', round: 2, category: 'condition', message: 'Goblin is Prone' }]}
      />,
    )
    expect(screen.getByText('Goblin is Prone')).toBeInTheDocument()
  })

  it('names an adv/disadv cause without repeating the state word', () => {
    const result = roll('2d20adv+5', { rand: faceSeq(10, 18) })
    render(
      <GameLog
        entries={[
          {
            id: 'r2',
            round: 1,
            category: 'roll',
            message: 'attack',
            result,
            applied: [{ source: 'Reckless Attack', effect: 'advantage' }],
          },
        ]}
      />,
    )
    expect(screen.getByText(/Reckless Attack/)).toBeInTheDocument()
    expect(screen.queryByText(/Reckless Attack: advantage/)).toBeNull()
  })

  it('reads each flat modifier out, so a penalty never hides inside a sum', () => {
    // The creature's own +1, and Exhaustion's −6 folded in by the effect layer.
    const result = roll('1d20+1', { kind: 'check', bonuses: [-6], rand: faceSeq(17) })
    render(
      <GameLog
        entries={[
          {
            id: 'r3',
            round: 1,
            category: 'roll',
            message: 'Dominik Turretso: STR check',
            result,
            applied: [{ source: 'Exhaustion 3', effect: '-6' }],
          },
        ]}
      />,
    )
    expect(screen.getByText(/1d20 \[17\] \+1 -6/)).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('names a flat modifier’s cause only — the breakdown already prints the number', () => {
    const result = roll('1d20+1', { kind: 'check', bonuses: [-6], rand: faceSeq(17) })
    render(
      <GameLog
        entries={[
          {
            id: 'r4',
            round: 1,
            category: 'roll',
            message: 'STR check',
            result,
            applied: [{ source: 'Exhaustion 3', effect: '-6' }],
          },
        ]}
      />,
    )
    expect(screen.getByText(/· Exhaustion 3$/)).toBeInTheDocument()
    expect(screen.queryByText(/Exhaustion 3: -6/)).toBeNull()
  })
})

describe('GameLogModal', () => {
  const entries: GameLogEntry[] = [
    { id: '0-0', round: 0, category: 'turn', message: 'Combat begins — Round 1' },
    { id: '1-1', round: 1, category: 'condition', message: 'Goblin is Prone' },
    { id: '2-2', round: 2, category: 'hp', message: 'Goblin takes 4 damage' },
  ]

  it('groups entries by round and filters by category', () => {
    render(<GameLogModal entries={entries} onClose={() => {}} onClear={() => {}} />)
    // Pre-combat entries carry no round heading — only actual rounds get one.
    expect(screen.queryByText('Setup')).toBeNull()
    expect(screen.getByText('Round 1')).toBeInTheDocument()
    expect(screen.getByText('Round 2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Condition' }))
    expect(screen.getByText('Goblin is Prone')).toBeInTheDocument()
    expect(screen.queryByText('Goblin takes 4 damage')).toBeNull()
  })

  it('clears and closes from the modal', () => {
    const onClear = vi.fn()
    const onClose = vi.fn()
    render(<GameLogModal entries={entries} onClose={onClose} onClear={onClear} />)
    fireEvent.click(screen.getByRole('button', { name: 'Clear log' }))
    expect(onClear).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })
})
