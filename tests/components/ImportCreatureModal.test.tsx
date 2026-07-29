// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ImportCreatureModal } from '../../src/components/ImportCreatureModal.tsx'
import type { Creature } from '../../src/schema/creature.ts'

afterEach(cleanup)

// A creature JSON as the OpenFray Importer copies it; the modal re-ids it on import.
const valid = {
  id: 'ddb-import:goblin',
  source: 'Monster Manual (2024)',
  edition: '5.5',
  name: 'Goblin',
  size: 'Small',
  type: 'humanoid',
  ac: 15,
  maxHp: 7,
  speed: { walk: 30 },
  abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
  senses: { passivePerception: 9 },
}

describe('ImportCreatureModal', () => {
  it('renders nothing when closed', () => {
    render(<ImportCreatureModal open={false} onClose={() => {}} onImport={() => {}} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('imports pasted JSON as a parsed creature and closes', () => {
    const onImport = vi.fn()
    const onClose = vi.fn()
    render(<ImportCreatureModal open onClose={onClose} onImport={onImport} />)

    fireEvent.change(screen.getByLabelText('Creature JSON'), {
      target: { value: JSON.stringify(valid) },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Import' }))

    expect(onImport).toHaveBeenCalledTimes(1)
    const creature = onImport.mock.calls[0][0] as Creature
    expect(creature.name).toBe('Goblin')
    expect(creature.id.startsWith('custom:')).toBe(true) // re-id'd, never colliding
    expect(creature.source).toBe('Monster Manual (2024)')
    expect(onClose).toHaveBeenCalled()
  })

  it('shows the parse error inline and clears it as the GM retypes', () => {
    const onImport = vi.fn()
    const onClose = vi.fn()
    render(<ImportCreatureModal open onClose={onClose} onImport={onImport} />)

    fireEvent.change(screen.getByLabelText('Creature JSON'), { target: { value: '{ not json' } })
    fireEvent.click(screen.getByRole('button', { name: 'Import' }))

    expect(screen.getByText(/isn’t a creature/)).toBeInTheDocument()
    expect(onImport).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Creature JSON'), { target: { value: '{}' } })
    expect(screen.queryByText(/isn’t a creature/)).toBeNull()
  })

  it('disables Import until something is pasted', () => {
    render(<ImportCreatureModal open onClose={() => {}} onImport={() => {}} />)
    const importButton = screen.getByRole('button', { name: 'Import' })
    expect(importButton).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Creature JSON'), { target: { value: '   ' } })
    expect(importButton).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Creature JSON'), { target: { value: '{}' } })
    expect(importButton).toBeEnabled()
  })

  it('starts fresh each time it opens', () => {
    const { rerender } = render(<ImportCreatureModal open onClose={() => {}} onImport={() => {}} />)
    fireEvent.change(screen.getByLabelText('Creature JSON'), { target: { value: '{ stale' } })
    rerender(<ImportCreatureModal open={false} onClose={() => {}} onImport={() => {}} />)
    rerender(<ImportCreatureModal open onClose={() => {}} onImport={() => {}} />)
    expect((screen.getByLabelText('Creature JSON') as HTMLTextAreaElement).value).toBe('')
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(<ImportCreatureModal open onClose={onClose} onImport={() => {}} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
