// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { Spell } from '../../src/schema/spell.ts'
import { HoverSpell } from '../../src/components/HoverSpell.tsx'
import { Markdown } from '../../src/components/Markdown.tsx'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const fireBolt: Spell = {
  id: 'srd-5.2:fire-bolt',
  source: 'srd-5.2',
  name: 'Fire Bolt',
  level: 0,
  school: 'Evocation',
  castingTime: 'action',
  range: '120 feet',
  components: { verbal: true, somatic: true, material: false },
  duration: 'instantaneous',
  concentration: false,
  ritual: false,
  text: 'You hurl a mote of fire.',
}

describe('HoverSpell', () => {
  it('opens the spell card on hover', () => {
    render(<HoverSpell spell={fireBolt}>cast-link</HoverSpell>)
    expect(screen.queryByRole('heading', { name: 'Fire Bolt' })).toBeNull()
    fireEvent.mouseEnter(screen.getByText('cast-link'))
    expect(screen.getByRole('heading', { name: 'Fire Bolt' })).toBeInTheDocument()
    expect(screen.getByText('Evocation cantrip')).toBeInTheDocument()
    expect(screen.getByText('You hurl a mote of fire.')).toBeInTheDocument()
  })

  it('closes after the grace period once the pointer leaves', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    render(<HoverSpell spell={fireBolt}>cast-link</HoverSpell>)
    const anchor = screen.getByText('cast-link')
    fireEvent.mouseEnter(anchor)
    fireEvent.mouseLeave(anchor)
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(screen.queryByRole('heading', { name: 'Fire Bolt' })).toBeNull()
  })

  it('resolves a spell: link in prose into a hover preview', () => {
    render(
      <Markdown resolveSpell={(ref) => (ref === 'srd-5.2:fire-bolt' ? fireBolt : undefined)}>
        {'Casts [Fire Bolt](spell:srd-5.2:fire-bolt) at range.'}
      </Markdown>,
    )
    fireEvent.mouseEnter(screen.getByText('Fire Bolt'))
    expect(screen.getByText('Casting Time')).toBeInTheDocument()
    expect(screen.getByText('Evocation cantrip')).toBeInTheDocument()
  })

  it('shows no card when the resolver cannot find the spell', () => {
    render(
      <Markdown resolveSpell={() => undefined}>
        {'Casts [Fire Bolt](spell:srd-5.2:missing) at range.'}
      </Markdown>,
    )
    // The unresolved link degrades to plain text — hovering opens nothing.
    fireEvent.mouseEnter(screen.getByText(/Fire Bolt/))
    expect(screen.queryByText('Casting Time')).toBeNull()
    expect(screen.queryByRole('heading')).toBeNull()
  })
})
