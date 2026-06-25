// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { EffectBadge } from '../../src/components/EffectBadge.tsx'
import { condition, reminder } from '../../src/combat/effects.ts'

afterEach(cleanup)

describe('EffectBadge', () => {
  it('shows the reminder note when present', () => {
    render(<EffectBadge effect={reminder('Hex', 'Hex: +1d6 necrotic')} />)
    expect(screen.getByText('Hex: +1d6 necrotic')).toBeInTheDocument()
  })

  it('falls back to the name and keeps a title fallback for touch', () => {
    render(<EffectBadge effect={condition('Stunned')} />)
    expect(screen.getByText('Stunned')).toBeInTheDocument()
    expect(screen.getByTitle('Stunned')).toBeInTheDocument()
  })

  it('previews the condition rules on hover', () => {
    render(<EffectBadge effect={condition('Stunned')} />)
    fireEvent.mouseEnter(screen.getByText('Stunned'))
    expect(screen.getByText(/automatically fail Strength and Dexterity saving throws/i)).toBeInTheDocument()
  })
})
