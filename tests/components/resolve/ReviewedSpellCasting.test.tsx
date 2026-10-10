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
import type { RollContext } from '../../../src/dice/roll.ts'

const dice = vi.hoisted(() => ({ draw: 10 }))
vi.mock('../../../src/dice/roll.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/dice/roll.ts')>()
  return {
    ...actual,
    roll: (formula: string, context: RollContext = {}) =>
      actual.roll(formula, { ...context, rand: () => dice.draw }),
  }
})

const cards = JSON.parse(
  readFileSync('public/compendium/tome-of-heroes-spells.json', 'utf8'),
) as Spell[]
const soManyCards = JSON.parse(
  readFileSync('public/compendium/so-many-spells-spells.json', 'utf8'),
) as Spell[]
const stdsCards = JSON.parse(
  readFileSync('public/compendium/spells-that-dont-suck-spells.json', 'utf8'),
) as Spell[]
const kibblesCards = JSON.parse(
  readFileSync('public/compendium/kibbles-casting-v23-spells.json', 'utf8'),
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

/** Get the approved Kibbles card with its source-specific identity. */
function kibblesCard(slug: string): Spell {
  return kibblesCards.find((spell) => spell.id === `kibblestasty-casting-compendium-v2.3:${slug}`)!
}

/** Open an actual catalog spell through either casting entry point. */
function cast(slug: string | Spell, entry: 'panel' | 'monster') {
  const spell = typeof slug === 'string' ? card(slug) : slug
  const dispatch = vi.fn()
  if (entry === 'panel') {
    render(
      <CastSpellPanel
        preparedSpell={spell}
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
        spellRef={{ name: spell.name }}
        spell={spell}
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
  dice.draw = 10
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

  it('does not offer Lance’s Restrained effect after a miss', () => {
    dice.draw = 0
    const dispatch = cast('lance', entry)
    fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
    fireEvent.click(screen.getByRole('button', { name: 'Roll attack' }))
    expect(screen.queryByRole('button', { name: 'Apply Lance to Ogre' })).toBeNull()
    expect(dispatch.mock.calls.some(([action]) => action.type === 'update')).toBe(false)
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

/** Get an approved So Many Spells card without test-authored mechanics. */
function soManyCard(slug: string) {
  return soManyCards.find((spell) => spell.id === `somanyrobots-so-many-spells:${slug}`)!
}

describe.each(['panel', 'monster'] as const)('So Many Spells through %s casting', (entry) => {
  it.each(['auric-lance', 'thorn-lance', 'molten-shard', 'venomous-maw', 'sonic-blast'])(
    'offers %s riders only after a hit',
    (slug) => {
      const spell = soManyCard(slug)
      const dispatch = cast(spell, entry)
      expect(screen.getByText('GM resolution:')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
      fireEvent.click(screen.getByRole('button', { name: 'Roll attack' }))
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`Apply ${spell.name}`) }))
      const update = dispatch.mock.calls
        .map(([action]) => action)
        .find((action) => action.type === 'update' && action.id === 'target')
      expect(update.update(target).effects.length).toBeGreaterThan(0)
    },
  )

  it.each(['auric-lance', 'thorn-lance', 'molten-shard', 'venomous-maw', 'sonic-blast'])(
    'does not offer %s riders after a natural 1 miss',
    (slug) => {
      dice.draw = 0
      const spell = soManyCard(slug)
      const dispatch = cast(spell, entry)
      fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
      fireEvent.click(screen.getByRole('button', { name: 'Roll attack' }))
      expect(screen.getByText('Critical miss!')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: new RegExp(`Apply ${spell.name}`) })).toBeNull()
      expect(dispatch).not.toHaveBeenCalled()
    },
  )

  it('casts Deathgrip as an attack with no immediate damage', () => {
    const dispatch = cast(soManyCard('deathgrip'), entry)
    expect(screen.getByText(/Initial ranged spell attack deals no damage/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
    fireEvent.click(screen.getByRole('button', { name: 'Roll attack' }))
    expect(screen.queryByLabelText('Damage to apply')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Apply Deathgrip/ }))
    const update = dispatch.mock.calls
      .map(([action]) => action)
      .find((action) => action.type === 'update' && action.id === 'target')
    expect(update.update(target).hp.current).toBe(target.hp.current)
    expect(update.update(target).effects).toMatchObject([{ name: 'Deathgrip', modifier: null }])
    expect(
      update
        .update(target)
        .effects.some((effect: { name: string }) => effect.name === 'Restrained'),
    ).toBe(false)
  })

  it.each([
    'conjure-poltergeist',
    'eclipse',
    'grasping-dead',
    'irresistible-melody',
    'shard-rain',
    'sonorous-toll',
    'starfire-beam',
    'stormwall',
    'vampiric-mist',
    'wall-of-misery',
  ])('keeps %s creation concentrating after successful initial saves', (slug) => {
    const spell = soManyCard(slug)
    const dispatch = cast(spell, entry)
    fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
    fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.queryByRole('button', { name: new RegExp(`Apply ${spell.name}`) })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Apply damage' }))
    const update = dispatch.mock.calls
      .map(([action]) => action)
      .find((action) => action.type === 'update' && action.id === 'caster')
    expect(update?.update(caster).concentration?.spell).toBe(spell.name)
    expect(
      dispatch.mock.calls
        .filter(([action]) => action.type === 'update' && action.id === 'target')
        .flatMap(([action]) => action.update(target).effects),
    ).toEqual([])
  })

  it.each([
    'deadly-light',
    'death-hex',
    'grasping-dead',
    'melt-flesh',
    'poison-light',
    'putrefy',
    'shackle-of-flame',
    'wind-of-ruin',
  ])('does not roll later damage or HP reductions during %s initial save', (slug) => {
    cast(soManyCard(slug), entry)
    fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
    fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
    expect(screen.getByLabelText('Damage to Ogre')).toHaveValue('0')
  })

  it.each([
    'ghastly-stampede',
    'gloamblast',
    'lightning-spike',
    'screaming-skull',
    'searing-hammer',
    'thunderous-chords',
    'volcanic-seep',
  ])('keeps %s mixed or ambiguous rules explicitly manual', (slug) => {
    cast(soManyCard(slug), entry)
    expect(screen.getByText('Manual spell:')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Roll saves' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Roll attack' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Apply effect' })).toBeNull()
  })

  it('tracks Fetid Blade on the wielder with caster-owned concentration and no initial save', () => {
    const dispatch = cast(soManyCard('fetid-blade'), entry)
    expect(screen.queryByRole('button', { name: 'Roll saves' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply effect' }))
    const update = dispatch.mock.calls
      .map(([action]) => action)
      .find((action) => action.type === 'update' && action.id === 'target')
    expect(update.update(target).effects).toMatchObject([
      { name: 'Fetid Blade', source: 'caster', concentration: true },
    ])
  })
})

/** Get an approved Spells That Don’t Suck card without invented mechanics. */
function stdsCard(slug: string) {
  return stdsCards.find((spell) => spell.id === `somanyrobots-spells-that-dont-suck:${slug}`)!
}

describe.each(['panel', 'monster'] as const)(
  'Spells That Don’t Suck through %s casting',
  (entry) => {
    it.each([
      'caustic-quarrel',
      'draining-bolt',
      'ghost-touch',
      'lightning-leash',
      'touch-of-filth',
    ])('offers %s riders only after a hit', (slug) => {
      const spell = stdsCard(slug)
      const dispatch = cast(spell, entry)
      fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
      fireEvent.click(screen.getByRole('button', { name: 'Roll attack' }))
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`Apply ${spell.name}`) }))
      const update = dispatch.mock.calls
        .map(([action]) => action)
        .find((action) => action.type === 'update' && action.id === 'target')
      expect(update.update(target).effects.length).toBeGreaterThan(0)
    })

    it.each([
      'caustic-quarrel',
      'draining-bolt',
      'ghost-touch',
      'lightning-leash',
      'touch-of-filth',
      'inflict-disease',
    ])('offers no %s rider after a miss', (slug) => {
      dice.draw = 0
      const spell = stdsCard(slug)
      const dispatch = cast(spell, entry)
      fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
      fireEvent.click(screen.getByRole('button', { name: 'Roll attack' }))
      expect(screen.getByText('Critical miss!')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: new RegExp(`Apply ${spell.name}`) })).toBeNull()
      expect(dispatch).not.toHaveBeenCalled()
    })

    it('applies disease reminder without initial damage or a preemptive disease condition', () => {
      const dispatch = cast(stdsCard('inflict-disease'), entry)
      fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
      fireEvent.click(screen.getByRole('button', { name: 'Roll attack' }))
      expect(screen.queryByLabelText('Damage to apply')).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: /Apply Inflict Disease/ }))
      const update = dispatch.mock.calls
        .map(([action]) => action)
        .find((action) => action.type === 'update' && action.id === 'target')
      expect(update.update(target).hp.current).toBe(target.hp.current)
      expect(update.update(target).effects).toMatchObject([
        { name: 'Inflict Disease', modifier: null },
      ])
    })

    it.each([
      'animal-transformation',
      'bewilder',
      'captivate',
      'earth-leash',
      'expose-weakness',
      'expulsion',
      'false-foes',
      'injunction',
      'phantasm',
      'phantasmal-nightmares',
      'unbridled-fury',
    ])('does not roll %s later damage or HP reduction at casting', (slug) => {
      cast(stdsCard(slug), entry)
      fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
      fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
      expect(screen.getByLabelText('Damage to Ogre')).toHaveValue('0')
    })

    it.each(['black-ice', 'drink-life', 'great-wave', 'muddy-servant', 'rain-of-fire'])(
      'sustains %s creation after successful saves',
      (slug) => {
        const spell = stdsCard(slug)
        const dispatch = cast(spell, entry)
        fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
        fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
        fireEvent.click(screen.getByRole('button', { name: 'Save' }))
        expect(screen.queryByRole('button', { name: new RegExp(`Apply ${spell.name}`) })).toBeNull()
        fireEvent.click(screen.getByRole('button', { name: 'Apply damage' }))
        const update = dispatch.mock.calls
          .map(([action]) => action)
          .find((action) => action.type === 'update' && action.id === 'caster')
        expect(update?.update(caster).concentration?.spell).toBe(spell.name)
        expect(
          dispatch.mock.calls
            .filter(([action]) => action.type === 'update' && action.id === 'target')
            .flatMap(([action]) => action.update(target).effects),
        ).toEqual([])
      },
    )

    it('applies Mass Freeze only to a failed target and links both effects to caster concentration', () => {
      const dispatch = cast(stdsCard('mass-freeze'), entry)
      fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
      fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
      fireEvent.click(screen.getByRole('button', { name: /Apply Mass Freeze/ }))
      const update = dispatch.mock.calls
        .map(([action]) => action)
        .find((action) => action.type === 'update' && action.id === 'target')
      expect(update.update(target).effects).toMatchObject([
        { name: 'Restrained', source: 'caster', concentration: true },
        { name: 'Mass Freeze', source: 'caster', concentration: true },
      ])
    })

    it('offers no frozen condition on a successful save', () => {
      const dispatch = cast(stdsCard('mass-freeze'), entry)
      fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
      fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      expect(screen.queryByRole('button', { name: /Apply Mass Freeze/ })).toBeNull()
      expect(dispatch.mock.calls.some(([action]) => action.type === 'update')).toBe(false)
    })

    it.each([
      'death-ray',
      'prismatic-bolt',
      'scintillant-blast',
      'shatter-mind',
      'siphon-life',
      'spreadshot',
      'morph-earth',
    ])('keeps %s mixed branches explicitly manual', (slug) => {
      cast(stdsCard(slug), entry)
      expect(screen.getByText('Manual spell:')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Roll saves' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Roll attack' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Apply effect' })).toBeNull()
    })

    it('does not invent concentration for Lashing Vine after its optional pull save', () => {
      const dispatch = cast(stdsCard('lashing-vine'), entry)
      fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
      fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      fireEvent.click(screen.getByRole('button', { name: 'Apply damage' }))
      expect(stdsCard('lashing-vine').concentration).toBe(false)
      expect(
        dispatch.mock.calls.some(([action]) => action.type === 'update' && action.id === 'caster'),
      ).toBe(false)
    })

    it('offers Oakenhide reminder without adding initial temporary HP or an AC bonus', () => {
      const dispatch = cast(stdsCard('oakenhide'), entry)
      expect(screen.queryByRole('button', { name: 'Roll saves' })).toBeNull()
      const update = dispatch.mock.calls
        .map(([action]) => action)
        .find((action) => action.type === 'update' && action.id === 'caster')
      expect(update.update(caster).hp).toEqual(caster.hp)
      expect(update.update(caster).concentration).toBeNull()
      expect(acOf(update.update(caster))).toBe(acOf(caster))
      expect(update.update(caster).effects).toMatchObject([
        {
          name: 'Oakenhide',
          modifier: null,
          source: 'caster',
          duration: { type: 'rounds', rounds: 10 },
        },
      ])
    })
  },
)

describe.each(['panel', 'monster'] as const)('Kibbles through %s casting', (entry) => {
  it.each(['acid-bubble', 'electrocute', 'mind-blast', 'flash-freeze', 'shadow-bind', 'supernova'])(
    'opens %s initial save and manual guidance',
    (slug) => {
      cast(kibblesCard(slug), entry)
      expect(screen.getByLabelText('Save DC')).toHaveValue('99')
      expect(screen.getByText('GM resolution:')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Roll attack' })).toBeNull()
    },
  )

  it.each(['melting-glob', 'decaying-touch', 'freeze'])('gates %s later rider on a hit', (slug) => {
    const spell = kibblesCard(slug)
    const dispatch = cast(spell, entry)
    fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
    fireEvent.click(screen.getByRole('button', { name: 'Roll attack' }))
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`Apply ${spell.name}`) }))
    const update = dispatch.mock.calls
      .map(([action]) => action)
      .find((action) => action.type === 'update' && action.id === 'target')
    expect(update.update(target).effects).toHaveLength(1)
  })

  it.each(['melting-glob', 'decaying-touch', 'freeze'])(
    'never applies %s rider on a miss',
    (slug) => {
      dice.draw = 0
      const spell = kibblesCard(slug)
      const dispatch = cast(spell, entry)
      fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
      fireEvent.click(screen.getByRole('button', { name: 'Roll attack' }))
      expect(screen.getByText('Critical miss!')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: new RegExp(`Apply ${spell.name}`) })).toBeNull()
      expect(dispatch).not.toHaveBeenCalled()
    },
  )

  it.each(['elemental-orb', 'ice-arrow', 'water-bullet', 'wasp-barrage', 'windborne-weapon'])(
    'keeps %s type/modifier-dependent damage manual',
    (slug) => {
      cast(kibblesCard(slug), entry)
      fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
      fireEvent.click(screen.getByRole('button', { name: 'Roll attack' }))
      expect(screen.queryByLabelText('Damage to apply')).toBeNull()
      expect(screen.getByText('GM resolution:')).toBeInTheDocument()
    },
  )

  it.each(['fire-cyclone', 'flamethrower', 'starfall', 'thunder-pulse', 'vicious-vapors'])(
    'retains %s concentration after successful initial saves',
    (slug) => {
      const spell = kibblesCard(slug)
      const dispatch = cast(spell, entry)
      fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
      fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      expect(screen.queryByRole('button', { name: new RegExp(`Apply ${spell.name}`) })).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'Apply damage' }))
      const update = dispatch.mock.calls
        .map(([action]) => action)
        .find((action) => action.type === 'update' && action.id === 'caster')
      expect(update.update(caster).concentration?.spell).toBe(spell.name)
      expect(
        dispatch.mock.calls
          .filter(([action]) => action.type === 'update' && action.id === 'target')
          .flatMap(([action]) => action.update(target).effects),
      ).toEqual([])
    },
  )

  it('applies Mind Blast Stunned at target turn end only on failure', () => {
    const dispatch = cast(kibblesCard('mind-blast'), entry)
    fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
    fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
    fireEvent.click(screen.getByRole('button', { name: /Apply Mind Blast/ }))
    const update = dispatch.mock.calls
      .map(([action]) => action)
      .find((action) => action.type === 'update' && action.id === 'target')
    expect(update.update(target).effects).toMatchObject([
      {
        name: 'Stunned',
        source: 'target',
        duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
      },
    ])
  })

  it.each(['poison-dart', 'spider-bite', 'water-blast', 'crackle'])(
    'does not apply %s secondary-save condition after attack alone',
    (slug) => {
      const spell = kibblesCard(slug)
      const dispatch = cast(spell, entry)
      fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
      fireEvent.click(screen.getByRole('button', { name: 'Roll attack' }))
      fireEvent.click(screen.getByRole('button', { name: 'Apply to Ogre' }))
      const update = dispatch.mock.calls
        .map(([action]) => action)
        .find((action) => action.type === 'update' && action.id === 'target')
      expect(update.update(target).effects).toEqual([])
    },
  )

  it.each([
    'acidic-pit',
    'brilliant-blade',
    'ice-spike',
    'jumping-jolt',
    'whirling-conflagration',
    'exsanguinate',
  ])('keeps %s incompatible outcomes manual', (slug) => {
    cast(kibblesCard(slug), entry)
    expect(screen.getByText('Manual spell:')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Roll saves' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Roll attack' })).toBeNull()
  })

  it.each(['acid-rain', 'heavenly-ray', 'summon-dragon', 'sanguine-spears', 'vampiric-mosquito'])(
    'tracks %s creation without premature damage or healing',
    (slug) => {
      const spell = kibblesCard(slug)
      const dispatch = cast(spell, entry)
      expect(screen.queryByRole('button', { name: 'Roll saves' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Roll attack' })).toBeNull()
      const update = dispatch.mock.calls
        .map(([action]) => action)
        .find((action) => action.type === 'update' && action.id === 'caster')
      expect(update.update(caster).hp).toEqual(caster.hp)
      expect(update.update(caster).effects).toMatchObject([
        { name: spell.name, source: 'caster', modifier: null },
      ])
    },
  )
})
