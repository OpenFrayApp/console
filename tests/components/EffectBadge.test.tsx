// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { EffectBadge, EffectGroupBadge } from '../../src/components/EffectBadge.tsx'
import { condition, counter, groupEffects, reminder, setCount } from '../../src/combat/effects.ts'

afterEach(cleanup)

describe('EffectBadge', () => {
  it('shows the reminder note when present', () => {
    render(<EffectBadge effect={reminder('Hex', 'Hex: +1d6 necrotic')} />)
    expect(screen.getByText('Hex: +1d6 necrotic')).toBeInTheDocument()
  })

  it('falls back to the name and keeps a title fallback for touch', () => {
    render(<EffectBadge effect={condition('Stunned')} />)
    expect(screen.getByText('Stunned')).toBeInTheDocument()
    // The badge stays short; the tooltip carries how it ends.
    expect(screen.getByTitle('Stunned — until removed')).toBeInTheDocument()
  })

  it('keeps the escape save off the badge — it belongs in Applied effects', () => {
    const save = condition('Paralyzed', {
      duration: { type: 'saveEnds', save: { ability: 'wis', dc: 15 } },
    })
    render(<EffectBadge effect={save} />)
    expect(screen.getByText('Paralyzed')).toBeInTheDocument()
    expect(screen.queryByText(/save DC/)).toBeNull()
    expect(screen.getByTitle('Paralyzed — WIS save DC 15 (EoT)')).toBeInTheDocument()
  })

  it('carries a counter’s tally on the badge, so the row shows where it stands', () => {
    render(<EffectBadge effect={setCount(counter('Depth'), 4)} />)
    expect(screen.getByText('Depth 4')).toBeInTheDocument()
    expect(screen.getByTitle('Depth — at 4')).toBeInTheDocument()
  })

  it('previews the condition rules on hover', () => {
    render(<EffectBadge effect={condition('Stunned')} />)
    fireEvent.mouseEnter(screen.getByText('Stunned'))
    expect(
      screen.getByText(/automatically fail Strength and Dexterity saving throws/i),
    ).toBeInTheDocument()
  })
})

describe('EffectGroupBadge', () => {
  const bundle = { id: 'b1', name: 'Drunk' }
  const drunk = () =>
    groupEffects([
      condition('Poisoned', { bundle }),
      reminder('Rough morning', 'Rough morning', { bundle }),
    ])[0]

  it('shows a bundle as one badge carrying its name, with the parts in the title', () => {
    render(<EffectGroupBadge group={drunk()} />)
    expect(screen.getByText('Drunk')).toBeInTheDocument()
    expect(screen.queryByText('Poisoned')).toBeNull()
    expect(screen.getByTitle('Drunk — Poisoned, Rough morning')).toBeInTheDocument()
  })

  it('removes the whole bundle from its ×', () => {
    const onRemove = vi.fn()
    render(<EffectGroupBadge group={drunk()} onRemove={onRemove} />)
    fireEvent.click(screen.getByTitle('Remove Drunk (Poisoned, Rough morning)'))
    expect(onRemove).toHaveBeenCalledOnce()
  })

  it('renders a loose single effect exactly as the plain badge does', () => {
    const group = groupEffects([setCount(counter('Depth'), 4)])[0]
    render(<EffectGroupBadge group={group} />)
    expect(screen.getByText('Depth 4')).toBeInTheDocument()
  })
})
