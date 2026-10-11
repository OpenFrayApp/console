// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { EffectBadge } from '../../../src/components/tracker/EffectBadge.tsx'
import { reminder } from '../../../src/combat/effects.ts'
import { GmNotes } from '../../../src/components/statblock/GmNotes.tsx'
import { SpellCard } from '../../../src/components/statblock/SpellCard.tsx'
import { spell } from '../../fixtures.ts'
import '../../../src/index.css'

afterEach(cleanup)

it('keeps clickable reminder note text left-aligned instead of using button centering', () => {
  const effect = reminder('Ward', 'Conditional protection applies while the ward remains active.')
  render(
    createElement(
      'div',
      { style: { width: 160 } },
      createElement(EffectBadge, { effect, onRemove: () => {} }),
    ),
  )
  expect(getComputedStyle(screen.getByRole('button')).textAlign).toBe('left')
})

it('keeps read-only note prose left-aligned even inside centered UI', () => {
  render(
    createElement(
      'div',
      { style: { textAlign: 'center' } },
      createElement(GmNotes, { value: 'A long private note that should read from the left edge.' }),
    ),
  )
  expect(
    getComputedStyle(screen.getByText('A long private note that should read from the left edge.'))
      .textAlign,
  ).toBe('left')
})

it('keeps spell prose left-aligned and formats casting details without changing the card', () => {
  const card = spell({
    castingTime: '1 reaction (which you take when a creature dies)',
    duration: 'up to 1 minute',
    concentration: true,
    text: 'The source rules remain unchanged.',
  })
  const before = JSON.stringify(card)
  render(
    createElement(
      'div',
      { style: { textAlign: 'center' } },
      createElement(SpellCard, { spell: card }),
    ),
  )
  expect(screen.getByText('Reaction (which you take when a creature dies)')).toBeTruthy()
  expect(screen.getByText('Concentration, Up To 1 Minute')).toBeTruthy()
  expect(getComputedStyle(screen.getByText('The source rules remain unchanged.')).textAlign).toBe(
    'left',
  )
  expect(JSON.stringify(card)).toBe(before)
})
