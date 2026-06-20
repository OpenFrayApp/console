// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import {
  SaveResolutionList,
  type SaveLine,
} from '../../src/components/SaveResolutionList.tsx'

afterEach(cleanup)

const LINES: SaveLine[] = [
  { combatantId: 'a', label: 'Goblin (A)', total: 9, result: 'fail' },
  { combatantId: 'b', label: 'Goblin (B)', total: 18, result: 'save' },
  { combatantId: 'p', label: 'Thalia', result: 'pending' },
]

describe('SaveResolutionList', () => {
  it('renders each combatant with its total and result', () => {
    render(<SaveResolutionList lines={LINES} />)
    expect(screen.getByText('Goblin (A)')).toBeInTheDocument()
    expect(screen.getByText('9')).toBeInTheDocument()
    expect(screen.getByText('18')).toBeInTheDocument()
    expect(screen.getByText('Fail')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
  })

  it('shows a placeholder for a pending (un-rolled) result', () => {
    render(<SaveResolutionList lines={LINES} />)
    expect(screen.getByText('Thalia')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
