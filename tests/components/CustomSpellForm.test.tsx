// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CustomSpellForm } from '../../src/components/CustomSpellForm.tsx'
import {
  buildSpell,
  emptySpellDraft,
  spellToDraft,
  type SpellDraft,
} from '../../src/components/customSpell.ts'
import type { Spell } from '../../src/schema/spell.ts'

afterEach(cleanup)

/** The blank spell draft with a few fields overridden. */
function draft(overrides: Partial<SpellDraft> = {}): SpellDraft {
  return { ...emptySpellDraft(), ...overrides }
}

describe('CustomSpellForm', () => {
  it('renders nothing when closed', () => {
    render(
      <CustomSpellForm
        open={false}
        initialDraft={draft()}
        onClose={() => {}}
        onSubmit={() => {}}
      />,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('patches identity, casting, and components into the built spell', () => {
    const onSubmit = vi.fn()
    const onClose = vi.fn()
    render(<CustomSpellForm open initialDraft={draft()} onClose={onClose} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText('Spell name'), { target: { value: '  Feather Step  ' } })
    fireEvent.change(screen.getByLabelText('Level'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('School'), { target: { value: 'Transmutation' } })
    fireEvent.change(screen.getByLabelText('Source'), { target: { value: 'My Homebrew' } })
    fireEvent.change(screen.getByLabelText('Classes'), { target: { value: 'Wizard, Ranger' } })
    fireEvent.change(screen.getByLabelText('Casting time'), { target: { value: '1 bonus action' } })
    fireEvent.change(screen.getByLabelText('Range'), { target: { value: 'Touch' } })
    fireEvent.change(screen.getByLabelText('Duration'), { target: { value: '1 minute' } })
    fireEvent.click(screen.getByLabelText('Concentration'))
    fireEvent.click(screen.getByLabelText('V'))
    fireEvent.click(screen.getByLabelText('M'))
    fireEvent.change(screen.getByLabelText('Material components'), {
      target: { value: 'a downy feather' },
    })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Step lightly.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const spell = onSubmit.mock.calls[0][0] as Spell
    expect(spell.id.startsWith('custom:')).toBe(true)
    expect(spell).toMatchObject({
      source: 'My Homebrew',
      edition: '5.5',
      name: 'Feather Step',
      level: 2,
      school: 'Transmutation',
      castingTime: '1 bonus action',
      range: 'Touch',
      duration: '1 minute',
      concentration: true,
      ritual: false,
      classes: ['Wizard', 'Ranger'],
      components: { verbal: true, somatic: false, material: true, materials: 'a downy feather' },
      text: 'Step lightly.',
    })
    expect(spell.mechanics).toBeUndefined() // no damage, attack, or save → utility spell
    expect(onClose).toHaveBeenCalled()
  })

  it('captures a save resolution and base damage in the mechanics', () => {
    const onSubmit = vi.fn()
    render(
      <CustomSpellForm
        open
        initialDraft={draft({ name: 'Cone of Cold', level: '5' })}
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.click(screen.getByLabelText('Saving throw'))
    fireEvent.change(screen.getByLabelText('Save ability'), { target: { value: 'con' } })
    fireEvent.change(screen.getByLabelText('On save'), { target: { value: 'none' } })
    fireEvent.click(screen.getByRole('button', { name: '+ Add damage type' }))
    fireEvent.change(screen.getByLabelText('Damage type'), { target: { value: 'cold' } })
    fireEvent.change(screen.getByLabelText('Damage formula'), { target: { value: '8d8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    const spell = onSubmit.mock.calls[0][0] as Spell
    expect(spell.mechanics?.save).toEqual({ ability: 'con', onSave: 'none' })
    expect(spell.mechanics?.damage).toEqual([{ formula: '8d8', type: 'cold' }])
    expect(spell.mechanics?.attackRoll).toBeUndefined()
    expect(spell.mechanics?.scaling).toBeUndefined() // increment left blank
  })

  it('expands regular scaling from the increment editor, with a live preview', () => {
    const onSubmit = vi.fn()
    render(
      <CustomSpellForm
        open
        initialDraft={draft({ name: 'Fireball', level: '3' })}
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '+ Add damage type' }))
    fireEvent.change(screen.getByLabelText('Damage formula'), { target: { value: '8d6' } })
    // The scaling editor appears once there is base damage; fill the per-slot increment.
    fireEvent.change(screen.getAllByLabelText('Damage formula')[1], { target: { value: '1d6' } })
    expect(screen.getByText(/Preview:/)).toHaveTextContent('Slot 4: 9d6')
    expect(screen.getByText(/Preview:/)).toHaveTextContent('Slot 9: 14d6')
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    const scaling = (onSubmit.mock.calls[0][0] as Spell).mechanics!.scaling!
    expect(scaling).toHaveLength(6)
    expect(scaling[0]).toEqual({ level: 4, by: 'slot', damage: [{ formula: '9d6', type: 'fire' }] })
  })

  it('collects explicit per-level rows in manual scaling mode', () => {
    const onSubmit = vi.fn()
    render(
      <CustomSpellForm
        open
        initialDraft={draft({ name: 'Odd Bolt' })}
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '+ Add damage type' }))
    fireEvent.change(screen.getByLabelText('Damage formula'), { target: { value: '1d4' } })
    fireEvent.click(screen.getByLabelText('Edit each level'))
    fireEvent.click(screen.getByRole('button', { name: '+ Add level' }))
    fireEvent.change(screen.getByLabelText('Scaling level'), { target: { value: '3' } })
    fireEvent.change(screen.getAllByLabelText('Damage formula')[1], { target: { value: '3d4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect((onSubmit.mock.calls[0][0] as Spell).mechanics!.scaling).toEqual([
      { level: 3, by: 'slot', damage: [{ formula: '3d4', type: 'fire' }] },
    ])
  })

  it('accepts a free-text casting time through Other…', () => {
    const onSubmit = vi.fn()
    render(
      <CustomSpellForm
        open
        initialDraft={draft({ name: 'Slow Ritual' })}
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    )
    expect(screen.queryByLabelText('Casting time (custom)')).toBeNull()
    fireEvent.change(screen.getByLabelText('Casting time'), { target: { value: '__other__' } })
    fireEvent.change(screen.getByLabelText('Casting time (custom)'), {
      target: { value: '1 week' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect((onSubmit.mock.calls[0][0] as Spell).castingTime).toBe('1 week')
  })

  it('edits an existing spell, keeping its id', () => {
    const existing = buildSpell(draft({ name: 'Sun Lance', level: '2', sourceName: 'Old Tome' }))
    const onSubmit = vi.fn()
    render(
      <CustomSpellForm
        open
        initialDraft={spellToDraft(existing)}
        editId={existing.id}
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Edit spell' })).toBeInTheDocument()
    expect((screen.getByLabelText('Spell name') as HTMLInputElement).value).toBe('Sun Lance')
    fireEvent.change(screen.getByLabelText('Spell name'), {
      target: { value: 'Sun Lance, Greater' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    const spell = onSubmit.mock.calls[0][0] as Spell
    expect(spell.id).toBe(existing.id)
    expect(spell.name).toBe('Sun Lance, Greater')
    expect(spell.source).toBe('Old Tome')
    expect(spell.level).toBe(2)
  })

  it('will not submit without a name', () => {
    const onSubmit = vi.fn()
    render(<CustomSpellForm open initialDraft={draft()} onClose={() => {}} onSubmit={onSubmit} />)
    const create = screen.getByRole('button', { name: 'Create' })
    expect(create).toBeDisabled()
    fireEvent.click(create)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(<CustomSpellForm open initialDraft={draft()} onClose={onClose} onSubmit={() => {}} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
