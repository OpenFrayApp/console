// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AddPcForm } from '../../src/components/AddPcForm.tsx'

afterEach(cleanup)

describe('AddPcForm', () => {
  it('builds a lightweight PC from the form', () => {
    const onAdd = vi.fn()
    render(<AddPcForm onAdd={onAdd} />)
    fireEvent.click(screen.getByText('+ Add PC'))
    fireEvent.change(screen.getByLabelText('PC name'), { target: { value: 'Thalia' } })
    fireEvent.change(screen.getByLabelText('AC'), { target: { value: '16' } })
    fireEvent.change(screen.getByLabelText('Max HP'), { target: { value: '38' } })
    fireEvent.change(screen.getByLabelText('Initiative'), { target: { value: '18' } })
    fireEvent.click(screen.getByText('Add'))

    expect(onAdd).toHaveBeenCalledOnce()
    expect(onAdd.mock.calls[0][0]).toMatchObject({
      isPC: true,
      name: 'Thalia',
      ac: 16,
      initiative: 18,
      hp: { current: 38, max: 38, temp: 0 },
    })
  })

  it('does not submit without a name', () => {
    const onAdd = vi.fn()
    render(<AddPcForm onAdd={onAdd} />)
    fireEvent.click(screen.getByText('+ Add PC'))
    fireEvent.click(screen.getByText('Add'))
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('closes when the user clicks outside it', () => {
    render(
      <div>
        <AddPcForm onAdd={vi.fn()} />
        <button type="button">outside</button>
      </div>,
    )
    fireEvent.click(screen.getByText('+ Add PC'))
    expect(screen.getByLabelText('PC name')).toBeInTheDocument()
    fireEvent.pointerDown(screen.getByText('outside'))
    expect(screen.queryByLabelText('PC name')).toBeNull()
  })

  it('closes on Escape', () => {
    render(<AddPcForm onAdd={vi.fn()} />)
    fireEvent.click(screen.getByText('+ Add PC'))
    expect(screen.getByLabelText('PC name')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByLabelText('PC name')).toBeNull()
  })
})
