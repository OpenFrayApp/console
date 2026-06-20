// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { EffectBadge } from '../../src/components/EffectBadge.tsx'
import { condition, reminder } from '../../src/combat/effects.ts'

afterEach(cleanup)

describe('EffectBadge', () => {
  it('shows the reminder note when present', () => {
    render(<EffectBadge effect={reminder('Hex', 'Hex: +1d6 necrotic')} />)
    expect(screen.getByText('Hex: +1d6 necrotic')).toBeInTheDocument()
  })

  it('falls back to the name and titles the badge with it', () => {
    render(<EffectBadge effect={condition('Stunned')} />)
    const badge = screen.getByText('Stunned')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute('title', 'Stunned')
  })
})
