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
function Harness({ onEffects }: { onEffects?: (e: Effect[]) => void } = {}) {
  const [effects, setEffects] = useState<Effect[]>([])
  const sync = (next: Effect[]) => {
    setEffects(next)
    onEffects?.(next)
  }
  return (
    <EffectModal
      name="Goblin"
      effects={effects}
      onApply={(e) => sync([...effects, e])}
      onRemove={(id) => sync(effects.filter((x) => x.id !== id))}
    />
  )
}

function open() {
  fireEvent.click(screen.getByRole('button', { name: 'Apply effect' }))
  return screen.getByRole('dialog', { name: 'Apply effect to Goblin' })
}

/** Open the modal and expand the collapsed modifier builder. */
function openModifier() {
  const dialog = open()
  fireEvent.click(within(dialog).getByRole('button', { name: '+ Add a bonus or penalty' }))
  return dialog
}

/** Nothing lands until Apply — the single commit path. */
const clickApply = (dialog: HTMLElement) =>
  fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }))

describe('EffectModal', () => {
  it('applies a staged condition with the chosen duration on Apply', () => {
    const onApply = vi.fn()
    render(<EffectModal name="Goblin" effects={[]} onApply={onApply} onRemove={() => {}} />)
    const dialog = open()
    fireEvent.change(within(dialog).getByLabelText('Duration'), { target: { value: '1m' } }) // 1 minute = 10 rounds
    fireEvent.click(within(dialog).getByRole('button', { name: 'Prone' }))
    // Staged, not applied yet.
    expect(onApply).not.toHaveBeenCalled()
    clickApply(dialog)
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
    const dialog = openModifier()
    // Defaults: Advantage / attack rolls / made against it.
    fireEvent.change(within(dialog).getByLabelText('Modifier label'), {
      target: { value: 'Faerie Fire' },
    })
    clickApply(dialog)
    expect(onApply.mock.calls[0][0]).toMatchObject({
      name: 'Faerie Fire',
      modifier: { mode: 'advantage', direction: 'incoming', applies: 'attackRolls', value: null },
    })
  })

  it('commits a condition and a modifier together on Apply', () => {
    const onApply = vi.fn()
    render(<EffectModal name="Goblin" effects={[]} onApply={onApply} onRemove={() => {}} />)
    const dialog = open()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Restrained' }))
    fireEvent.click(within(dialog).getByRole('button', { name: '+ Add a bonus or penalty' }))
    fireEvent.change(within(dialog).getByLabelText('Modifier label'), {
      target: { value: 'Ensnared' },
    })
    clickApply(dialog)
    expect(onApply).toHaveBeenCalledTimes(2)
    const names = onApply.mock.calls.map((c) => c[0].name)
    expect(names).toContain('Restrained')
    expect(names).toContain('Ensnared')
  })

  it('builds a flat bonus, dropping a leading + and keeping dice as a string', () => {
    const onApply = vi.fn()
    render(<EffectModal name="Goblin" effects={[]} onApply={onApply} onRemove={() => {}} />)
    const dialog = openModifier()
    fireEvent.change(within(dialog).getByLabelText('Modifier effect'), {
      target: { value: 'flatBonus' },
    })
    fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value: '+1d4' } })
    fireEvent.change(within(dialog).getByLabelText('Modifier label'), {
      target: { value: 'Bless' },
    })
    clickApply(dialog)
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
    const dialog = openModifier()
    fireEvent.change(within(dialog).getByLabelText('Modifier effect'), {
      target: { value: 'flatBonus' },
    })
    fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value: '-2' } })
    fireEvent.change(within(dialog).getByLabelText('Modifier label'), { target: { value: 'Bane' } })
    clickApply(dialog)
    expect(onApply.mock.calls[0][0].modifier.value).toBe(-2)
  })

  it('skips the modifier when it has no label', () => {
    const onApply = vi.fn()
    render(<EffectModal name="Goblin" effects={[]} onApply={onApply} onRemove={() => {}} />)
    const dialog = openModifier()
    // Built nothing valid (no label) and staged nothing else — Apply commits nothing.
    clickApply(dialog)
    expect(onApply).not.toHaveBeenCalled()
  })

  it('keeps the modifier builder collapsed until asked for', () => {
    render(<EffectModal name="Goblin" effects={[]} onApply={() => {}} onRemove={() => {}} />)
    const dialog = open()
    expect(within(dialog).queryByLabelText('Modifier label')).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: '+ Add a bonus or penalty' }))
    expect(within(dialog).getByLabelText('Modifier label')).not.toBeNull()
  })

  it('applies a custom reminder on Apply, no Add button needed', () => {
    const onApply = vi.fn()
    render(<EffectModal name="Goblin" effects={[]} onApply={onApply} onRemove={() => {}} />)
    const dialog = open()
    fireEvent.change(within(dialog).getByLabelText('Custom reminder'), {
      target: { value: 'Hex: +1d6 necrotic' },
    })
    // There is no per-field Add button any more.
    expect(within(dialog).queryByRole('button', { name: 'Add' })).toBeNull()
    clickApply(dialog)
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
    clickApply(dialog)
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
    fireEvent.change(within(dialog).getByLabelText('Save timing'), {
      target: { value: 'startOfTurn' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Prone' }))
    clickApply(dialog)
    expect(onApply.mock.calls[0][0].duration.when).toBe('startOfTurn')
  })

  it('stages a condition chip on and off without applying', () => {
    render(<Harness />)
    const dialog = open()
    const chip = () => within(dialog).getByRole('button', { name: 'Prone' })
    expect(chip()).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(chip())
    expect(chip()).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(chip())
    expect(chip()).toHaveAttribute('aria-pressed', 'false')
  })

  it('pre-selects existing conditions and removes one unchecked before Apply', () => {
    const existing: Effect = {
      id: 'e1',
      name: 'Prone',
      icon: 'condition',
      modifier: null,
      duration: { type: 'manual' },
    }
    const onRemove = vi.fn()
    const onApply = vi.fn()
    render(<EffectModal name="Goblin" effects={[existing]} onApply={onApply} onRemove={onRemove} />)
    const dialog = open()
    // The creature already has Prone, so its chip starts checked.
    expect(within(dialog).getByRole('button', { name: 'Prone' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    fireEvent.click(within(dialog).getByRole('button', { name: 'Prone' })) // uncheck it
    clickApply(dialog)
    expect(onRemove).toHaveBeenCalledWith('e1')
    expect(onApply).not.toHaveBeenCalled()
  })

  it('Cancel discards staged changes without applying', () => {
    const onApply = vi.fn()
    render(<EffectModal name="Goblin" effects={[]} onApply={onApply} onRemove={() => {}} />)
    const dialog = open()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Prone' }))
    fireEvent.change(within(dialog).getByLabelText('Custom reminder'), { target: { value: 'x' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(onApply).not.toHaveBeenCalled()
  })
})
