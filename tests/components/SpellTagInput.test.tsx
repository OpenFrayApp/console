// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { SpellTagInput } from '../../src/components/SpellTagInput.tsx'
import type { Spell } from '../../src/schema/spell.ts'
import type { SpellRef } from '../../src/schema/creature.ts'

afterEach(cleanup)

/** A minimal compendium spell for the picker fixtures. */
function spell(id: string, name: string, source: string, level = 3): Spell {
  return {
    id,
    source,
    name,
    level,
    school: 'Evocation',
    castingTime: '1 action',
    range: '150 feet',
    components: { verbal: true, somatic: true, material: false },
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    text: 'Spell text.',
  }
}

// The same name in both SRD editions, a near-match, a custom spell, and a cantrip.
const SPELLS: Spell[] = [
  spell('srd-5.2:fireball', 'Fireball', 'srd-5.2'),
  spell('srd-5.1:fireball', 'Fireball', 'srd-5.1'),
  spell('srd-5.2:fire-shield', 'Fire Shield', 'srd-5.2', 4),
  spell('custom:fire-whip', 'Fire Whip', 'custom'),
  spell('srd-5.2:mage-hand', 'Mage Hand', 'srd-5.2', 0),
]

/** Stateful wrapper so adding and removing chips re-renders like the real form. */
function Harness({ initial = [] }: { initial?: SpellRef[] }) {
  const [value, setValue] = useState<SpellRef[]>(initial)
  return <SpellTagInput value={value} onChange={setValue} spells={SPELLS} />
}

describe('SpellTagInput', () => {
  it('signals while the compendium has not arrived yet', () => {
    render(<SpellTagInput value={[]} onChange={() => {}} spells={[]} />)
    expect(screen.getByPlaceholderText('Loading spells…')).toBeInTheDocument()
    cleanup()
    render(<SpellTagInput value={[]} onChange={() => {}} spells={SPELLS} />)
    expect(screen.getByPlaceholderText('Add a spell…')).toBeInTheDocument()
  })

  it('suggests case-insensitive name matches as you type', () => {
    render(<SpellTagInput value={[]} onChange={() => {}} spells={SPELLS} />)
    const input = screen.getByLabelText('Add spell')
    expect(screen.queryByRole('list')).toBeNull() // no menu until a query

    fireEvent.change(input, { target: { value: 'FIRE' } })
    expect(screen.getAllByText('Fireball')).toHaveLength(2)
    expect(screen.getByText('Fire Shield')).toBeInTheDocument()
    expect(screen.queryByText('Mage Hand')).toBeNull()

    fireEvent.change(input, { target: { value: 'fire s' } })
    expect(screen.queryByText('Fireball')).toBeNull()
    expect(screen.getByText('Fire Shield')).toBeInTheDocument()

    fireEvent.change(input, { target: { value: '' } })
    expect(screen.queryByText('Fire Shield')).toBeNull() // clearing hides the menu
  })

  it('labels each suggestion with its edition and level', () => {
    render(<SpellTagInput value={[]} onChange={() => {}} spells={SPELLS} />)
    fireEvent.change(screen.getByLabelText('Add spell'), { target: { value: 'fire' } })

    // The two SRD printings of Fireball are told apart by their edition badges.
    const items = screen.getAllByRole('listitem')
    expect(within(items[0]).getByText('5.5')).toBeInTheDocument()
    expect(within(items[1]).getByText('5.0')).toBeInTheDocument()
    expect(within(items[0]).getByText('Lvl 3')).toBeInTheDocument()

    // A custom spell belongs to no library, so it carries no edition badge.
    const whip = items.find((li) => within(li).queryByText('Fire Whip'))!
    expect(within(whip).queryByText('5.5')).toBeNull()
    expect(within(whip).queryByText('5.0')).toBeNull()

    fireEvent.change(screen.getByLabelText('Add spell'), { target: { value: 'mage' } })
    expect(screen.getByText('Cantrip')).toBeInTheDocument()
  })

  it('adds the clicked suggestion as { name, ref }', () => {
    const onChange = vi.fn()
    render(<SpellTagInput value={[]} onChange={onChange} spells={SPELLS} />)
    fireEvent.change(screen.getByLabelText('Add spell'), { target: { value: 'shield' } })
    fireEvent.click(screen.getByText('Fire Shield'))
    expect(onChange).toHaveBeenCalledWith([{ name: 'Fire Shield', ref: 'srd-5.2:fire-shield' }])
  })

  it('shows the added chip and clears the search box', () => {
    render(<Harness />)
    const input = screen.getByLabelText('Add spell') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'shield' } })
    fireEvent.click(screen.getByText('Fire Shield'))

    expect(input.value).toBe('')
    expect(screen.queryByRole('listitem')).toBeNull() // menu closed
    expect(screen.getByText('Fire Shield')).toBeInTheDocument() // now a chip
    expect(screen.getByLabelText('Remove Fire Shield')).toBeInTheDocument()
  })

  it('drops already-picked spells from the suggestions, per edition', () => {
    render(<Harness initial={[{ name: 'Fireball', ref: 'srd-5.2:fireball' }]} />)
    fireEvent.change(screen.getByLabelText('Add spell'), { target: { value: 'fireball' } })

    // Only the 5.0 printing is still offered; the chip's 5.2 ref is excluded.
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(within(items[0]).getByText('5.0')).toBeInTheDocument()
  })

  it('removes exactly the clicked chip when two share a name', () => {
    const onChange = vi.fn()
    const both: SpellRef[] = [
      { name: 'Fireball', ref: 'srd-5.2:fireball' },
      { name: 'Fireball', ref: 'srd-5.1:fireball' },
    ]
    render(<SpellTagInput value={both} onChange={onChange} spells={SPELLS} />)

    const removes = screen.getAllByLabelText('Remove Fireball')
    expect(removes).toHaveLength(2)
    fireEvent.click(removes[0])
    expect(onChange).toHaveBeenCalledWith([{ name: 'Fireball', ref: 'srd-5.1:fireball' }])
  })

  it('tags a chip with the edition of its ref, and leaves ref-less chips untagged', () => {
    render(
      <SpellTagInput
        value={[{ name: 'Fireball', ref: 'srd-5.1:fireball' }, { name: 'Homebrew Haze' }]}
        onChange={() => {}}
        spells={SPELLS}
      />,
    )
    expect(screen.getByText('5.0')).toBeInTheDocument()
    expect(screen.queryByText('5.5')).toBeNull()
  })
})
