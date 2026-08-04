// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { useRef, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { EffectModal } from '../../src/components/EffectModal.tsx'
import type { Effect } from '../../src/schema/effect.ts'
import type { EffectPreset } from '../../src/schema/preset.ts'

const DRUNK: EffectPreset = {
  id: 'custom:drunk',
  name: 'Drunk',
  duration: { type: 'rounds', rounds: 600 },
  parts: [
    { kind: 'condition', condition: 'Poisoned' },
    { kind: 'reminder', note: 'Hungover in the morning' },
  ],
}

afterEach(cleanup)

/** Every effect the modal committed, across Apply presses, flattened. */
const applied = (fn: ReturnType<typeof vi.fn>): Effect[] =>
  fn.mock.calls.flatMap((c) => c[0] as Effect[])

/** A stateful wrapper so condition chips reflect/toggle live combatant effects. */
function Harness({
  onEffects,
  presets,
  onSavePreset,
  initial = [],
}: {
  onEffects?: (e: Effect[]) => void
  presets?: EffectPreset[]
  onSavePreset?: (p: EffectPreset) => void
  initial?: Effect[]
} = {}) {
  const [effects, setEffects] = useState<Effect[]>(initial)
  // Applying a preset commits several effects in one tick, so the next list is read
  // from a ref rather than the render's closure, which would still hold the old one.
  const current = useRef<Effect[]>(initial)
  const sync = (next: Effect[]) => {
    current.current = next
    setEffects(next)
    onEffects?.(next)
  }
  return (
    <EffectModal
      name="Goblin"
      effects={effects}
      onApply={(list) => sync([...current.current, ...list])}
      onRemove={(id) => sync(current.current.filter((x) => x.id !== id))}
      onSetExhaustion={() => {}}
      presets={presets}
      onSavePreset={onSavePreset}
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
    render(
      <EffectModal
        name="Goblin"
        effects={[]}
        onApply={onApply}
        onRemove={() => {}}
        onSetExhaustion={() => {}}
      />,
    )
    const dialog = open()
    fireEvent.change(within(dialog).getByLabelText('Duration'), { target: { value: '1m' } }) // 1 minute = 10 rounds
    fireEvent.click(within(dialog).getByRole('button', { name: 'Prone' }))
    // Staged, not applied yet.
    expect(onApply).not.toHaveBeenCalled()
    clickApply(dialog)
    expect(onApply).toHaveBeenCalledOnce()
    expect(applied(onApply)[0]).toMatchObject({
      name: 'Prone',
      icon: 'condition',
      duration: { type: 'rounds', rounds: 10 },
    })
  })

  it('builds a custom duration from an amount and a unit', () => {
    const onApply = vi.fn()
    render(
      <EffectModal
        name="Goblin"
        effects={[]}
        onApply={onApply}
        onRemove={() => {}}
        onSetExhaustion={() => {}}
      />,
    )
    const dialog = open()
    fireEvent.change(within(dialog).getByLabelText('Duration'), { target: { value: 'custom' } })
    fireEvent.change(within(dialog).getByLabelText('Duration amount'), { target: { value: '3' } })
    fireEvent.change(within(dialog).getByLabelText('Duration unit'), {
      target: { value: 'hours' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Poisoned' }))
    clickApply(dialog)
    expect(applied(onApply)[0].duration).toEqual({ type: 'rounds', rounds: 1800 })
  })

  it('builds an advantage-against modifier with a clear direction', () => {
    const onApply = vi.fn()
    render(
      <EffectModal
        name="Goblin"
        effects={[]}
        onApply={onApply}
        onRemove={() => {}}
        onSetExhaustion={() => {}}
      />,
    )
    const dialog = openModifier()
    // Defaults: Advantage / attack rolls / made against it.
    fireEvent.change(within(dialog).getByLabelText('Modifier label'), {
      target: { value: 'Faerie Fire' },
    })
    clickApply(dialog)
    expect(applied(onApply)[0]).toMatchObject({
      name: 'Faerie Fire',
      modifier: { mode: 'advantage', direction: 'incoming', applies: 'attackRolls', value: null },
    })
  })

  it('narrows a checks modifier to the abilities the GM picks', () => {
    const onApply = vi.fn()
    render(
      <EffectModal
        name="Goblin"
        effects={[]}
        onApply={onApply}
        onRemove={() => {}}
        onSetExhaustion={() => {}}
      />,
    )
    const dialog = openModifier()
    fireEvent.change(within(dialog).getByLabelText('Modifier effect'), {
      target: { value: 'disadvantage' },
    })
    fireEvent.change(within(dialog).getByLabelText('Applies to'), {
      target: { value: 'abilityChecks' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'WIS' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'CHA' }))
    fireEvent.change(within(dialog).getByLabelText('Modifier label'), {
      target: { value: 'The habit' },
    })
    clickApply(dialog)
    expect(applied(onApply)[0].modifier).toMatchObject({
      mode: 'disadvantage',
      applies: 'abilityChecks',
      abilities: ['wis', 'cha'],
    })
  })

  it('offers the ability picker only where it means something', () => {
    render(
      <EffectModal
        name="Goblin"
        effects={[]}
        onApply={() => {}}
        onRemove={() => {}}
        onSetExhaustion={() => {}}
      />,
    )
    const dialog = openModifier()
    // Attack rolls carry no ability, so there is nothing to narrow.
    expect(within(dialog).queryByRole('button', { name: 'WIS' })).toBeNull()
    fireEvent.change(within(dialog).getByLabelText('Applies to'), {
      target: { value: 'savingThrows' },
    })
    expect(within(dialog).getByRole('button', { name: 'WIS' })).not.toBeNull()
  })

  it('commits a condition and a modifier together on Apply', () => {
    const onApply = vi.fn()
    render(
      <EffectModal
        name="Goblin"
        effects={[]}
        onApply={onApply}
        onRemove={() => {}}
        onSetExhaustion={() => {}}
      />,
    )
    const dialog = open()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Restrained' }))
    fireEvent.click(within(dialog).getByRole('button', { name: '+ Add a bonus or penalty' }))
    fireEvent.change(within(dialog).getByLabelText('Modifier label'), {
      target: { value: 'Ensnared' },
    })
    clickApply(dialog)
    const names = applied(onApply).map((e) => e.name)
    expect(names).toHaveLength(2)
    expect(names).toContain('Restrained')
    expect(names).toContain('Ensnared')
  })

  it('stages a second modifier alongside the first', () => {
    const onApply = vi.fn()
    render(
      <EffectModal
        name="Goblin"
        effects={[]}
        onApply={onApply}
        onRemove={() => {}}
        onSetExhaustion={() => {}}
      />,
    )
    const dialog = openModifier()
    fireEvent.change(within(dialog).getByLabelText('Modifier label'), {
      target: { value: 'First' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: '+ Add a bonus or penalty' }))
    const labels = within(dialog).getAllByLabelText('Modifier label')
    expect(labels).toHaveLength(2)
    fireEvent.change(labels[1], { target: { value: 'Second' } })
    clickApply(dialog)
    expect(applied(onApply).map((e) => e.name)).toEqual(['First', 'Second'])
  })

  it('removes one staged modifier without touching the other', () => {
    const onApply = vi.fn()
    render(
      <EffectModal
        name="Goblin"
        effects={[]}
        onApply={onApply}
        onRemove={() => {}}
        onSetExhaustion={() => {}}
      />,
    )
    const dialog = openModifier()
    fireEvent.change(within(dialog).getByLabelText('Modifier label'), {
      target: { value: 'First' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: '+ Add a bonus or penalty' }))
    fireEvent.change(within(dialog).getAllByLabelText('Modifier label')[1], {
      target: { value: 'Second' },
    })
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Remove' })[0])
    clickApply(dialog)
    expect(applied(onApply).map((e) => e.name)).toEqual(['Second'])
  })

  it('builds a flat bonus, dropping a leading + and keeping dice as a string', () => {
    const onApply = vi.fn()
    render(
      <EffectModal
        name="Goblin"
        effects={[]}
        onApply={onApply}
        onRemove={() => {}}
        onSetExhaustion={() => {}}
      />,
    )
    const dialog = openModifier()
    fireEvent.change(within(dialog).getByLabelText('Modifier effect'), {
      target: { value: 'flatBonus' },
    })
    fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value: '+1d4' } })
    fireEvent.change(within(dialog).getByLabelText('Modifier label'), {
      target: { value: 'Bless' },
    })
    clickApply(dialog)
    expect(applied(onApply)[0].modifier).toMatchObject({
      mode: 'flatBonus',
      applies: 'all', // switching to bonus defaults applies→everything, direction→its rolls
      direction: 'outgoing',
      value: '1d4',
    })
  })

  it('stores a plain numeric amount as a number (Bane −2)', () => {
    const onApply = vi.fn()
    render(
      <EffectModal
        name="Goblin"
        effects={[]}
        onApply={onApply}
        onRemove={() => {}}
        onSetExhaustion={() => {}}
      />,
    )
    const dialog = openModifier()
    fireEvent.change(within(dialog).getByLabelText('Modifier effect'), {
      target: { value: 'flatBonus' },
    })
    fireEvent.change(within(dialog).getByLabelText('Amount'), { target: { value: '-2' } })
    fireEvent.change(within(dialog).getByLabelText('Modifier label'), { target: { value: 'Bane' } })
    clickApply(dialog)
    expect(applied(onApply)[0].modifier?.value).toBe(-2)
  })

  it('skips the modifier when it has no label', () => {
    const onApply = vi.fn()
    render(
      <EffectModal
        name="Goblin"
        effects={[]}
        onApply={onApply}
        onRemove={() => {}}
        onSetExhaustion={() => {}}
      />,
    )
    const dialog = openModifier()
    // Built nothing valid (no label) and staged nothing else — Apply commits nothing.
    clickApply(dialog)
    expect(onApply).not.toHaveBeenCalled()
  })

  it('keeps the modifier builder collapsed until asked for', () => {
    render(
      <EffectModal
        name="Goblin"
        effects={[]}
        onApply={() => {}}
        onRemove={() => {}}
        onSetExhaustion={() => {}}
      />,
    )
    const dialog = open()
    expect(within(dialog).queryByLabelText('Modifier label')).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: '+ Add a bonus or penalty' }))
    expect(within(dialog).getByLabelText('Modifier label')).not.toBeNull()
  })

  it('applies a custom reminder on Apply, no Add button needed', () => {
    const onApply = vi.fn()
    render(
      <EffectModal
        name="Goblin"
        effects={[]}
        onApply={onApply}
        onRemove={() => {}}
        onSetExhaustion={() => {}}
      />,
    )
    const dialog = open()
    fireEvent.change(within(dialog).getByLabelText('Custom reminder'), {
      target: { value: 'Hex: +1d6 necrotic' },
    })
    // There is no per-field Add button any more.
    expect(within(dialog).queryByRole('button', { name: 'Add' })).toBeNull()
    clickApply(dialog)
    expect(applied(onApply)[0]).toMatchObject({ note: 'Hex: +1d6 necrotic', modifier: null })
  })

  it('stages a second reminder alongside the first', () => {
    const onApply = vi.fn()
    render(
      <EffectModal
        name="Goblin"
        effects={[]}
        onApply={onApply}
        onRemove={() => {}}
        onSetExhaustion={() => {}}
      />,
    )
    const dialog = open()
    fireEvent.change(within(dialog).getByLabelText('Custom reminder'), {
      target: { value: 'First note' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: '+ Add another reminder' }))
    fireEvent.change(within(dialog).getByLabelText('Reminder 2'), {
      target: { value: 'Second note' },
    })
    clickApply(dialog)
    expect(applied(onApply).map((e) => e.name)).toEqual(['First note', 'Second note'])
  })

  it('builds a save-ends duration with a roll timing (default end of turn)', () => {
    const onApply = vi.fn()
    render(
      <EffectModal
        name="Goblin"
        effects={[]}
        onApply={onApply}
        onRemove={() => {}}
        onSetExhaustion={() => {}}
      />,
    )
    const dialog = open()
    fireEvent.change(within(dialog).getByLabelText('Duration'), { target: { value: 'save' } })
    fireEvent.change(within(dialog).getByLabelText('Save ability'), { target: { value: 'wis' } })
    fireEvent.change(within(dialog).getByLabelText('Save DC'), { target: { value: '15' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Frightened' }))
    clickApply(dialog)
    expect(applied(onApply)[0].duration).toEqual({
      type: 'saveEnds',
      save: { ability: 'wis', dc: 15 },
      when: 'endOfTurn',
    })
  })

  it('records a start-of-turn save timing', () => {
    const onApply = vi.fn()
    render(
      <EffectModal
        name="Goblin"
        effects={[]}
        onApply={onApply}
        onRemove={() => {}}
        onSetExhaustion={() => {}}
      />,
    )
    const dialog = open()
    fireEvent.change(within(dialog).getByLabelText('Duration'), { target: { value: 'save' } })
    fireEvent.change(within(dialog).getByLabelText('Save timing'), {
      target: { value: 'startOfTurn' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Prone' }))
    clickApply(dialog)
    expect(applied(onApply)[0].duration.when).toBe('startOfTurn')
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
    render(
      <EffectModal
        name="Goblin"
        effects={[existing]}
        onApply={onApply}
        onRemove={onRemove}
        onSetExhaustion={() => {}}
      />,
    )
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
    render(
      <EffectModal
        name="Goblin"
        effects={[]}
        onApply={onApply}
        onRemove={() => {}}
        onSetExhaustion={() => {}}
      />,
    )
    const dialog = open()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Prone' }))
    fireEvent.change(within(dialog).getByLabelText('Custom reminder'), { target: { value: 'x' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(onApply).not.toHaveBeenCalled()
  })
})

describe('counters', () => {
  it('adds a counter from its own control, starting at zero, beside a timed condition', () => {
    const onApply = vi.fn()
    render(
      <EffectModal
        name="Goblin"
        effects={[]}
        onApply={onApply}
        onRemove={() => {}}
        onSetExhaustion={() => {}}
      />,
    )
    const dialog = open()
    fireEvent.change(within(dialog).getByLabelText('Duration'), { target: { value: '1h' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Poisoned' }))
    fireEvent.click(within(dialog).getByRole('button', { name: '+ Add counter' }))
    fireEvent.change(within(dialog).getByLabelText('Counter 1 name'), {
      target: { value: 'Spore Load' },
    })
    clickApply(dialog)
    const [poisoned, tally] = applied(onApply)
    // The condition keeps the shared duration; the counter has no timer at all.
    expect(poisoned).toMatchObject({ name: 'Poisoned', duration: { type: 'rounds', rounds: 600 } })
    expect(tally).toMatchObject({
      name: 'Spore Load',
      icon: 'counter',
      duration: { type: 'counter', count: 0 },
    })
  })

  it('needs a name — an empty counter row applies nothing', () => {
    const onApply = vi.fn()
    render(
      <EffectModal
        name="Goblin"
        effects={[]}
        onApply={onApply}
        onRemove={() => {}}
        onSetExhaustion={() => {}}
      />,
    )
    const dialog = open()
    fireEvent.click(within(dialog).getByRole('button', { name: '+ Add counter' }))
    clickApply(dialog)
    expect(onApply).not.toHaveBeenCalled()
  })

  it('hides a counter from the player view when ticked', () => {
    const onApply = vi.fn()
    render(
      <EffectModal
        name="Goblin"
        effects={[]}
        onApply={onApply}
        onRemove={() => {}}
        onSetExhaustion={() => {}}
      />,
    )
    const dialog = open()
    fireEvent.click(within(dialog).getByRole('button', { name: '+ Add counter' }))
    fireEvent.change(within(dialog).getByLabelText('Counter 1 name'), {
      target: { value: 'Depth' },
    })
    fireEvent.click(within(dialog).getByLabelText('Hidden from players'))
    clickApply(dialog)
    expect(applied(onApply)[0]).toMatchObject({ name: 'Depth', gmOnly: true })
  })

  it('leaves a counter the creature already carries alone — its tally survives', () => {
    const depth: Effect = {
      id: 'e1',
      name: 'Depth',
      icon: 'counter',
      modifier: null,
      duration: { type: 'counter', count: 4 },
      gmOnly: true,
    }
    const onApply = vi.fn()
    render(
      <EffectModal
        name="Goblin"
        effects={[depth]}
        onApply={onApply}
        onRemove={() => {}}
        onSetExhaustion={() => {}}
      />,
    )
    const dialog = open()
    fireEvent.click(within(dialog).getByRole('button', { name: '+ Add counter' }))
    fireEvent.change(within(dialog).getByLabelText('Counter 1 name'), {
      target: { value: 'Depth' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Prone' }))
    clickApply(dialog)
    // Prone lands; a second Depth does not.
    expect(applied(onApply).map((e) => e.name)).toEqual(['Prone'])
  })
})

describe('bundles', () => {
  it('offers a bundle name once two parts are staged, and stamps it on Apply', () => {
    const onApply = vi.fn()
    render(
      <EffectModal
        name="Goblin"
        effects={[]}
        onApply={onApply}
        onRemove={() => {}}
        onSetExhaustion={() => {}}
      />,
    )
    const dialog = open()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Poisoned' }))
    expect(within(dialog).queryByLabelText('Bundle name')).toBeNull()
    fireEvent.change(within(dialog).getByLabelText('Custom reminder'), {
      target: { value: 'Rough morning ahead' },
    })
    fireEvent.change(within(dialog).getByLabelText('Bundle name'), {
      target: { value: 'Drunk' },
    })
    clickApply(dialog)
    const [a, b] = applied(onApply)
    expect(a.bundle?.name).toBe('Drunk')
    expect(b.bundle?.name).toBe('Drunk')
    expect(a.bundle?.id).toBe(b.bundle?.id)
  })

  it('applies loose effects when the bundle name stays blank', () => {
    const onApply = vi.fn()
    render(
      <EffectModal
        name="Goblin"
        effects={[]}
        onApply={onApply}
        onRemove={() => {}}
        onSetExhaustion={() => {}}
      />,
    )
    const dialog = open()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Poisoned' }))
    fireEvent.change(within(dialog).getByLabelText('Custom reminder'), {
      target: { value: 'Oil-soaked' },
    })
    clickApply(dialog)
    for (const e of applied(onApply)) expect(e.bundle).toBeUndefined()
  })
})

describe('presets', () => {
  it('offers no Presets row and no Save as preset when there are none', () => {
    render(<Harness />)
    const dialog = open()
    expect(within(dialog).queryByRole('button', { name: 'Presets' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Save as preset' })).toBeNull()
  })

  it('stages a preset into the form rather than applying it', () => {
    const applied: Effect[][] = []
    render(<Harness presets={[DRUNK]} onEffects={(e) => applied.push(e)} />)
    const dialog = open()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Presets' }))
    fireEvent.click(within(dialog).getByRole('button', { name: /Drunk/ }))

    // Nothing has landed on the creature yet.
    expect(applied).toEqual([])
    // …but the form now carries the preset: the condition chip is pressed, the
    // duration is the preset's, the reminder is filled in, and the bundle is named.
    expect(within(dialog).getByRole('button', { name: 'Poisoned' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(within(dialog).getByLabelText('Duration')).toHaveValue('1h')
    expect(within(dialog).getByLabelText('Custom reminder')).toHaveValue('Hungover in the morning')
    expect(within(dialog).getByLabelText('Bundle name')).toHaveValue('Drunk')
  })

  it('replaces what the last preset staged rather than piling onto it', () => {
    const HEXED: EffectPreset = {
      id: 'custom:hexed',
      name: 'Hexed',
      duration: { type: 'manual' },
      parts: [{ kind: 'reminder', note: 'Hex: +1d6 Necrotic' }],
    }
    render(<Harness presets={[DRUNK, HEXED]} />)
    const dialog = open()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Presets' }))
    fireEvent.click(within(dialog).getByRole('button', { name: /Drunk/ }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Presets' }))
    fireEvent.click(within(dialog).getByRole('button', { name: /Hexed/ }))

    // The second preset's reminder stands alone, and the first's condition is gone.
    expect(within(dialog).getByLabelText('Custom reminder')).toHaveValue('Hex: +1d6 Necrotic')
    expect(within(dialog).queryByLabelText('Reminder 2')).toBeNull()
    expect(within(dialog).getByRole('button', { name: 'Poisoned' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(within(dialog).getByLabelText('Duration')).toHaveValue('manual')
  })

  it('commits the staged preset on Apply as one named bundle', () => {
    let latest: Effect[] = []
    render(<Harness presets={[DRUNK]} onEffects={(e) => (latest = e)} />)
    const dialog = open()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Presets' }))
    fireEvent.click(within(dialog).getByRole('button', { name: /Drunk/ }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }))

    expect(latest.map((e) => e.name)).toEqual(['Poisoned', 'Hungover in the morning'])
    for (const e of latest) {
      expect(e.duration).toEqual({ type: 'rounds', rounds: 600 })
      expect(e.bundle?.name).toBe('Drunk')
    }
    expect(latest[0].bundle?.id).toBe(latest[1].bundle?.id)
  })

  it('only offers Save as preset once something is staged', () => {
    render(<Harness presets={[]} onSavePreset={vi.fn()} />)
    const dialog = open()
    const save = screen.getByRole('button', { name: 'Save as preset' })
    expect(save).toBeDisabled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Prone' }))
    expect(save).toBeEnabled()
  })

  it('saves what is staged under the name the GM types', () => {
    const onSavePreset = vi.fn()
    vi.spyOn(window, 'prompt').mockReturnValue('Knocked flat')
    render(<Harness onSavePreset={onSavePreset} />)
    const dialog = open()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Prone' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save as preset' }))

    expect(onSavePreset).toHaveBeenCalledTimes(1)
    const saved = onSavePreset.mock.calls[0][0] as EffectPreset
    expect(saved.name).toBe('Knocked flat')
    expect(saved.parts).toEqual([{ kind: 'condition', condition: 'Prone' }])
    expect(saved.source).toBeUndefined()
    vi.restoreAllMocks()
  })

  it('keeps nothing when the GM cancels the name prompt', () => {
    const onSavePreset = vi.fn()
    vi.spyOn(window, 'prompt').mockReturnValue(null)
    render(<Harness onSavePreset={onSavePreset} />)
    const dialog = open()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Prone' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save as preset' }))
    expect(onSavePreset).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })
})

describe('EffectModal — Exhaustion', () => {
  /** Render with only the Exhaustion handler wired, which is all these need. */
  const renderWith = (onSetExhaustion: (level: number) => void, effects: Effect[] = []) =>
    render(
      <EffectModal
        name="Goblin"
        effects={effects}
        onApply={() => {}}
        onRemove={() => {}}
        onSetExhaustion={onSetExhaustion}
      />,
    )

  /** The Exhaustion anchor at a level, as the modal would read it off a creature. */
  const at = (level: number): Effect => ({
    id: 'ex',
    name: 'Exhaustion',
    icon: 'condition',
    modifier: null,
    duration: { type: 'counter', count: level },
    bundle: { id: 'b', name: `Exhaustion ${level}` },
  })

  it('is a level rather than a condition chip', () => {
    renderWith(() => {})
    const dialog = open()
    expect(within(dialog).queryByRole('button', { name: 'Exhaustion' })).toBeNull()
    expect(within(dialog).getByRole('button', { name: 'Exhaustion 3' })).not.toBeNull()
    expect(within(dialog).getByRole('button', { name: 'No Exhaustion' })).not.toBeNull()
  })

  it('stages a level without applying it, then commits it on Apply', () => {
    const onSetExhaustion = vi.fn()
    renderWith(onSetExhaustion)
    const dialog = open()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Exhaustion 2' }))
    expect(onSetExhaustion).not.toHaveBeenCalled()
    clickApply(dialog)
    expect(onSetExhaustion).toHaveBeenCalledExactlyOnceWith(2)
  })

  it('opens on the level the creature already carries, and leaves it alone', () => {
    const onSetExhaustion = vi.fn()
    renderWith(onSetExhaustion, [at(4)])
    const dialog = open()
    expect(within(dialog).getByRole('button', { name: 'Exhaustion 4' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    clickApply(dialog)
    expect(onSetExhaustion).not.toHaveBeenCalled()
  })

  it('clears the condition by staging None', () => {
    const onSetExhaustion = vi.fn()
    renderWith(onSetExhaustion, [at(2)])
    const dialog = open()
    fireEvent.click(within(dialog).getByRole('button', { name: 'No Exhaustion' }))
    clickApply(dialog)
    expect(onSetExhaustion).toHaveBeenCalledExactlyOnceWith(0)
  })

  it('stages a preset’s level on top of what the creature carries, not instead of it', () => {
    const cold: EffectPreset = {
      id: 'custom:cold',
      name: 'A night in the cold',
      duration: { type: 'manual' },
      parts: [{ kind: 'exhaustion', levels: 1 }],
    }
    const onSetExhaustion = vi.fn()
    render(
      <EffectModal
        name="Goblin"
        effects={[at(2)]}
        onApply={() => {}}
        onRemove={() => {}}
        onSetExhaustion={onSetExhaustion}
        presets={[cold]}
      />,
    )
    const dialog = open()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Presets' }))
    fireEvent.click(within(dialog).getByRole('button', { name: /A night in the cold/ }))
    expect(within(dialog).getByRole('button', { name: 'Exhaustion 3' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    clickApply(dialog)
    expect(onSetExhaustion).toHaveBeenCalledExactlyOnceWith(3)
  })

  it('spells out what the staged level does, in the rules the campaign plays', () => {
    renderWith(() => {})
    const dialog = open()
    expect(within(dialog).getByText('No Exhaustion.')).not.toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Exhaustion 3' }))
    // No campaign in a bare render, so the 2024 default.
    expect(within(dialog).getByText('Level 3: -6 to every d20 roll, Speed -15 ft.')).not.toBeNull()
  })
})
