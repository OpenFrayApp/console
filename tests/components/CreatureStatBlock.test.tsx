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
  initiative: 2,
  cr: 0.25,
  xp: 50,
  speed: { walk: 30, climb: 30 },
  abilities: { str: 8, dex: 15, con: 10, int: 10, wis: 8, cha: 8 },
  saves: { dex: 4 },
  skills: { stealth: 6 },
  senses: { passivePerception: 9, darkvision: 60 },
  languages: ['Common', 'Goblin'],
  immunities: ['Poison'],
  traits: [{ name: 'Pack Tactics', text: 'It has **advantage** when allies are near.' }],
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
  bonusActions: [
    { id: 'escape', name: 'Nimble Escape', kind: 'utility', toHit: null, text: 'Disengage or Hide.' },
  ],
  legendaryActions: {
    perRound: 3,
    actions: [
      {
        id: 'pounce',
        name: 'Pounce',
        kind: 'utility',
        toHit: null,
        recharge: { type: 'dice', value: 5 },
        text: 'It pounces.',
      },
    ],
  },
}

afterEach(cleanup)

describe('CreatureStatBlock', () => {
  it('renders the header, CR with XP, and HP', () => {
    render(<CreatureStatBlock creature={GOBLIN} />)
    expect(screen.getByText('Goblin')).toBeInTheDocument()
    expect(screen.getByText(/Small humanoid · CR 1\/4 \(50 XP\)/)).toBeInTheDocument()
    expect(screen.getByText('10 (3d6)')).toBeInTheDocument()
  })

  it('shows ability modifiers', () => {
    render(<CreatureStatBlock creature={GOBLIN} />)
    expect(screen.getByText('15 (+2)')).toBeInTheDocument()
    expect(screen.getAllByText('8 (-1)').length).toBeGreaterThan(0)
  })

  it('renders every stat-block section and the Legendary badge', () => {
    const { container } = render(<CreatureStatBlock creature={GOBLIN} />)
    expect(screen.getByText('Traits')).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()
    expect(screen.getByText('Bonus Actions')).toBeInTheDocument()
    expect(screen.getByText('Legendary Actions (3/round)')).toBeInTheDocument()
    expect(screen.getByText('Legendary')).toBeInTheDocument() // header badge
    expect(container.textContent).toContain('Pounce (Recharge 5–6)') // recharge surfaced
  })

  it('renders defenses, speeds, skills, senses, and languages', () => {
    const { container } = render(<CreatureStatBlock creature={GOBLIN} />)
    const text = container.textContent ?? ''
    expect(text).toContain('Initiative +2')
    expect(text).toContain('30 ft., climb 30 ft.') // both speeds
    expect(text).toContain('Saving Throws Dex +4')
    expect(text).toContain('Skills Stealth +6')
    expect(text).toContain('Damage Immunities Poison')
    expect(text).toContain('Darkvision 60 ft., Passive Perception 9')
    expect(text).toContain('Languages Common, Goblin')
  })

  it('renders markdown (bold) rather than raw asterisks', () => {
    const { container } = render(<CreatureStatBlock creature={GOBLIN} />)
    expect(container.textContent).toContain('Scimitar')
    expect(container.textContent).toContain('Melee Attack Roll: +4')
    expect(container.textContent).toContain('advantage')
    expect(container.textContent).not.toContain('**')
    expect(container.querySelector('strong')).not.toBeNull()
  })
})
