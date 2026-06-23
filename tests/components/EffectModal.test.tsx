// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { EffectModal } from '../../src/components/EffectModal.tsx'
import type { Effect } from '../../src/schema/effect.ts'

afterEach(cleanup)

/** A stateful wrapper so condition chips reflect/toggle live combatant effects. */
function Harness() {
  const [effects, setEffects] = useState<Effect[]>([])
  return (
    <EffectModal
      name="Goblin"
      effects={effects}
      onApply={(e) => setEffects((prev) => [...prev, e])}
      onRemove={(id) => setEffects((prev) => prev.filter((x) => x.id !== id))}
    />
  )
}

function open() {
  fireEvent.click(screen.getByRole('button', { name: 'Apply effect' }))
  return screen.getByRole('dialog', { name: 'Apply effect to Goblin' })
}

describe('EffectModal', () => {
  it('applies a condition with the chosen duration', () => {
    const onApply = vi.fn()
    render(<EffectModal name="Goblin" effects={[]} onApply={onApply} onRemove={() => {}} />)
    const dialog = open()
    fireEvent.change(within(dialog).getByLabelText('Duration'), { target: { value: 'r10' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Prone' }))
    expect(onApply).toHaveBeenCalledOnce()
    expect(onApply.mock.calls[0][0]).toMatchObject({
      name: 'Prone',
      icon: 'condition',
      duration: { type: 'rounds', rounds: 10 },
    })
  })

  it('builds an advantage-against modifier with a clear direction', () => {
    const onApply = vi.fn()
    render(<EffectModal name="Goblin" effects={[]} onApply={onApply} onRemove={() => {}} />)
    const dialog = open()
    // Defaults: Advantage / attack rolls / made against it.
    fireEvent.change(within(dialog).getByLabelText('Modifier label'), { target: { value: 'Faerie Fire' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply modifier' }))
    expect(onApply.mock.calls[0][0]).toMatchObject({
      name: 'Faerie Fire',
      modifier: { mode: 'advantage', direction: 'incoming', applies: 'attackRolls', value: null },
    })
  })

  it('builds a flat bonus, dropping a leading + and keeping dice as a string', () => {
    const onApply = vi.fn()
    render(<EffectModal name="Goblin" effects={[]} onApply={onApply} onRemove={() => {}} />)
    const dialog = open()
    fireEvent.change(within(dialog).getByLabelText('Modifier effect'), { target: { value: 'flatBonus' } })
    fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value: '+1d4' } })
    fireEvent.change(within(dialog).getByLabelText('Modifier label'), { target: { value: 'Bless' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply modifier' }))
    expect(onApply.mock.calls[0][0].modifier).toMatchObject({
      mode: 'flatBonus',
      applies: 'all', // switching to bonus defaults applies→everything, direction→its rolls
      direction: 'outgoing',
      value: '1d4',
    })
  })

  it('stores a plain numeric amount as a number (Bane −2)', () => {
    const onApply = vi.fn()
    render(<EffectModal name="Goblin" effects={[]} onApply={onApply} onRemove={() => {}} />)
    const dialog = open()
    fireEvent.change(within(dialog).getByLabelText('Modifier effect'), { target: { value: 'flatBonus' } })
    fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value: '-2' } })
    fireEvent.change(within(dialog).getByLabelText('Modifier label'), { target: { value: 'Bane' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply modifier' }))
    expect(onApply.mock.calls[0][0].modifier.value).toBe(-2)
  })

  it('requires a label before applying a modifier', () => {
    const onApply = vi.fn()
    render(<EffectModal name="Goblin" effects={[]} onApply={onApply} onRemove={() => {}} />)
    const dialog = open()
    expect(within(dialog).getByRole('button', { name: 'Apply modifier' })).toBeDisabled()
  })

  it('applies a custom reminder', () => {
    const onApply = vi.fn()
    render(<EffectModal name="Goblin" effects={[]} onApply={onApply} onRemove={() => {}} />)
    const dialog = open()
    fireEvent.change(within(dialog).getByLabelText('Custom reminder'), { target: { value: 'Hex: +1d6 necrotic' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add' }))
    expect(onApply.mock.calls[0][0]).toMatchObject({ note: 'Hex: +1d6 necrotic', modifier: null })
  })

  it('builds a save-ends duration with a roll timing (default end of turn)', () => {
    const onApply = vi.fn()
    render(<EffectModal name="Goblin" effects={[]} onApply={onApply} onRemove={() => {}} />)
    const dialog = open()
    fireEvent.change(within(dialog).getByLabelText('Duration'), { target: { value: 'save' } })
    fireEvent.change(within(dialog).getByLabelText('Save ability'), { target: { value: 'wis' } })
    fireEvent.change(within(dialog).getByLabelText('Save DC'), { target: { value: '15' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Frightened' }))
    expect(onApply.mock.calls[0][0].duration).toEqual({
      type: 'saveEnds',
      save: { ability: 'wis', dc: 15 },
      when: 'endOfTurn',
    })
  })

  it('records a start-of-turn save timing', () => {
    const onApply = vi.fn()
    render(<EffectModal name="Goblin" effects={[]} onApply={onApply} onRemove={() => {}} />)
    const dialog = open()
    fireEvent.change(within(dialog).getByLabelText('Duration'), { target: { value: 'save' } })
    fireEvent.change(within(dialog).getByLabelText('Save timing'), { target: { value: 'startOfTurn' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Prone' }))
    expect(onApply.mock.calls[0][0].duration.when).toBe('startOfTurn')
  })

  it('toggles a condition on and off', () => {
    render(<Harness />)
    open()
    const chip = () => screen.getByRole('button', { name: 'Prone' })
    expect(chip()).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(chip()) // apply
    expect(chip()).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(chip()) // re-click removes it
    expect(chip()).toHaveAttribute('aria-pressed', 'false')
  })
})
