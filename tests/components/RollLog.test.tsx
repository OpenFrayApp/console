// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { roll } from '../../src/dice/roll.ts'
import { RollLog, type RollEntry } from '../../src/components/RollLog.tsx'

function faceSeq(...faces: number[]) {
  let i = 0
  return () => faces[i++] - 1
}

afterEach(cleanup)

describe('RollLog', () => {
  it('shows an empty state', () => {
    render(<RollLog entries={[]} />)
    expect(screen.getByText('No rolls yet.')).toBeInTheDocument()
  })

  it('renders a roll with its total and breakdown', () => {
    const result = roll('1d20+7', { kind: 'attack', rand: faceSeq(20) })
    const entries: RollEntry[] = [{ id: 'r1', label: 'Goblin: Bite', result }]
    render(<RollLog entries={entries} />)
    expect(screen.getByText('Goblin: Bite')).toBeInTheDocument()
    expect(screen.getByText('27')).toBeInTheDocument()
    expect(screen.getByText(/CRIT/)).toBeInTheDocument()
  })

  it('lists the applied effects', () => {
    const result = roll('1d20+5', { rand: faceSeq(10) })
    render(
      <RollLog
        entries={[
          {
            id: 'r2',
            label: 'attack',
            result,
            applied: [{ source: 'Reckless Attack', effect: 'advantage' }],
          },
        ]}
      />,
    )
    expect(screen.getByText(/Reckless Attack: advantage/)).toBeInTheDocument()
  })
})
