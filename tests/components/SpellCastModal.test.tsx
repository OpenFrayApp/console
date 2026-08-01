// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import type { Creature } from '../../src/schema/creature.ts'
import type { MonsterCombatant } from '../../src/schema/combatant.ts'
import type { Spell } from '../../src/schema/spell.ts'
import { SpellCastModal } from '../../src/components/SpellCastModal.tsx'

/** A caster template with a fixed save DC and spell attack bonus. */
function creature(): Creature {
  return {
    id: 'srd:kobold-mage',
    source: 'srd-5.2',
    name: 'Kobold Mage',
    size: 'Small',
    type: 'humanoid',
    ac: 12,
    maxHp: 27,
    speed: { walk: 30 },
    abilities: { str: 7, dex: 15, con: 12, int: 10, wis: 11, cha: 8 },
    senses: { passivePerception: 10 },
    spellcasting: { ability: 'wis', saveDc: 13, toHit: 5, groups: [] },
  }
}

/** The casting monster, optionally overridden (e.g. already concentrating). */
function caster(over: Partial<MonsterCombatant> = {}): MonsterCombatant {
  return {
    isPC: false,
    combatantId: 'km',
    creatureId: 'srd:kobold-mage',
    creature: creature(),
    label: 'Kobold Mage',
    initiative: 10,
    status: 'active',
    hp: { current: 27, max: 27, temp: 0 },
    slotsUsed: {},
    spellUsesSpent: {},
    limitedUseState: {},
    legendaryRemaining: 0,
    concentration: null,
    effects: [],
    visibility: { name: 'shown', hp: 'bloodied', conditions: 'shown', ac: 'hidden' },
    ...over,
  }
}

/** A compendium spell fixture; overrides add mechanics or concentration. */
function spell(name: string, over: Partial<Spell> = {}): Spell {
  return {
    id: `srd-5.2:${name.toLowerCase().replace(/ /g, '-')}`,
    source: 'srd-5.2',
    name,
    level: 1,
    school: 'Evocation',
    castingTime: 'action',
    range: '60 feet',
    components: { verbal: true, somatic: false, material: false },
    duration: 'instantaneous',
    concentration: false,
    ritual: false,
    text: 'A test spell.',
    ...over,
  }
}

/** A save spell (CON, half) that must hand off to the resolver after casting. */
const poisonWave = (): Spell =>
  spell('Poison Wave', {
    mechanics: {
      damage: [{ formula: '2d6', type: 'poison' }],
      save: { ability: 'con', onSave: 'half' },
    },
  })

/** Render the modal with default fixtures and mocked callbacks; overrides replace props. */
function renderModal(over: Partial<ComponentProps<typeof SpellCastModal>> = {}) {
  const callbacks = {
    dispatch: vi.fn(),
    onRoll: vi.fn(),
    onCast: vi.fn(),
    onRestore: vi.fn(),
    onClose: vi.fn(),
  }
  render(
    <SpellCastModal
      caster={caster()}
      spellRef={{ name: 'poison wave' }}
      spell={poisonWave()}
      usesRemaining={2}
      combatants={[caster()]}
      {...callbacks}
      {...over}
    />,
  )
  return callbacks
}

beforeEach(() => {
  // Force reduced motion so the resolver's die settles instantly (no rAF in jsdom).
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

describe('SpellCastModal', () => {
  it('shows the cast line, remaining uses, and the spell card', () => {
    renderModal()
    expect(screen.getByText('Kobold Mage casts Poison Wave')).toBeInTheDocument()
    expect(screen.getByText('2 uses left')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Poison Wave' })).toBeInTheDocument()
    expect(screen.getByText('Casting Time')).toBeInTheDocument()
    expect(screen.getByText('A test spell.')).toBeInTheDocument()
  })

  it('falls back for an unresolved spell ref and closes on demand', () => {
    const { onClose } = renderModal({
      spell: undefined,
      spellRef: { name: 'eldritch hum' },
      usesRemaining: null,
    })
    expect(screen.getByText('Kobold Mage casts Eldritch Hum')).toBeInTheDocument()
    expect(screen.getByText('At will')).toBeInTheDocument()
    expect(screen.getByText(/No compendium entry for this spell/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('casting a utility spell spends the use and reports it', () => {
    const { onCast } = renderModal({
      spell: spell('Arcane Muttering'),
      spellRef: { name: 'arcane muttering' },
      usesRemaining: 1,
    })
    expect(screen.getByText('1 use left')).toBeInTheDocument()
    expect(onCast).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Cast' }))
    expect(onCast).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Cast — spent a use.')).toBeInTheDocument()
  })

  it("hands a save spell to the resolver seeded with the caster's DC", () => {
    const { onCast } = renderModal({
      combatants: [caster(), caster({ combatantId: 't', label: 'Ogre' })],
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cast' }))
    expect(onCast).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog', { name: 'Kobold Mage · Poison Wave' })).toBeInTheDocument()
    expect((screen.getByLabelText('Save DC') as HTMLInputElement).value).toBe('13')
    expect((screen.getByLabelText('On save') as HTMLSelectElement).value).toBe('half')
  })

  it('gates casting when uses run out and offers to restore one', () => {
    const { onCast, onRestore } = renderModal({ usesRemaining: 0 })
    expect(screen.getByRole('button', { name: 'Cast' })).toBeDisabled()
    expect(screen.getByText(/No uses remaining/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'restore one' }))
    expect(onRestore).toHaveBeenCalledTimes(1)
    expect(onCast).not.toHaveBeenCalled()
  })

  it('confirms before stacking a second concentration spell', () => {
    const { onCast } = renderModal({
      caster: caster({ concentration: { spell: 'Hold Person', saveDc: 13, round: 1 } }),
      spell: spell('Arcane Muttering', { concentration: true, duration: 'up to 1 minute' }),
      spellRef: { name: 'arcane muttering' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cast' }))
    expect(onCast).not.toHaveBeenCalled()
    expect(screen.getByText(/already concentrating on Hold Person/)).toBeInTheDocument()

    // Backing out keeps the use unspent.
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByText(/already concentrating/)).toBeNull()
    expect(onCast).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Cast' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cast anyway' }))
    expect(onCast).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Cast — spent a use.')).toBeInTheDocument()
  })
})

// Casting is not landing. A spell every target shrugs off leaves the caster holding
// nothing, so concentration waits for the board to answer — the same rule the GM's
// own Cast spell panel follows.
describe('SpellCastModal — when concentration begins', () => {
  /** The concentration a dispatched update would start on the caster, if any. */
  const concentrationFrom = (dispatch: ReturnType<typeof vi.fn>) =>
    dispatch.mock.calls
      .map((c) => c[0])
      .filter((a) => a.type === 'update' && a.id === 'km')
      .map((a) => a.update(caster()).concentration)
      .find(Boolean)

  /** A save spell the caster has to sustain. */
  const holdWave = (): Spell =>
    spell('Poison Wave', {
      concentration: true,
      duration: 'up to 1 minute',
      mechanics: {
        damage: [{ formula: '2d6', type: 'poison' }],
        save: { ability: 'con', onSave: 'half' },
      },
    })

  it('does not concentrate on the cast of a save spell', () => {
    const { dispatch } = renderModal({
      spell: holdWave(),
      combatants: [caster(), caster({ combatantId: 't', label: 'Ogre' })],
      round: 2,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cast' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
    fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
    expect(concentrationFrom(dispatch)).toBeUndefined()
  })

  it('starts concentrating once a target has failed', () => {
    const { dispatch } = renderModal({
      spell: holdWave(),
      combatants: [caster(), caster({ combatantId: 't', label: 'Ogre' })],
      round: 2,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cast' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ogre' }))
    fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
    fireEvent.click(screen.getByRole('button', { name: 'Fail' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply damage' }))
    expect(concentrationFrom(dispatch)).toMatchObject({
      spell: 'Poison Wave',
      saveDc: 13,
      round: 2,
      rounds: 10,
    })
  })

  it('starts concentrating once a buff lands on someone', () => {
    const { dispatch } = renderModal({
      spell: spell('Bless', { concentration: true, duration: 'up to 1 minute' }),
      spellRef: { name: 'bless' },
      round: 4,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cast' }))
    expect(concentrationFrom(dispatch)).toBeUndefined()
    fireEvent.click(screen.getByRole('button', { name: 'Apply effect' }))
    expect(concentrationFrom(dispatch)).toMatchObject({ spell: 'Bless', round: 4, rounds: 10 })
  })

  // Nothing to roll and nothing to put on a creature: the cast is the whole event,
  // so there is no landing to wait for.
  it('concentrates on the cast when the spell touches no one', () => {
    const { dispatch } = renderModal({
      spell: spell('Wall of Force', { concentration: true, duration: 'up to 10 minutes' }),
      spellRef: { name: 'wall of force' },
      round: 1,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cast' }))
    expect(concentrationFrom(dispatch)).toMatchObject({ spell: 'Wall of Force', rounds: 100 })
  })
})
