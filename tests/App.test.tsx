// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
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

  it('starts a mid-fight arrival off the shared screen when the GM asked for that', () => {
    localStorage.setItem(
      'openfray-settings',
      JSON.stringify({ playerView: { arrivals: 'hidden' } }),
    )
    render(<App />)
    addFoe('Bandit')
    fireEvent.click(screen.getByRole('button', { name: 'Begin' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start combat' }))
    expect(screen.queryByTitle('Kept off the shared player screen')).toBeNull()

    addFoe('Reinforcement')
    expect(screen.getAllByTitle('Kept off the shared player screen')).toHaveLength(1)
    localStorage.clear()
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

  it('logs an initiative the GM typed by hand, dice-free', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Add PC' }))
    fireEvent.change(screen.getByLabelText('PC name'), { target: { value: 'Thalia' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    addFoe('Bandit')

    fireEvent.click(screen.getByRole('button', { name: 'Begin' }))
    fireEvent.change(screen.getByLabelText('Initiative for Thalia'), { target: { value: '17' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start combat' }))

    expect(logLines().some((t) => t?.includes('Thalia: initiative 17'))).toBe(true)
  })
})

describe('App — keyboard control', () => {
  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('opens Quick add on its chord and stays quiet while typing', () => {
    render(<App />)
    fireEvent.keyDown(document.body, { key: 'a', ctrlKey: true })
    const name = screen.getByLabelText('Quick add name')
    expect(name).toBeInTheDocument()
    // A letter typed into the popover's field is typing, not a command.
    fireEvent.keyDown(name, { key: 'a', ctrlKey: true })
    expect(screen.getAllByLabelText('Quick add name')).toHaveLength(1)
  })

  it('opens the cheat sheet on Shift+/ and closes it on Escape', () => {
    render(<App />)
    fireEvent.keyDown(document.body, { key: '?', shiftKey: true })
    expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Keyboard shortcuts' })).toBeNull()
  })

  it('advances the turn on n once the fight is running', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Quick add' }))
    fireEvent.change(screen.getByLabelText('Quick add name'), { target: { value: 'Bandit' } })
    fireEvent.change(screen.getByLabelText('Max HP'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    fireEvent.click(screen.getByRole('button', { name: 'Begin' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start combat' }))
    expect(screen.getByRole('heading', { name: /Round 1/ })).toBeInTheDocument()
    fireEvent.keyDown(document.body, { key: 'n' })
    // One combatant: next turn wraps back to it and the round advances.
    expect(screen.getByRole('heading', { name: /Round 2/ })).toBeInTheDocument()
  })

  it('honors a rebound chord from the stored settings', () => {
    localStorage.setItem('openfray-settings', JSON.stringify({ hotkeys: { quickAdd: 'x' } }))
    render(<App />)
    fireEvent.keyDown(document.body, { key: 'a', ctrlKey: true })
    expect(screen.queryByLabelText('Quick add name')).toBeNull()
    fireEvent.keyDown(document.body, { key: 'x' })
    expect(screen.getByLabelText('Quick add name')).toBeInTheDocument()
  })
})
