// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { InitiativePrompt } from '../../../src/components/tracker/InitiativePrompt.tsx'
import type { Combatant } from '../../../src/schema/combatant.ts'
import { monster, pc } from '../../fixtures.ts'

afterEach(cleanup)

const combatants: Combatant[] = [
  pc({ initiative: 0, ac: 15, passivePerception: 12, hp: { current: 20, max: 20, temp: 0 } }),
  monster({ combatantId: 'm1', label: 'Goblin A', initiative: 0 }),
]
const initial = { p1: '', m1: '14' }

describe('InitiativePrompt', () => {
  it('explains required manual initiative and starts only after every combatant has a whole-number entry', () => {
    const onStart = vi.fn()
    render(
      <InitiativePrompt
        requireManual
        combatants={combatants}
        initial={{ p1: '', m1: '' }}
        onStart={onStart}
        onCancel={() => {}}
      />,
    )
    expect(
      screen.getByText(/Enter a whole-number initiative for every combatant/),
    ).toBeInTheDocument()
    expect(screen.queryByText(/leave a box empty and OpenFray rolls/)).toBeNull()
    fireEvent.change(screen.getByLabelText('Initiative for Thalia'), { target: { value: '17' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start combat' }))
    expect(onStart).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Initiative for Goblin A'), { target: { value: '1.5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start combat' }))
    expect(onStart).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Initiative for Goblin A'), { target: { value: '-2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start combat' }))
    expect(onStart).toHaveBeenCalledWith({ values: { p1: '17', m1: '-2' }, surprised: [] })
  })

  it('preserves normal blank-roll instructions and accepts an empty player initiative', () => {
    const onStart = vi.fn()
    render(
      <InitiativePrompt
        combatants={combatants}
        initial={initial}
        onStart={onStart}
        onCancel={() => {}}
      />,
    )
    expect(screen.getByText(/leave a box empty and OpenFray rolls for them/)).toBeInTheDocument()
    expect(screen.queryByText(/Enter a whole-number initiative for every combatant/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Start combat' }))
    expect(onStart).toHaveBeenCalledWith({ values: { p1: '', m1: '14' }, surprised: [] })
  })

  it('lists every combatant with its pre-filled initiative', () => {
    render(
      <InitiativePrompt
        combatants={combatants}
        initial={initial}
        onStart={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(screen.getByText('Thalia')).toBeInTheDocument()
    expect(screen.getByText('Goblin A')).toBeInTheDocument()
    expect((screen.getByLabelText('Initiative for Thalia') as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText('Initiative for Goblin A') as HTMLInputElement).value).toBe('14')
  })

  it('returns entered values and the surprised set on start', () => {
    const onStart = vi.fn()
    render(
      <InitiativePrompt
        combatants={combatants}
        initial={initial}
        onStart={onStart}
        onCancel={() => {}}
      />,
    )

    fireEvent.change(screen.getByLabelText('Initiative for Thalia'), { target: { value: '17' } })
    fireEvent.click(screen.getByRole('button', { name: 'Mark Goblin A surprised' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start combat' }))

    expect(onStart).toHaveBeenCalledTimes(1)
    expect(onStart.mock.calls[0][0]).toEqual({
      values: { p1: '17', m1: '14' },
      surprised: ['m1'],
    })
  })

  it('toggles a surprise mark off again', () => {
    const onStart = vi.fn()
    render(
      <InitiativePrompt
        combatants={combatants}
        initial={initial}
        onStart={onStart}
        onCancel={() => {}}
      />,
    )
    const toggle = screen.getByRole('button', { name: 'Mark Goblin A surprised' })
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'Start combat' }))
    expect(onStart.mock.calls[0][0].surprised).toEqual([])
  })
})
