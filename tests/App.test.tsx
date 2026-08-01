// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import App from '../src/App.tsx'

afterEach(cleanup)

describe('App', () => {
  it('shows the encounter console by default with view navigation', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Add creature' })).toBeInTheDocument()
    expect(screen.getByText(/Nobody is on the board yet/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show the fight' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show the compendium' })).toBeInTheDocument()
  })
})

describe('App — when initiative reaches the log', () => {
  /** Put one quick-add foe on the board, so Begin has someone to roll for. */
  const addFoe = (name: string) => {
    fireEvent.click(screen.getByRole('button', { name: 'Quick add' }))
    fireEvent.change(screen.getByLabelText('Quick add name'), { target: { value: name } })
    fireEvent.change(screen.getByLabelText('Max HP'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  }

  /** Every game-log line currently on screen, newest first. */
  const logLines = () => Array.from(document.querySelectorAll('li')).map((li) => li.textContent)

  it('holds the roll until the fight starts, and drops it if Begin is abandoned', () => {
    render(<App />)
    addFoe('Bandit')
    // Opening the box pre-rolls the creature, but nothing is recorded yet: the Game
    // Master hasn't started a fight for it to belong to.
    fireEvent.click(screen.getByRole('button', { name: 'Begin' }))
    expect(screen.getByText(/Nothing logged yet/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText(/Nothing logged yet/)).toBeInTheDocument()
  })

  it('records the rolls under the line that opens the fight', () => {
    render(<App />)
    addFoe('Bandit')
    fireEvent.click(screen.getByRole('button', { name: 'Begin' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start combat' }))
    // The sidebar feed reads newest first; reversed, it is the order things happened.
    const lines = logLines().reverse()
    const begins = lines.findIndex((t) => t?.includes('Combat begins'))
    const rolled = lines.findIndex((t) => t?.includes('Bandit: initiative'))
    expect(begins).toBeGreaterThanOrEqual(0)
    expect(rolled).toBeGreaterThan(begins)
  })
})
