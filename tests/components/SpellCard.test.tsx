// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { Spell } from '../../src/schema/spell.ts'
import { SpellCard } from '../../src/components/SpellCard.tsx'
import { spell } from '../fixtures.ts'

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

  it('labels a cantrip', () => {
    render(<SpellCard spell={LIGHT} />)
    expect(screen.getByText('Evocation cantrip')).toBeInTheDocument()
  })
})
