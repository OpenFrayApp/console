// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { Spell } from '../../../src/schema/spell.ts'
import { SpellCard } from '../../../src/components/statblock/SpellCard.tsx'
import { spell } from '../../fixtures.ts'

const FIREBALL: Spell = spell({
  components: {
    verbal: true,
    somatic: true,
    material: true,
    materials: 'a tiny ball of bat guano',
  },
  classes: ['Wizard', 'Sorcerer'],
  text: 'A bright streak flashes...',
})

const LIGHT: Spell = {
  ...FIREBALL,
  id: 'srd-5.2:light',
  name: 'Light',
  level: 0,
  school: 'Evocation',
}

afterEach(cleanup)

describe('SpellCard', () => {
  it('renders a leveled spell with its details', () => {
    render(<SpellCard spell={FIREBALL} />)
    expect(screen.getByText('Fireball')).toBeInTheDocument()
    expect(screen.getByText('3rd-level Evocation')).toBeInTheDocument()
    expect(screen.getByText('150 feet')).toBeInTheDocument()
    expect(screen.getByText('V, S, M (a tiny ball of bat guano)')).toBeInTheDocument()
    expect(screen.getByText(/Classes: Wizard, Sorcerer/)).toBeInTheDocument()
    expect(screen.getByText(/Basic Rules 2024/)).toBeInTheDocument()
  })

  // The formatter's input variants are covered in compendium/format.test.ts.
  it('formats casting details without changing source data', () => {
    const card = spell({ castingTime: '1 bonus action', duration: 'instantaneous' })
    const original = JSON.stringify(card)
    render(<SpellCard spell={card} />)
    expect(screen.getByText('Bonus Action')).toBeInTheDocument()
    expect(screen.getByText('Instantaneous')).toBeInTheDocument()
    expect(JSON.stringify(card)).toBe(original)
  })

  it('title-cases special duration details without converting their timing', () => {
    render(<SpellCard spell={spell({ concentration: true, duration: 'special (+ 1 round)' })} />)
    expect(screen.getByText('Concentration, Special (+ 1 Round)')).toBeInTheDocument()
  })

  it('labels a cantrip', () => {
    render(<SpellCard spell={LIGHT} />)
    expect(screen.getByText('Evocation cantrip')).toBeInTheDocument()
  })

  it('explains a condition named in the spell text on hover, like a stat block does', () => {
    render(
      <SpellCard
        spell={spell({ text: 'On a failed save the target has the Frightened condition.' })}
      />,
    )
    expect(screen.queryByRole('heading', { name: 'Frightened' })).toBeNull()
    fireEvent.mouseEnter(screen.getByText('Frightened'))
    expect(screen.getByRole('heading', { name: 'Frightened' })).toBeInTheDocument()
  })
})
