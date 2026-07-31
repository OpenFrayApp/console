// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import type { ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Creature } from '../../src/schema/creature.ts'
import {
  buildCreature,
  creatureToDraft,
  emptyDraft,
  type MonsterDraft,
} from '../../src/components/customMonster.ts'

vi.mock('../../src/compendium/srd.ts', () => ({
  loadSrdCreatures: () =>
    Promise.resolve([
      {
        id: 'srd-5.2:goblin',
        source: 'srd-5.2',
        name: 'Goblin',
        size: 'Small',
        type: 'humanoid',
        ac: 15,
        maxHp: 7,
        hpFormula: '2d6',
        speed: { walk: 30 },
        abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
        senses: { passivePerception: 9 },
        cr: 0.25,
        traits: [{ name: 'Nimble Escape', text: 'Disengage or Hide as a bonus action.' }],
      },
    ]),
  loadSrdSpells: () =>
    Promise.resolve([
      {
        id: 'srd-5.2:fireball',
        source: 'srd-5.2',
        name: 'Fireball',
        level: 3,
        school: 'Evocation',
        castingTime: '1 action',
        range: '150 feet',
        components: { verbal: true, somatic: true, material: true },
        duration: 'Instantaneous',
        concentration: false,
        ritual: false,
        text: 'A bright streak.',
      },
    ]),
}))

const { CustomMonsterForm } = await import('../../src/components/CustomMonsterForm.tsx')

afterEach(cleanup)

/** The blank monster draft with a few fields overridden. */
function draft(overrides: Partial<MonsterDraft> = {}): MonsterDraft {
  return { ...emptyDraft(), ...overrides }
}

/** Render the form and flush the mocked spell load so state settles inside act. */
async function renderForm(ui: ReactElement) {
  const view = render(ui)
  await act(async () => {})
  return view
}

describe('CustomMonsterForm', () => {
  it('renders nothing when closed', async () => {
    await renderForm(
      <CustomMonsterForm
        open={false}
        initialDraft={draft()}
        onClose={() => {}}
        onSubmit={() => {}}
      />,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders the sections from a prefilled draft, with the derived HP average', async () => {
    await renderForm(
      <CustomMonsterForm
        open
        initialDraft={draft({
          name: 'Frost Worm',
          ac: '18',
          hpDieCount: '16',
          hpDie: '10',
          hpMod: '32',
        })}
        onClose={() => {}}
        onSubmit={() => {}}
      />,
    )
    expect(screen.getByRole('dialog', { name: 'Create custom creature' })).toBeInTheDocument()
    for (const section of [
      'Identity',
      'Defense & HP',
      'Abilities & saves',
      'Traits',
      'Actions',
      'Legendary & lair',
      'Spellcasting',
    ]) {
      expect(screen.getByText(section)).toBeInTheDocument()
    }
    expect((screen.getByLabelText('Creature name') as HTMLInputElement).value).toBe('Frost Worm')
    expect((screen.getByLabelText('AC') as HTMLInputElement).value).toBe('18')
    expect(screen.getByText('= 120 HP avg')).toBeInTheDocument() // 16 × 5.5 + 32
  })

  it('patches fields and submits the built creature', async () => {
    const onSubmit = vi.fn()
    const onClose = vi.fn()
    await renderForm(
      <CustomMonsterForm open initialDraft={draft()} onClose={onClose} onSubmit={onSubmit} />,
    )

    fireEvent.change(screen.getByLabelText('Creature name'), { target: { value: '  Mire Hag  ' } })
    fireEvent.change(screen.getByLabelText('AC'), { target: { value: '15' } })
    fireEvent.change(screen.getByLabelText('Hit dice count'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Hit points modifier'), { target: { value: '9' } })
    fireEvent.change(screen.getByLabelText('walk speed'), { target: { value: '40' } })
    fireEvent.click(screen.getByLabelText('Can hover'))
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const creature = onSubmit.mock.calls[0][0] as Creature
    expect(creature.id.startsWith('custom:')).toBe(true)
    expect(creature).toMatchObject({
      source: 'custom',
      edition: '5.5',
      name: 'Mire Hag',
      ac: 15,
      maxHp: 18, // 2d8+9 → floor(2 × 4.5 + 9)
      hpFormula: '2d8+9',
      speed: { walk: 40, hover: true },
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('edits an existing creature, keeping its id', async () => {
    const existing = buildCreature(draft({ name: 'Grick', ac: '14', cr: '2' }))
    const onSubmit = vi.fn()
    await renderForm(
      <CustomMonsterForm
        open
        initialDraft={creatureToDraft(existing)}
        editId={existing.id}
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Edit creature' })).toBeInTheDocument()
    expect((screen.getByLabelText('Creature name') as HTMLInputElement).value).toBe('Grick')
    fireEvent.change(screen.getByLabelText('Creature name'), { target: { value: 'Grick Alpha' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    const creature = onSubmit.mock.calls[0][0] as Creature
    expect(creature.id).toBe(existing.id)
    expect(creature.name).toBe('Grick Alpha')
    expect(creature.ac).toBe(14)
    expect(creature.cr).toBe(2)
  })

  it('will not submit without a name', async () => {
    const onSubmit = vi.fn()
    await renderForm(
      <CustomMonsterForm open initialDraft={draft()} onClose={() => {}} onSubmit={onSubmit} />,
    )
    const create = screen.getByRole('button', { name: 'Create' })
    expect(create).toBeDisabled()
    fireEvent.click(create)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('closes on Escape', async () => {
    const onClose = vi.fn()
    await renderForm(
      <CustomMonsterForm open initialDraft={draft()} onClose={onClose} onSubmit={() => {}} />,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('derives the spell save DC from ability + CR and stores picked spells', async () => {
    const onSubmit = vi.fn()
    await renderForm(
      <CustomMonsterForm
        open
        initialDraft={draft({
          name: 'Sorcerer',
          cr: '9', // proficiency bonus +4
          abilities: { str: '', dex: '', con: '', int: '18', wis: '', cha: '' },
        })}
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.change(screen.getByLabelText('Spellcasting ability'), { target: { value: 'int' } })
    expect(screen.getByText(/Save DC/)).toHaveTextContent('Save DC 16')
    expect(screen.getByText(/Save DC/)).toHaveTextContent('Spell attack +8')

    fireEvent.click(screen.getByRole('button', { name: '+ Add spell group' }))
    fireEvent.change(screen.getByLabelText('Add spell'), { target: { value: 'fire' } })
    fireEvent.click(screen.getByText('Fireball'))
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    const creature = onSubmit.mock.calls[0][0] as Creature
    expect(creature.spellcasting).toEqual({
      groups: [
        { usage: { type: 'atWill' }, spells: [{ name: 'Fireball', ref: 'srd-5.2:fireball' }] },
      ],
      ability: 'int',
      saveDc: 16, // 8 + int mod 4 + pb 4
      toHit: 8,
    })
  })
  it('starts a new creature from an existing one, keeping the name the GM typed', async () => {
    const onSubmit = vi.fn()
    await renderForm(
      <CustomMonsterForm open initialDraft={draft()} onClose={() => {}} onSubmit={onSubmit} />,
    )

    fireEvent.change(screen.getByLabelText('Creature name'), { target: { value: 'Goblin Sapper' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start from…' }))
    // The trigger sits at the modal's left edge, so the popover has to open rightwards
    // — hung from the other edge it falls outside the modal.
    expect(screen.getByLabelText('Search creatures').closest('div')?.className).toContain('left-0')
    await waitFor(() => screen.getByText('Goblin'))
    fireEvent.click(screen.getByText('Goblin'))

    // The template fills the form; the name stays the GM's and the source is theirs too.
    expect(screen.getByLabelText('Creature name')).toHaveValue('Goblin Sapper')
    expect(screen.getByLabelText('AC')).toHaveValue('15')
    expect(screen.getByLabelText('Type')).toHaveValue('humanoid')
    expect(screen.getByLabelText('Source')).toHaveValue('')

    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    const creature = onSubmit.mock.calls[0][0] as Creature
    expect(creature.name).toBe('Goblin Sapper')
    expect(creature.ac).toBe(15)
    expect(creature.traits).toEqual([
      { name: 'Nimble Escape', text: 'Disengage or Hide as a bonus action.' },
    ])
    // An independent entity: its own custom id, and never the library's source.
    expect(creature.id.startsWith('custom:')).toBe(true)
    expect(creature.source).toBe('custom')
  })

  it('offers no starting point when editing — the form is already the creature', async () => {
    await renderForm(
      <CustomMonsterForm
        open
        initialDraft={draft({ name: 'Snik' })}
        editId="custom:abc"
        onClose={() => {}}
        onSubmit={() => {}}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Start from…' })).toBeNull()
  })
})
