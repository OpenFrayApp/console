// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { Combatant, PlayerCharacter } from '../../src/schema/combatant.ts'
import type { Spell } from '../../src/schema/spell.ts'
import { ApplySpellEffect } from '../../src/components/ApplySpellEffect.tsx'

afterEach(cleanup)

const spell = (name: string): Spell => ({
  id: `srd-5.2:${name.toLowerCase()}`,
  source: 'srd-5.2',
  name,
  level: 1,
  school: 'Abjuration',
  castingTime: 'action',
  range: 'touch',
  components: { verbal: true, somatic: true, material: false },
  duration: 'up to 1 minute',
  concentration: true,
  ritual: false,
  text: '',
})

const pc = (id: string, name: string): PlayerCharacter => ({
  isPC: true,
  kind: 'pc',
  combatantId: id,
  name,
  initiative: 0,
  ac: 15,
  status: 'active',
  hp: { current: 20, max: 20, temp: 0 },
  concentration: null,
  effects: [],
})

describe('ApplySpellEffect', () => {
  it('renders nothing for an unmapped spell', () => {
    const { container } = render(
      <ApplySpellEffect
        spell={spell('Fireball')}
        combatants={[pc('p1', 'Thalia')]}
        dispatch={vi.fn()}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows the summary, pre-selects allies (casterless), and applies the effect', () => {
    const dispatch = vi.fn()
    const thalia = pc('p1', 'Thalia')
    render(<ApplySpellEffect spell={spell('Bless')} combatants={[thalia]} dispatch={dispatch} />)

    expect(screen.getByText(/\+1d4 to attack rolls and saving throws/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Apply effect' }))

    const action = dispatch.mock.calls.map((c) => c[0]).find((a) => a.type === 'update')
    expect(action).toBeTruthy()
    expect(action.id).toBe('p1')
    // The update adds Bless's two parts — attacks and saves — as one named bundle.
    const updated = action.update(thalia) as Combatant
    expect(updated.effects).toHaveLength(2)
    expect(updated.effects.map((e) => e.name)).toEqual(['Bless', 'Bless'])
    expect(new Set(updated.effects.map((e) => e.bundle?.id)).size).toBe(1)
    expect(updated.effects[0].bundle?.name).toBe('Bless')
    expect(screen.getByText(/Applied to Thalia/)).toBeInTheDocument()
  })

  it('does not pre-select enemies for an ally buff cast without a caster', () => {
    const dispatch = vi.fn()
    const foe: PlayerCharacter = { ...pc('f1', 'Bandit'), side: 'foe' }
    render(<ApplySpellEffect spell={spell('Bless')} combatants={[foe]} dispatch={dispatch} />)
    // The foe is not pre-selected, so applying with nothing checked is a no-op.
    fireEvent.click(screen.getByRole('button', { name: 'Apply effect' }))
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('applies a self-only spell to its caster with no button to press', () => {
    const dispatch = vi.fn()
    const drake = pc('m1', 'Brass Drake')
    const speak = { ...spell('Speak with Animals'), concentration: false, duration: '10 minutes' }
    render(
      <ApplySpellEffect
        spell={speak}
        caster={drake}
        combatants={[drake, pc('p1', 'Thalia')]}
        dispatch={dispatch}
      />,
    )

    // No chooser and no confirm step — it landed on cast.
    expect(screen.queryByRole('button', { name: 'Apply effect' })).toBeNull()
    expect(screen.getByText(/Applied to Brass Drake/)).toBeInTheDocument()

    const action = dispatch.mock.calls.map((c) => c[0]).find((a) => a.type === 'update')
    expect(action.id).toBe('m1')
    expect((action.update(drake) as Combatant).effects[0].name).toBe('Speak with Animals')
    // Once only — a re-render must not stack a second copy.
    expect(dispatch.mock.calls.filter((c) => c[0].type === 'update')).toHaveLength(1)
  })

  it('still lets the GM pick a recipient for a self spell cast with no caster', () => {
    const dispatch = vi.fn()
    const speak = { ...spell('Speak with Animals'), concentration: false, duration: '10 minutes' }
    render(<ApplySpellEffect spell={speak} combatants={[pc('p1', 'Thalia')]} dispatch={dispatch} />)
    // The app can't know who cast it, so nothing is applied until the GM says.
    expect(dispatch).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Apply effect' })).toBeInTheDocument()
  })
})
