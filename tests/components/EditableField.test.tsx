// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { EditableField } from '../../src/components/EditableField.tsx'

afterEach(cleanup)

/** Render the field showing "AC 12" and return its onCommit spy. */
function renderField() {
  const onCommit = vi.fn()
  render(
    <EditableField initial="12" onCommit={onCommit} title="Edit AC" inputClassName="w-10">
      <span>AC 12</span>
    </EditableField>,
  )
  return onCommit
}

/** Click into edit mode and return the input. */
function startEditing(): HTMLElement {
  fireEvent.click(screen.getByRole('button'))
  return screen.getByRole('textbox')
}

describe('EditableField', () => {
  it('shows the display content as a titled button before editing', () => {
    renderField()
    expect(screen.getByRole('button', { name: 'AC 12' })).toHaveAttribute('title', 'Edit AC')
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('clicking swaps in a focused input pre-filled with the current value', () => {
    renderField()
    const input = startEditing()
    expect(input).toHaveValue('12')
    expect(input).toHaveFocus()
  })

  it('commits the edited value on Enter and returns to display mode', () => {
    const onCommit = renderField()
    const input = startEditing()
    fireEvent.change(input, { target: { value: '15' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith('15')
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('commits on blur — clicking away saves', () => {
    const onCommit = renderField()
    const input = startEditing()
    fireEvent.change(input, { target: { value: '18' } })
    fireEvent.blur(input)
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith('18')
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('Escape abandons the edit without committing', () => {
    const onCommit = renderField()
    const input = startEditing()
    fireEvent.change(input, { target: { value: '99' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onCommit).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'AC 12' })).toBeInTheDocument()
  })

  it('a fresh edit starts from the current value, not an abandoned draft', () => {
    renderField()
    const input = startEditing()
    fireEvent.change(input, { target: { value: '99' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(startEditing()).toHaveValue('12')
  })
})
