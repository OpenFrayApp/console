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

  it('renders a board event (non-roll) message', () => {
    render(
      <GameLog
        entries={[{ id: 'e1', round: 2, category: 'condition', message: 'Goblin is Prone' }]}
      />,
    )
    expect(screen.getByText('Goblin is Prone')).toBeInTheDocument()
  })

  it('names an adv/disadv cause without repeating the state word', () => {
    const result = roll('1d20adv+5', { rand: faceSeq(10, 18) })
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
})

describe('GameLogModal', () => {
  const entries: GameLogEntry[] = [
    { id: '0-0', round: 0, category: 'turn', message: 'Combat begins — Round 1' },
    { id: '1-1', round: 1, category: 'condition', message: 'Goblin is Prone' },
    { id: '2-2', round: 2, category: 'hp', message: 'Goblin takes 4 damage' },
  ]

  it('groups entries by round and filters by category', () => {
    render(<GameLogModal entries={entries} onClose={() => {}} onClear={() => {}} />)
    expect(screen.getByText('Setup')).toBeInTheDocument()
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
