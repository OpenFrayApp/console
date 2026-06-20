// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { Spell } from '../../src/schema/spell.ts'
import { SpellCard } from '../../src/components/SpellCard.tsx'

const FIREBALL: Spell = {
  id: 'srd-5.2:fireball',
  source: 'srd-5.2',
  name: 'Fireball',
  level: 3,
  school: 'Evocation',
  castingTime: 'action',
  range: '150 feet',
  components: { verbal: true, somatic: true, material: true, materials: 'a tiny ball of bat guano' },
  duration: 'instantaneous',
  concentration: false,
  ritual: false,
  classes: ['Wizard', 'Sorcerer'],
  text: 'A bright streak flashes...',
}

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
    expect(screen.getByRole('link', { name: /SRD 5\.2/ })).toBeInTheDocument()
  })

  it('labels a cantrip', () => {
    render(<SpellCard spell={LIGHT} />)
    expect(screen.getByText('Evocation cantrip')).toBeInTheDocument()
  })
})
