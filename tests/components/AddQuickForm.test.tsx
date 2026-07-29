// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AddQuickForm } from '../../src/components/AddQuickForm.tsx'
import type { PlayerCharacter } from '../../src/schema/combatant.ts'

afterEach(cleanup)

describe('AddQuickForm', () => {
  it('adds a foe by default from name, HP, and AC, then closes', () => {
    const onAdd = vi.fn()
    render(<AddQuickForm onAdd={onAdd} />)

    fireEvent.click(screen.getByText('Quick add'))
    fireEvent.change(screen.getByLabelText('Quick add name'), { target: { value: '  Bandit  ' } })
    fireEvent.change(screen.getByLabelText('AC'), { target: { value: '13' } })
    fireEvent.change(screen.getByLabelText('Max HP'), { target: { value: '20' } })
    fireEvent.click(screen.getByText('Add'))

    expect(onAdd).toHaveBeenCalledTimes(1)
    const added = onAdd.mock.calls[0][0] as PlayerCharacter
    expect(added).toMatchObject({
      isPC: true,
      kind: 'quick',
      side: 'foe',
      name: 'Bandit',
      ac: 13,
      initiative: 0, // rolled when combat begins
      status: 'active',
      hp: { current: 20, max: 20, temp: 0 },
      concentration: null,
      effects: [],
    })
    expect(typeof added.combatantId).toBe('string')
    expect(screen.queryByLabelText('Quick add name')).toBeNull()
  })

  it('can add to the friendly side instead', () => {
    const onAdd = vi.fn()
    render(<AddQuickForm onAdd={onAdd} />)
    fireEvent.click(screen.getByText('Quick add'))
    fireEvent.change(screen.getByLabelText('Quick add name'), { target: { value: 'Villager' } })
    fireEvent.change(screen.getByLabelText('Side'), { target: { value: 'friend' } })
    fireEvent.click(screen.getByText('Add'))
    expect((onAdd.mock.calls[0][0] as PlayerCharacter).side).toBe('friend')
  })

  it('floors max HP at 1 when the fields are left blank', () => {
    const onAdd = vi.fn()
    render(<AddQuickForm onAdd={onAdd} />)
    fireEvent.click(screen.getByText('Quick add'))
    fireEvent.change(screen.getByLabelText('Quick add name'), { target: { value: 'Rat' } })
    fireEvent.click(screen.getByText('Add'))
    const added = onAdd.mock.calls[0][0] as PlayerCharacter
    expect(added.hp).toEqual({ current: 1, max: 1, temp: 0 })
    expect(added.ac).toBe(0)
  })

  it('resets the fields for the next quick add', () => {
    render(<AddQuickForm onAdd={() => {}} />)
    fireEvent.click(screen.getByText('Quick add'))
    fireEvent.change(screen.getByLabelText('Quick add name'), { target: { value: 'Goro' } })
    fireEvent.change(screen.getByLabelText('AC'), { target: { value: '13' } })
    fireEvent.change(screen.getByLabelText('Side'), { target: { value: 'friend' } })
    fireEvent.click(screen.getByText('Add'))

    fireEvent.click(screen.getByText('Quick add'))
    expect((screen.getByLabelText('Quick add name') as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText('AC') as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText('Side') as HTMLSelectElement).value).toBe('foe')
  })

  it('ignores submit with a blank name', () => {
    const onAdd = vi.fn()
    render(<AddQuickForm onAdd={onAdd} />)
    fireEvent.click(screen.getByText('Quick add'))
    fireEvent.click(screen.getByText('Add'))
    expect(onAdd).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Quick add name')).toBeInTheDocument() // stays open
  })

  it('closes on Escape without adding', () => {
    const onAdd = vi.fn()
    render(<AddQuickForm onAdd={onAdd} />)
    fireEvent.click(screen.getByText('Quick add'))
    fireEvent.change(screen.getByLabelText('Quick add name'), { target: { value: 'Goro' } })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByLabelText('Quick add name')).toBeNull()
    expect(onAdd).not.toHaveBeenCalled()
  })
})
