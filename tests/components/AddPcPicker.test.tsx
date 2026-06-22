// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AddPcPicker } from '../../src/components/AddPcPicker.tsx'
import type { RosterPc } from '../../src/schema/roster.ts'

afterEach(cleanup)

const rosterPcs: RosterPc[] = [
  { id: 'p1', name: 'Thalia', ac: 16, maxHp: 38, campaignId: 'c1' },
  { id: 'p2', name: 'Grog', ac: 14, maxHp: 60 },
]
const campaigns = [{ id: 'c1', name: 'Sands of Eternity', edition: '5.5' as const }]

describe('AddPcPicker', () => {
  it('opens a popover listing saved characters with their campaign acronym', () => {
    const onPick = vi.fn()
    render(<AddPcPicker rosterPcs={rosterPcs} campaigns={campaigns} onPick={onPick} onCreate={() => {}} />)

    // The list is behind the toggle.
    expect(screen.queryByText('Thalia')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Add PC' }))
    expect(screen.getByText('Thalia')).toBeInTheDocument()
    expect(screen.getByText('Grog')).toBeInTheDocument()
    expect(screen.getByText('SoE')).toBeInTheDocument() // Sands of Eternity

    fireEvent.click(screen.getByRole('button', { name: /Thalia/ }))
    expect(onPick).toHaveBeenCalledWith(rosterPcs[0])
    // Picking closes the popover.
    expect(screen.queryByText('Grog')).toBeNull()
  })

  it('filters the saved characters with the search box', () => {
    render(<AddPcPicker rosterPcs={rosterPcs} onPick={() => {}} onCreate={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add PC' }))
    fireEvent.change(screen.getByLabelText('Search your characters'), { target: { value: 'gro' } })
    expect(screen.getByText('Grog')).toBeInTheDocument()
    expect(screen.queryByText('Thalia')).toBeNull()
  })

  it('routes to the compendium to create a character', () => {
    const onCreate = vi.fn()
    render(<AddPcPicker rosterPcs={rosterPcs} onPick={() => {}} onCreate={onCreate} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add PC' }))
    fireEvent.click(screen.getByRole('button', { name: /Create a character/ }))
    expect(onCreate).toHaveBeenCalledTimes(1)
  })

  it('shows an empty state and still offers create when the roster is empty', () => {
    const onCreate = vi.fn()
    render(<AddPcPicker rosterPcs={[]} onPick={() => {}} onCreate={onCreate} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add PC' }))
    expect(screen.getByText('No saved characters yet.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Create a character/ }))
    expect(onCreate).toHaveBeenCalledTimes(1)
  })
})
