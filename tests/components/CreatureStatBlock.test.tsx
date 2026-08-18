// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { Creature, SpellRef } from '../../src/schema/creature.ts'
import { CreatureStatBlock } from '../../src/components/CreatureStatBlock.tsx'
import { parseTemplate } from '../../src/combat/encounterTemplate.ts'
import { CampaignRulesContext } from '../../src/state/campaignRules.ts'
import { DEFAULT_CAMPAIGN_RULES } from '../../src/schema/campaign.ts'

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
    {
      id: 'escape',
      name: 'Nimble Escape',
      kind: 'utility',
      toHit: null,
      text: 'Disengage or Hide.',
    },
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
    expect(screen.getByText(/Small Humanoid · CR 1\/4 \(XP 50; PB \+2\)/)).toBeInTheDocument()
    expect(screen.getByText('AC')).toBeInTheDocument()
    expect(screen.getByText('HP (3d6)')).toBeInTheDocument()
    expect(screen.getByText('Init')).toBeInTheDocument()
    expect(container.textContent).toContain('10/10')
  })

  it('hides XP in the combat view under a milestone campaign', () => {
    // Combat view = live HP passed; the header then shows only XP, so it disappears.
    render(
      <CampaignRulesContext.Provider value={{ ...DEFAULT_CAMPAIGN_RULES, leveling: 'milestone' }}>
        <CreatureStatBlock creature={GOBLIN} hp={{ current: 10, max: 10, temp: 0 }} />
      </CampaignRulesContext.Provider>,
    )
    expect(screen.getByText(/Small Humanoid · CR 1\/4/)).toBeInTheDocument()
    expect(screen.queryByText(/XP/)).toBeNull()
  })

  it('always shows XP in the compendium view, whatever the campaign uses', () => {
    // Reference view = no live HP. The setting must not reach it.
    render(
      <CampaignRulesContext.Provider value={{ ...DEFAULT_CAMPAIGN_RULES, leveling: 'milestone' }}>
        <CreatureStatBlock creature={GOBLIN} />
      </CampaignRulesContext.Provider>,
    )
    expect(screen.getByText(/Small Humanoid · CR 1\/4 \(XP 50; PB \+2\)/)).toBeInTheDocument()
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
    expect(dex?.textContent).toContain('15')
    expect(dex?.textContent).toContain('+2')
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
    expect(container.textContent).toContain('Pounce (Recharge 5–6)')
  })

  it('makes every reaction clickable in combat, roll or no roll', () => {
    // Most SRD reactions (Parry, Split) roll nothing, so rollability can't gate the
    // click — using one still spends the creature's reaction for the round.
    const onReaction = vi.fn()
    const parry = {
      id: 'parry',
      name: 'Parry',
      kind: 'utility' as const,
      toHit: null,
      text: 'It parries.',
    }
    render(
      <CreatureStatBlock
        creature={{ ...GOBLIN, reactions: [parry] }}
        onAction={vi.fn()}
        onReaction={onReaction}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Parry.' }))
    expect(onReaction).toHaveBeenCalledWith(parry)
  })

  it('leaves reactions as plain text in the reference compendium', () => {
    render(
      <CreatureStatBlock
        creature={{
          ...GOBLIN,
          reactions: [
            { id: 'parry', name: 'Parry', kind: 'utility', toHit: null, text: 'It parries.' },
          ],
        }}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Parry.' })).toBeNull()
  })

  it('renders speeds as text, skills, defenses, and senses tables', () => {
    const { container } = render(<CreatureStatBlock creature={GOBLIN} />)
    const text = container.textContent ?? ''
    expect(text).toContain('Walk 30 ft.')
    expect(text).toContain('Climb 30 ft.')
    expect(screen.getByText('Stealth')).toBeInTheDocument()
    expect(screen.getByText('Poison')).toBeInTheDocument()
    expect(screen.getByText(/Darkvision 60 ft., Passive Perception 9/)).toBeInTheDocument()
    expect(screen.getByText('Common, Goblin')).toBeInTheDocument()
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

const MAGE: Creature = {
  ...GOBLIN,
  id: 'srd-5.2:mage',
  name: 'Mage',
  spellcasting: {
    ability: 'int',
    saveDc: 14,
    groups: [
      { usage: { type: 'atWill' }, spells: [{ name: 'Mage Hand', ref: 'srd-5.2:mage-hand' }] },
      {
        usage: { type: 'perDay', per: 2 },
        spells: [
          { name: 'Fireball', ref: 'srd-5.2:fireball' },
          { name: 'Invisibility', ref: 'srd-5.2:invisibility' },
        ],
      },
    ],
  },
}

describe('CreatureStatBlock — spellcasting', () => {
  it('renders the header, usage groups, and per-day remaining uses', () => {
    const usesOf = (s: SpellRef): number | null =>
      s.ref === 'srd-5.2:mage-hand' ? null : s.ref === 'srd-5.2:fireball' ? 1 : 2
    render(<CreatureStatBlock creature={MAGE} onCastSpell={vi.fn()} spellUsesOf={usesOf} />)
    expect(screen.getByText('Spellcasting')).toBeInTheDocument()
    expect(screen.getByText(/spell save DC 14/)).toBeInTheDocument()
    expect(screen.getByText('At Will')).toBeInTheDocument()
    expect(screen.getByText('2/Day Each')).toBeInTheDocument()
    // At-will shows no count; per-day shows its own remaining (Fireball 1, Invisibility 2).
    expect(screen.getByRole('button', { name: 'Mage Hand' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fireball (1)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Invisibility (2)' })).toBeInTheDocument()
  })

  it('casts a spell on click', () => {
    const onCast = vi.fn()
    render(<CreatureStatBlock creature={MAGE} onCastSpell={onCast} spellUsesOf={() => 2} />)
    fireEvent.click(screen.getByRole('button', { name: 'Fireball (2)' }))
    expect(onCast).toHaveBeenCalledWith({ name: 'Fireball', ref: 'srd-5.2:fireball' })
  })

  it('renders spells as plain text in the reference compendium (no onCast)', () => {
    render(<CreatureStatBlock creature={MAGE} />)
    expect(screen.getByText('Spellcasting')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Fireball/ })).not.toBeInTheDocument()
    expect(screen.getByText('Fireball')).toBeInTheDocument()
  })
})

/**
 * A stat block from a stranger, drawn by the same component the compendium uses — the widest
 * untrusted surface in the app, since a `custom:` id means homebrew travels whole.
 * `parseTemplate` is the door and `Markdown` is the renderer; this asks both together.
 */
describe('CreatureStatBlock — a creature that came from a stranger', () => {
  /** The stat block as it arrives on the board: through the share parser, nothing skipped. */
  const shared = (over: Record<string, unknown>): Creature => {
    const { template, error } = parseTemplate({
      v: 1,
      name: 'Goblin ambush',
      entries: [
        {
          creature: {
            id: 'custom:theirs',
            source: 'custom',
            name: 'Thing',
            size: 'Medium',
            type: 'aberration',
            ac: 14,
            maxHp: 30,
            speed: { walk: 30 },
            abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
            senses: { passivePerception: 10 },
            ...over,
          },
          count: 1,
          side: 'foe',
        },
      ],
    })
    expect(error).toBeUndefined()
    return template!.entries[0].creature!
  }

  it('renders no link and no image, wherever the prose sits', () => {
    const link = '[Sign in to load this encounter](https://evil.example/login)'
    const image = '![](https://tracker.example/pixel.gif)'
    const { container } = render(
      <CreatureStatBlock
        creature={shared({
          description: `${link} ${image}`,
          traits: [{ name: 'Watcher', text: `${image} It sees you.` }],
          actions: [
            {
              id: 'a',
              name: 'Slam',
              kind: 'melee',
              toHit: 5,
              damage: [{ formula: '1d8+3', type: 'bludgeoning' }],
              text: `Hit: 7 damage. ${link}`,
            },
          ],
          lairActions: [{ id: 'l', name: 'Gloom', kind: 'utility', toHit: null, text: image }],
          spellcasting: {
            groups: [{ usage: { type: 'atWill' }, spells: [{ name: 'Darkness' }] }],
            note: `See https://evil.example for the full rules`,
          },
        })}
      />,
    )
    expect(container.querySelectorAll('a')).toHaveLength(0)
    expect(container.querySelectorAll('img')).toHaveLength(0)
    // The words are all still there — nothing is hidden from the reader, it just can't be
    // clicked and it fetches nothing.
    expect(container.textContent).toContain('Sign in to load this encounter')
    expect(container.textContent).toContain('evil.example')
  })

  it('draws its name as written, with the bidi tricks already gone', () => {
    // A right-to-left override in a name prints the line backwards, which survives escaping
    // intact — so it is stripped at the door rather than at the renderer.
    const creature = shared({ name: 'Goblin‮ niatpaC‬​' })
    expect(creature.name).toBe('Goblin niatpaC')
    render(<CreatureStatBlock creature={creature} />)
    expect(screen.getByText('Goblin niatpaC')).toBeInTheDocument()
  })

  it('draws the legendary budget the door repaired, not the one it was sent', () => {
    render(
      <CreatureStatBlock
        creature={shared({
          legendaryActions: {
            perRound: 1e9,
            actions: [{ id: 'x', name: 'Lash', kind: 'melee', toHit: 5 }],
          },
        })}
      />,
    )
    expect(screen.getByText(/Legendary Actions \(3\/round\)/)).toBeInTheDocument()
  })
})
