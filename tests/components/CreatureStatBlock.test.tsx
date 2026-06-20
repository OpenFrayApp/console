// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { Creature } from '../../src/schema/creature.ts'
import { CreatureStatBlock } from '../../src/components/CreatureStatBlock.tsx'

const GOBLIN: Creature = {
  id: 'srd-5.2:goblin',
  source: 'srd-5.2',
  name: 'Goblin',
  size: 'Small',
  type: 'humanoid',
  ac: 15,
  maxHp: 10,
  hpFormula: '3d6',
  cr: 0.25,
  speed: { walk: 30 },
  abilities: { str: 8, dex: 15, con: 10, int: 10, wis: 8, cha: 8 },
  senses: { passivePerception: 9 },
  actions: [
    {
      id: 'scimitar',
      name: 'Scimitar',
      kind: 'melee',
      toHit: 4,
      reach: 5,
      damage: [{ formula: '1d6+2', type: 'slashing' }],
      text: 'Melee Attack Roll: +4, reach 5 ft. 5 (1d6 + 2) Slashing damage.',
    },
  ],
}

afterEach(cleanup)

describe('CreatureStatBlock', () => {
  it('renders the header, defenses, and a fractional CR', () => {
    render(<CreatureStatBlock creature={GOBLIN} />)
    expect(screen.getByText('Goblin')).toBeInTheDocument()
    expect(screen.getByText(/Small humanoid · CR 1\/4/)).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument() // AC
    expect(screen.getByText('10 (3d6)')).toBeInTheDocument() // HP
  })

  it('shows ability modifiers', () => {
    render(<CreatureStatBlock creature={GOBLIN} />)
    expect(screen.getByText('15 (+2)')).toBeInTheDocument() // dex (unique)
    expect(screen.getAllByText('8 (-1)').length).toBeGreaterThan(0) // str/wis/cha
  })

  it('renders actions', () => {
    render(<CreatureStatBlock creature={GOBLIN} />)
    expect(screen.getByText('Scimitar.')).toBeInTheDocument()
    expect(screen.getByText(/Melee Attack Roll: \+4/)).toBeInTheDocument()
  })
})
