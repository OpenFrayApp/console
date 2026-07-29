// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ActionEditor } from '../../src/components/ActionEditor.tsx'
import { emptyActionDraft, type ActionDraft } from '../../src/components/customMonster.ts'

afterEach(cleanup)

/** Stateful wrapper so kind switches and row edits re-render like the real form. */
function Harness({
  initial,
  label = 'action',
  showLegendaryCost = false,
}: {
  initial: ActionDraft
  label?: string
  showLegendaryCost?: boolean
}) {
  const [action, setAction] = useState(initial)
  return (
    <ActionEditor
      action={action}
      label={label}
      showLegendaryCost={showLegendaryCost}
      onChange={setAction}
      onRemove={() => {}}
    />
  )
}

describe('ActionEditor', () => {
  it('shows reach for a melee attack and no range or save fields', () => {
    render(
      <ActionEditor
        action={emptyActionDraft()}
        label="action"
        onChange={() => {}}
        onRemove={() => {}}
      />,
    )
    expect((screen.getByLabelText('Attack ability') as HTMLSelectElement).value).toBe('str')
    expect(screen.getByLabelText('Reach')).toBeInTheDocument()
    expect(screen.queryByLabelText('Short range')).toBeNull()
    expect(screen.queryByLabelText('Save DC')).toBeNull()
  })

  it('shows the range pair for a ranged attack, defaulting the ability to DEX', () => {
    render(
      <ActionEditor
        action={emptyActionDraft('ranged')}
        label="action"
        onChange={() => {}}
        onRemove={() => {}}
      />,
    )
    expect((screen.getByLabelText('Attack ability') as HTMLSelectElement).value).toBe('dex')
    expect(screen.getByLabelText('Short range')).toBeInTheDocument()
    expect(screen.getByLabelText('Long range')).toBeInTheDocument()
    expect(screen.queryByLabelText('Reach')).toBeNull()
  })

  it('switching kind swaps the attack row for save fields, then hides both for utility', () => {
    render(<Harness initial={emptyActionDraft()} />)
    expect(screen.getByLabelText('Attack ability')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('action kind'), { target: { value: 'save' } })
    expect(screen.queryByLabelText('Attack ability')).toBeNull()
    expect(screen.getByLabelText('Save ability')).toBeInTheDocument()
    expect(screen.getByLabelText('Save DC')).toBeInTheDocument()
    expect(screen.getByLabelText('On save')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('action kind'), { target: { value: 'utility' } })
    expect(screen.queryByLabelText('Attack ability')).toBeNull()
    expect(screen.queryByLabelText('Save ability')).toBeNull()
  })

  it('reports each edit through onChange with the rest of the draft intact', () => {
    const action = emptyActionDraft()
    const onChange = vi.fn()
    render(<ActionEditor action={action} label="action" onChange={onChange} onRemove={() => {}} />)

    fireEvent.change(screen.getByLabelText('action name'), { target: { value: 'Bite' } })
    expect(onChange.mock.calls[0][0]).toEqual({ ...action, name: 'Bite' })

    fireEvent.change(screen.getByLabelText('Reach'), { target: { value: '10' } })
    expect(onChange.mock.calls[1][0]).toEqual({ ...action, reach: '10' })
  })

  it('edits a damage row by id, leaving its siblings alone', () => {
    const action: ActionDraft = {
      ...emptyActionDraft(),
      damage: [
        { id: 'd1', formula: '2d6', type: 'slashing' },
        { id: 'd2', formula: '1d6', type: 'fire' },
      ],
    }
    const onChange = vi.fn()
    render(<ActionEditor action={action} label="action" onChange={onChange} onRemove={() => {}} />)

    fireEvent.change(screen.getAllByLabelText('Damage formula')[0], { target: { value: '3d6' } })
    expect(onChange.mock.calls[0][0].damage).toEqual([
      { id: 'd1', formula: '3d6', type: 'slashing' },
      { id: 'd2', formula: '1d6', type: 'fire' },
    ])

    fireEvent.change(screen.getAllByLabelText('Damage type')[1], { target: { value: 'cold' } })
    expect(onChange.mock.calls[1][0].damage[1]).toEqual({ id: 'd2', formula: '1d6', type: 'cold' })
  })

  it('adds a damage row and removes one by its ✕', () => {
    render(<Harness initial={emptyActionDraft()} />)
    fireEvent.click(screen.getByText('+ Add damage'))
    expect(screen.getAllByLabelText('Damage formula')).toHaveLength(2)
    fireEvent.click(screen.getAllByLabelText('Remove damage')[1])
    expect(screen.getAllByLabelText('Damage formula')).toHaveLength(1)
  })

  it('will not remove the last damage row', () => {
    render(<Harness initial={emptyActionDraft()} />)
    expect(screen.getByLabelText('Remove damage')).toBeDisabled()
  })

  it('reveals the recharge value only once a recharge kind is chosen', () => {
    render(<Harness initial={emptyActionDraft()} />)
    expect(screen.queryByLabelText('Recharge value')).toBeNull()

    fireEvent.change(screen.getByLabelText('Recharge kind'), { target: { value: 'dice' } })
    expect(screen.getByPlaceholderText('Threshold (5)')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Recharge kind'), { target: { value: 'perDay' } })
    expect(screen.getByPlaceholderText('Count (1)')).toBeInTheDocument()
  })

  it('shows the legendary cost only when the category spends the budget', () => {
    const action = emptyActionDraft()
    const { unmount } = render(
      <ActionEditor action={action} label="action" onChange={() => {}} onRemove={() => {}} />,
    )
    expect(screen.queryByLabelText('Legendary cost')).toBeNull()
    unmount()

    const onChange = vi.fn()
    render(
      <ActionEditor
        action={action}
        label="legendary action"
        showLegendaryCost
        onChange={onChange}
        onRemove={() => {}}
      />,
    )
    fireEvent.change(screen.getByLabelText('Legendary cost'), { target: { value: '2' } })
    expect(onChange.mock.calls[0][0]).toEqual({ ...action, legendaryCost: '2' })
  })

  it('names its fields after the category label', () => {
    render(<Harness initial={emptyActionDraft()} label="lair action" />)
    expect(screen.getByPlaceholderText('Lair action name')).toBeInTheDocument()
    expect(screen.getByLabelText('lair action text')).toBeInTheDocument()
    expect(screen.getByLabelText('Remove lair action')).toBeInTheDocument()
  })

  it('calls onRemove for the remove button', () => {
    const onRemove = vi.fn()
    render(
      <ActionEditor
        action={emptyActionDraft()}
        label="action"
        onChange={() => {}}
        onRemove={onRemove}
      />,
    )
    fireEvent.click(screen.getByLabelText('Remove action'))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })
})
