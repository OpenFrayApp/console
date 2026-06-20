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
  it('renders the header with CR, AC, HP, and Init', () => {
    const { container } = render(<CreatureStatBlock creature={GOBLIN} />)
    expect(screen.getByText('Goblin')).toBeInTheDocument()
    expect(screen.getByText(/Small humanoid · CR 1\/4 \(50 XP\)/)).toBeInTheDocument()
    expect(screen.getByText('AC')).toBeInTheDocument()
    expect(screen.getByText('HP')).toBeInTheDocument()
    expect(screen.getByText('Init')).toBeInTheDocument()
    expect(container.textContent).toContain('10/10') // HP current/max
  })

  it('tints current HP by wound tier when live combat HP is given', () => {
    const { container } = render(
      <CreatureStatBlock creature={GOBLIN} hp={{ current: 2, max: 10, temp: 0 }} />,
    )
    const crit = container.querySelector('.text-red-700') // critical tier
    expect(crit?.textContent).toBe('2')
  })

  it('shows ability scores with modifiers and proficient saves', () => {
    const { container } = render(<CreatureStatBlock creature={GOBLIN} />)
    const row = (re: RegExp) =>
      [...container.querySelectorAll('tr')].find((r) => re.test(r.textContent ?? ''))
    const dex = row(/dex/i)
    expect(dex?.textContent).toContain('15') // score
    expect(dex?.textContent).toContain('+2') // modifier
    expect(dex?.textContent).toContain('+4') // proficient save (saves.dex = 4)
    const str = row(/str/i)
    expect(str?.textContent).toContain('8')
    // STR is not proficient — mod and save both fall back to the ability modifier.
    expect((str?.textContent?.match(/-1/g) ?? []).length).toBe(2)
  })

  it('renders every stat-block section and the Legendary badge', () => {
    const { container } = render(<CreatureStatBlock creature={GOBLIN} />)
    expect(screen.getByText('Traits')).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()
    expect(screen.getByText('Bonus Actions')).toBeInTheDocument()
    expect(screen.getByText('Legendary Actions (3/round)')).toBeInTheDocument()
    expect(screen.getByTitle('Legendary')).toBeInTheDocument() // "L" header badge
    expect(container.textContent).toContain('Pounce (Recharge 5–6)') // recharge surfaced
  })

  it('renders speeds as text, skills, defenses, and senses tables', () => {
    const { container } = render(<CreatureStatBlock creature={GOBLIN} />)
    const text = container.textContent ?? ''
    expect(text).toContain('Walk 30 ft.')
    expect(text).toContain('Climb 30 ft.')
    expect(screen.getByText('Stealth')).toBeInTheDocument() // skills table
    expect(screen.getByText('Poison')).toBeInTheDocument() // immunities value
    expect(screen.getByText(/Darkvision 60 ft., Passive Perception 9/)).toBeInTheDocument()
    expect(screen.getByText('Common, Goblin')).toBeInTheDocument() // languages value
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
