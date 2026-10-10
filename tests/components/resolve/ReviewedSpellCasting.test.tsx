// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { Spell } from '../../../src/schema/spell.ts'
import { CastSpellPanel } from '../../../src/components/resolve/CastSpellPanel.tsx'
import { SpellCastModal } from '../../../src/components/resolve/SpellCastModal.tsx'
import { creature, monster } from '../../fixtures.ts'
import { acOf } from '../../../src/combat/combatant.ts'

const cards = JSON.parse(
  readFileSync('public/compendium/tome-of-heroes-spells.json', 'utf8'),
) as Spell[]
const caster = monster({
  combatantId: 'caster',
  label: 'Mage',
  creature: creature({ spellcasting: { ability: 'int', saveDc: 99, toHit: 99, groups: [] } }),
})
const target = monster({ combatantId: 'target', label: 'Ogre' })

/** Get the actual source card without invented mechanics. */
function card(slug: string) {
  return cards.find((spell) => spell.id === `kobold-press-toh:${slug}`)!
}

/** Open an actual catalog spell through either casting entry point. */
function cast(slug: string, entry: 'panel' | 'monster') {
  const dispatch = vi.fn()
  if (entry === 'panel') {
    render(
      <CastSpellPanel
        preparedSpell={card(slug)}
        defaultCasterId="caster"
        combatants={[caster, target]}
        dispatch={dispatch}
        onRoll={vi.fn()}
        onNote={vi.fn()}
      />,
    )
  } else {
    render(
      <SpellCastModal
        caster={caster}
        spellRef={{ name: card(slug).name }}
        spell={card(slug)}
        usesRemaining={2}
        combatants={[caster, target]}
        dispatch={dispatch}
        onRoll={vi.fn()}
        onCast={vi.fn()}
        onRestore={vi.fn()}
        onClose={vi.fn()}
      />,
    )
  }
  fireEvent.click(screen.getByRole('button', { name: 'Cast' }))
  return dispatch
}

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener() {},
    removeEventListener() {},
  }))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe.each(['panel', 'monster'] as const)('reviewed spells through %s casting', (entry) => {
  it.each(['burst-stone', 'sudden-slue'])(
    'resolves %s and applies Prone only to a failed target',
    (slug) => {
      const dispatch = cast(slug, entry)
      expect(screen.getByLabelText('Save DC')).toHaveValue('99')
      expect(screen.getByLabelText('On save')).toHaveValue('half')
      if (slug === 'burst-stone')
        expect(screen.getByText(/Mark the difficult terrain/)).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
      fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`Apply ${card(slug).name}`) }))
      const update = dispatch.mock.calls
        .map(([action]) => action)
        .find((action) => action.type === 'update' && action.id === 'target')
      expect(update.update(target).effects).toMatchObject([
        { name: 'Prone', duration: { type: 'manual' } },
      ])
      expect(
        dispatch.mock.calls.some(([action]) => action.type === 'update' && action.id === 'caster'),
      ).toBe(false)
    },
  )

  it.each([
    ['butterfly-effect', 'CHA'],
    ['calm-beasts', 'CHA'],
    ['conjure-spectral-allies', 'WIS'],
    ['divine-retribution', 'CON'],
    ['emerald-eyes', 'WIS'],
    ['eruption', 'STR'],
    ['glare', 'WIS'],
    ['immolating-gibbet', 'DEX'],
    ['inexorable-summons', 'WIS'],
    ['jarring-growl', 'WIS'],
    ['lightless-torch', 'DEX'],
    ['long-game', 'CHA'],
    ['magma-spray', 'DEX'],
    ['mass-faerie-fire', 'DEX'],
    ['oathbound-implement', 'WIS'],
    ['outmaneuver', 'WIS'],
    ['power-word-fling', 'STR'],
    ['reapers-knell', 'WIS'],
    ['shared-frenzy', 'CHA'],
    ['silvershout', 'CON'],
    ['sneer', 'CHA'],
    ['steam-gout', 'DEX'],
    ['sudden-stampede', 'DEX'],
    ['war-horn', 'WIS'],
    ['clear-the-board', 'WIS'],
    ['forced-reposition', 'CON'],
    ['power-word-rend', 'CON'],
    ['damaging-intel', 'CHA'],
  ])('opens the printed save for %s without inventing an attack roll', (slug, ability) => {
    cast(slug, entry)
    expect(screen.getByText(`${ability} save`)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Roll attack' })).toBeNull()
    expect(screen.getByText('GM resolution:')).toBeInTheDocument()
  })

  it('applies Stone Aegis to the caster without modifying current or temporary hit points', () => {
    const dispatch = cast('stone-aegis', entry)
    const update = dispatch.mock.calls
      .map(([action]) => action)
      .find((action) => action.type === 'update' && action.id === 'caster')
    const after = update.update(caster)
    expect(after.hp).toBe(caster.hp)
    expect(after.hp.temp).toBe(caster.hp.temp)
    expect(acOf(after)).toBe(acOf(caster) + 2)
    expect(after.effects).toMatchObject([
      { modifier: { applies: 'ac', value: 2 }, source: 'caster' },
      { modifier: null, source: 'caster' },
    ])
    expect(screen.queryByRole('button', { name: 'Roll saves' })).toBeNull()
    expect(
      dispatch.mock.calls.some(([action]) => action.type === 'update' && action.id === 'target'),
    ).toBe(false)
  })

  it('resolves Lance as an attack and anchors Restrained to the target’s next turn', () => {
    const dispatch = cast('lance', entry)
    expect(screen.queryByLabelText('Save DC')).toBeNull()
    expect(screen.getByText(/Apply Restrained only on a hit/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
    fireEvent.click(screen.getByRole('button', { name: 'Roll attack' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply Lance to Ogre' }))
    const update = dispatch.mock.calls
      .map(([action]) => action)
      .find((action) => action.type === 'update' && action.id === 'target')
    expect(update.update(target).effects).toMatchObject([
      {
        name: 'Restrained',
        source: 'target',
        duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
      },
    ])
  })

  it('offers no Prone effect when the initial save succeeds', () => {
    const dispatch = cast('steam-gout', entry)
    fireEvent.change(screen.getByLabelText('Save DC'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
    fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
    expect(screen.queryByRole('button', { name: /Apply Steam Gout/ })).toBeNull()
    expect(dispatch.mock.calls.some(([action]) => action.type === 'update')).toBe(false)
  })

  it.each(['eruption', 'magma-spray', 'steam-gout'])(
    'sustains %s’s area even when all targets save',
    (slug) => {
      const dispatch = cast(slug, entry)
      fireEvent.change(screen.getByLabelText('Save DC'), { target: { value: '1' } })
      fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
      fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
      fireEvent.click(screen.getByRole('button', { name: 'Apply damage' }))
      const update = dispatch.mock.calls
        .map(([action]) => action)
        .find((action) => action.type === 'update' && action.id === 'caster')
      expect(update.update(caster).concentration?.spell).toBe(card(slug).name)
    },
  )

  it('opens Smelting Blast as an attack without prematurely applying its coating', () => {
    cast('smelting-blast', entry)
    expect(screen.getByRole('button', { name: 'Roll attack' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Save DC')).toBeNull()
    expect(screen.queryByRole('button', { name: /Apply Smelting Blast/ })).toBeNull()
    expect(
      screen.getByText(/After a hit, separately resolve a Constitution save/),
    ).toBeInTheDocument()
  })

  it('does not resolve Crown of Thorns’ later trigger as an initial save', () => {
    cast('crown-of-thorns', entry)
    expect(screen.queryByRole('button', { name: 'Roll saves' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Roll damage' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Apply effect' })).toBeInTheDocument()
  })

  it('shows reviewed manual-only spells without inventing an initial resolver', () => {
    cast('gale', entry)
    expect(screen.getByText('Manual spell:')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Roll saves' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Roll attack' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Apply effect' })).toBeNull()
  })
})
