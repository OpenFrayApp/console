// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { MonsterCombatant, PlayerCharacter } from '../../src/schema/combatant.ts'
import type { Spell } from '../../src/schema/spell.ts'
import type { Creature } from '../../src/schema/creature.ts'

const spellBase = {
  source: 'srd-5.2',
  school: 'Evocation',
  castingTime: 'action',
  range: '150 feet',
  components: { verbal: true, somatic: true, material: false },
  duration: 'instantaneous',
  concentration: false,
  ritual: false,
  text: '',
} as const

const FIREBALL: Spell = {
  ...spellBase,
  id: 'srd-5.2:fireball',
  name: 'Fireball',
  level: 3,
  mechanics: {
    damage: [{ formula: '8d6', type: 'fire' }],
    save: { ability: 'dex', onSave: 'half' },
    scaling: [{ level: 4, by: 'slot', damage: [{ formula: '9d6', type: 'fire' }] }],
  },
}

const LIGHT: Spell = {
  ...spellBase,
  id: 'srd-5.2:light',
  name: 'Light',
  level: 0,
  // no mechanics — a utility spell, not castable here
}

const BLESS: Spell = {
  ...spellBase,
  id: 'srd-5.2:bless',
  name: 'Bless',
  level: 1,
  school: 'Enchantment',
  duration: 'up to 1 minute',
  concentration: true,
  // no mechanics — a buff
}

vi.mock('../../src/compendium/srd.ts', () => ({
  loadSrdSpells: () => Promise.resolve([FIREBALL, LIGHT, BLESS]),
  loadSrdCreatures: () => Promise.resolve([]),
}))

const { CastSpellPanel } = await import('../../src/components/CastSpellPanel.tsx')

function creature(): Creature {
  return {
    id: 'srd:goblin',
    source: 'srd-5.2',
    name: 'Goblin',
    size: 'Small',
    type: 'humanoid',
    ac: 15,
    maxHp: 7,
    speed: { walk: 30 },
    abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
    senses: { passivePerception: 9 },
  }
}

function monster(): MonsterCombatant {
  return {
    isPC: false,
    combatantId: 'g1',
    creatureId: 'srd:goblin',
    creature: creature(),
    label: 'Goblin (A)',
    initiative: 17,
    status: 'active',
    hp: { current: 7, max: 7, temp: 0 },
    slotsUsed: {},
    spellUsesSpent: {},
    limitedUseState: {},
    legendaryRemaining: 0,
    concentration: null,
    effects: [],
    visibility: { name: 'shown', hp: 'bloodied', conditions: 'shown', ac: 'hidden' },
  }
}

afterEach(cleanup)

describe('CastSpellPanel', () => {
  it('lists all spells (incl. buffs) and opens a save spell in the mass-save modal', async () => {
    const onRoll = vi.fn()
    const dispatch = vi.fn()
    render(
      <CastSpellPanel
        combatants={[monster()]}
        dispatch={dispatch}
        onRoll={onRoll}
        onNote={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByText('Cast spell'))
    await waitFor(() => expect(screen.getByText('Fireball')).toBeTruthy())
    // A no-mechanics utility/buff spell is listed too (so Bless et al. are castable).
    expect(screen.getByText('Light')).toBeTruthy()

    fireEvent.click(screen.getByText('Fireball'))
    // A save spell opens the same group-save modal a monster's save action uses,
    // seeded from the spell (DEX save, GM-editable DC) — no upcast selector.
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getAllByText(/DEX save/i).length).toBeGreaterThan(0)
    expect(screen.getByLabelText('Save DC')).toBeTruthy()
    expect(screen.queryByLabelText('Cast level')).toBeNull()
    expect(screen.getByText('Roll saves')).toBeTruthy()
  })

  it('shows the reference card for a buff spell with no rollable mechanics', async () => {
    render(
      <CastSpellPanel
        combatants={[monster()]}
        dispatch={vi.fn()}
        onRoll={vi.fn()}
        onNote={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('Cast spell'))
    await waitFor(() => expect(screen.getByText('Light')).toBeTruthy())
    fireEvent.click(screen.getByText('Light'))
    expect(screen.getByText(/Cast Light/)).toBeTruthy()
    // The card lists reference fields rather than a roll button.
    expect(screen.getByText('Casting Time')).toBeTruthy()
    expect(screen.queryByText('Roll damage')).toBeNull()
  })

  it('lists only spells from enabled libraries', async () => {
    render(
      <CastSpellPanel
        combatants={[monster()]}
        dispatch={vi.fn()}
        onRoll={vi.fn()}
        onNote={vi.fn()}
        enabledLibraries={['srd-5.1']}
      />,
    )
    fireEvent.click(screen.getByText('Cast spell'))
    // Both mocked spells are srd-5.2, so none show when only 5.1 is enabled.
    await waitFor(() => expect(screen.getByText('No matches')).toBeTruthy())
    expect(screen.queryByText('Fireball')).toBeNull()
  })

  it('disables casting with no combatants', () => {
    render(<CastSpellPanel combatants={[]} dispatch={vi.fn()} onRoll={vi.fn()} onNote={vi.fn()} />)
    expect((screen.getByText('Cast spell') as HTMLButtonElement).disabled).toBe(true)
  })

  /** Open the panel, choose the monster as caster, and pick a spell. */
  const cast = async (name: string) => {
    fireEvent.click(screen.getByText('Cast spell'))
    await waitFor(() => expect(screen.getByText(name)).toBeTruthy())
    fireEvent.change(screen.getByLabelText('Caster'), { target: { value: 'g1' } })
    fireEvent.click(screen.getByText(name))
  }

  /** The concentration a dispatched update would start on the caster, if any. */
  const concentrationFrom = (dispatch: ReturnType<typeof vi.fn>) =>
    dispatch.mock.calls
      .map((c) => c[0])
      .filter((a) => a.type === 'update' && a.id === 'g1')
      .map((a) => a.update(monster()).concentration)
      .find(Boolean)

  it('records the cast in the game log, naming the caster', async () => {
    const onNote = vi.fn()
    render(
      <CastSpellPanel
        combatants={[monster()]}
        dispatch={vi.fn()}
        onRoll={vi.fn()}
        onNote={onNote}
      />,
    )
    await cast('Bless')
    expect(onNote).toHaveBeenCalledWith('Goblin (A) casts Bless', 'cast')
  })

  // Picking a spell is not casting it, and a spell nobody is affected by has nothing
  // to sustain — so concentration waits until the effect actually lands on someone.
  it('does not start concentrating merely because a spell was picked', async () => {
    const dispatch = vi.fn()
    render(
      <CastSpellPanel
        combatants={[monster()]}
        dispatch={dispatch}
        onRoll={vi.fn()}
        onNote={vi.fn()}
        round={2}
      />,
    )
    await cast('Bless')
    expect(concentrationFrom(dispatch)).toBeUndefined()
  })

  it('starts the caster concentrating once the buff lands on someone', async () => {
    const dispatch = vi.fn()
    render(
      <CastSpellPanel
        combatants={[monster()]}
        dispatch={dispatch}
        onRoll={vi.fn()}
        onNote={vi.fn()}
        round={2}
      />,
    )
    await cast('Bless')
    fireEvent.click(screen.getByText('Apply effect'))
    expect(concentrationFrom(dispatch)).toMatchObject({ spell: 'Bless', round: 2, rounds: 10 })
  })

  it("seeds the save DC from a monster caster's spellcasting", async () => {
    const caster: MonsterCombatant = {
      ...monster(),
      creature: { ...creature(), spellcasting: { ability: 'int', saveDc: 16, groups: [] } },
    }
    render(
      <CastSpellPanel combatants={[caster]} dispatch={vi.fn()} onRoll={vi.fn()} onNote={vi.fn()} />,
    )
    fireEvent.click(screen.getByText('Cast spell'))
    await waitFor(() => expect(screen.getByText('Fireball')).toBeTruthy())
    fireEvent.change(screen.getByLabelText('Caster'), { target: { value: 'g1' } })
    fireEvent.click(screen.getByText('Fireball'))
    expect((screen.getByLabelText('Save DC') as HTMLInputElement).value).toBe('16')
  })
})

// The GM has already said who they mean by selecting a row or by taking that
// creature's turn, so the picker opens on them rather than on "No caster".
describe('CastSpellPanel — who is casting', () => {
  const second = (): MonsterCombatant => ({ ...monster(), combatantId: 'g2', label: 'Goblin (B)' })

  /** Render the panel with a prefilled caster and open its picker. */
  const openWith = (defaultCasterId?: string | null) => {
    const view = render(
      <CastSpellPanel
        combatants={[monster(), second()]}
        dispatch={vi.fn()}
        onRoll={vi.fn()}
        onNote={vi.fn()}
        defaultCasterId={defaultCasterId}
      />,
    )
    fireEvent.click(screen.getByText('Cast spell'))
    return view
  }

  it('opens on the combatant the GM is looking at', () => {
    openWith('g2')
    expect((screen.getByLabelText('Caster') as HTMLSelectElement).value).toBe('g2')
  })

  it('follows the board when the selection moves on', () => {
    const { rerender } = openWith('g1')
    rerender(
      <CastSpellPanel
        combatants={[monster(), second()]}
        dispatch={vi.fn()}
        onRoll={vi.fn()}
        onNote={vi.fn()}
        defaultCasterId="g2"
      />,
    )
    expect((screen.getByLabelText('Caster') as HTMLSelectElement).value).toBe('g2')
  })

  it('leaves the GM casting when nobody is selected', () => {
    openWith(null)
    expect((screen.getByLabelText('Caster') as HTMLSelectElement).value).toBe('')
  })

  it('falls back to no caster when the prefilled one has left the board', () => {
    openWith('gone')
    expect((screen.getByLabelText('Caster') as HTMLSelectElement).value).toBe('')
  })
})

describe('CastSpellPanel — the caster’s numbers', () => {
  /** A roster character with the three facts the spellcasting numbers derive from. */
  const cleric = (over: Partial<PlayerCharacter> = {}): PlayerCharacter =>
    ({
      isPC: true,
      kind: 'pc',
      combatantId: 'p1',
      name: 'Hexena',
      class: 'Cleric',
      level: 5,
      abilities: { str: 10, dex: 12, con: 14, int: 10, wis: 18, cha: 8 },
      ac: 18,
      initiative: 0,
      status: 'active',
      hp: { current: 30, max: 30, temp: 0 },
      concentration: null,
      effects: [],
      ...over,
    }) as PlayerCharacter

  /** Open the panel with this caster preselected and cast Fireball (a save spell). */
  const castFireball = async (caster: PlayerCharacter) => {
    render(
      <CastSpellPanel
        combatants={[caster, monster()]}
        dispatch={vi.fn()}
        onRoll={vi.fn()}
        onNote={vi.fn()}
        defaultCasterId={caster.combatantId}
      />,
    )
    fireEvent.click(screen.getByText('Cast spell'))
    await waitFor(() => expect(screen.getByText('Fireball')).toBeTruthy())
    fireEvent.click(screen.getByText('Fireball'))
    return screen.getByLabelText('Save DC') as HTMLInputElement
  }

  it('seeds a character’s save DC from class, level and ability scores', async () => {
    // Cleric 5: 8 + proficiency 3 + WIS +4 = 15.
    expect((await castFireball(cleric())).value).toBe('15')
  })

  it('leaves the field to the GM when the sheet doesn’t say enough', async () => {
    // No level, so no proficiency bonus — a number would be short by 2 to 6.
    expect((await castFireball(cleric({ level: undefined }))).value).toBe('10')
  })

  it('leaves it to the GM for a class that casts through a subclass', async () => {
    expect((await castFireball(cleric({ class: 'Rogue' }))).value).toBe('10')
  })

  it('leaves it to the GM for an anonymous character, which carries none of the facts', async () => {
    const anon = cleric({ class: undefined, level: undefined, abilities: undefined })
    expect((await castFireball(anon)).value).toBe('10')
  })
})
