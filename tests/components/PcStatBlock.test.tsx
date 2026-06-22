// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { PcStatBlock } from '../../src/components/PcStatBlock.tsx'

afterEach(cleanup)

const base = {
  name: 'Thalia',
  subtitle: 'Player character · Lawful Good',
  ac: 16,
  hp: { current: 38, max: 38, temp: 0 },
  initiativeMod: 2,
  abilities: { str: 10, dex: 14, con: 12, int: 13, wis: 11, cha: 16 },
}

describe('PcStatBlock', () => {
  it('renders a stat-block header and the ability table (Mod only, no Save)', () => {
    render(<PcStatBlock {...base} />)
    expect(screen.getByText('Thalia')).toBeInTheDocument()
    expect(screen.getByText('Player character · Lawful Good')).toBeInTheDocument()
    expect(screen.getByText('AC')).toBeInTheDocument()
    expect(screen.getByText('38')).toBeInTheDocument() // current HP
    // Ability table is shared with creatures: shows the score + Mod, but PCs have no
    // save proficiencies, so there's no Save column.
    expect(screen.getByText('Dex')).toBeInTheDocument()
    expect(screen.getAllByText('Mod').length).toBe(2) // two side-by-side tables
    expect(screen.queryByText('Save')).toBeNull()
  })

  it('renders the roleplay sections and markdown backstory', () => {
    render(
      <PcStatBlock
        {...base}
        faith={'Lathander'}
        personalityTraits={['Brave to a fault']}
        ideals={['Protect the weak']}
        bonds={['My village']}
        flaws={['Reckless']}
        backstory={'Raised in **Neverwinter**.'}
      />,
    )
    expect(screen.getByText('Personality')).toBeInTheDocument()
    expect(screen.getByText('Faith')).toBeInTheDocument()
    expect(screen.getByText('Lathander')).toBeInTheDocument()
    expect(screen.getByText('Personality Traits')).toBeInTheDocument()
    expect(screen.getByText('Brave to a fault')).toBeInTheDocument()
    expect(screen.getByText('Protect the weak')).toBeInTheDocument()
    expect(screen.getByText('Reckless')).toBeInTheDocument()
    expect(screen.getByText('Backstory & Goals')).toBeInTheDocument()
    // Markdown turns **Neverwinter** into emphasis.
    expect(screen.getByText('Neverwinter').tagName).toBe('STRONG')
  })

  it('renders full senses like a creature, falling back to bare passive perception', () => {
    const { rerender } = render(
      <PcStatBlock {...base} senses={{ passivePerception: 14, darkvision: 60 }} />,
    )
    expect(screen.getByText('Darkvision 60 ft., Passive Perception 14')).toBeInTheDocument()
    // Anonymous quick PCs carry only a passive-perception number.
    rerender(<PcStatBlock {...base} passivePerception={12} />)
    expect(screen.getByText('Passive Perception 12')).toBeInTheDocument()
  })

  it('omits sections that have no content and renders the footer', () => {
    render(
      <PcStatBlock
        {...base}
        abilities={undefined}
        footer={<button type="button">Add to encounter</button>}
      />,
    )
    expect(screen.queryByText('Personality')).toBeNull()
    expect(screen.queryByText('Dex')).toBeNull() // no ability table without scores
    expect(screen.getByRole('button', { name: 'Add to encounter' })).toBeInTheDocument()
  })
})
