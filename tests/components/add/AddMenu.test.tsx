// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AddMenu, type AddMenuItem } from '../../../src/components/add/AddMenu.tsx'

afterEach(cleanup)

/** Stand-in for a real add control: reports open, and closes on its own button. */
function Stub({ name, onClosed }: { name: string; onClosed: () => void }) {
  return (
    <div>
      <p>{name} is open</p>
      <button type="button" onClick={onClosed}>
        dismiss {name}
      </button>
    </div>
  )
}

const items: AddMenuItem[] = [
  { key: 'quick', label: 'Quick add', render: (done) => <Stub name="Quick add" onClosed={done} /> },
  {
    key: 'creature',
    label: 'Add creature',
    render: (done) => <Stub name="Add creature" onClosed={done} />,
  },
]

/** The menu's own trigger, which carries a fuller name than the "Add" it displays. */
const trigger = () => screen.getByRole('button', { name: 'Add to the encounter' })

describe('AddMenu', () => {
  it('lists the add controls only once opened', () => {
    render(<AddMenu items={items} />)
    expect(screen.queryByRole('menuitem', { name: 'Quick add' })).not.toBeInTheDocument()
    fireEvent.click(trigger())
    expect(screen.getByRole('menuitem', { name: 'Quick add' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Add creature' })).toBeInTheDocument()
  })

  // The menu closes and the picked control opens in its place, with the Add button
  // still there: swapping it for that control's own trigger read as the header
  // changing under the tap. The items render with their triggers hidden, so Add is
  // the only button of its own here at any point.
  it('opens the picked control and keeps its own button', () => {
    render(<AddMenu items={items} />)
    fireEvent.click(trigger())
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add creature' }))
    expect(screen.getByText('Add creature is open')).toBeInTheDocument()
    expect(trigger()).toBeInTheDocument()
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
  })

  it('closes the picked control when its button is pressed again', () => {
    render(<AddMenu items={items} />)
    fireEvent.click(trigger())
    fireEvent.click(screen.getByRole('menuitem', { name: 'Quick add' }))
    fireEvent.click(trigger())
    expect(screen.queryByText('Quick add is open')).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
  })

  it('comes back when the picked control closes', () => {
    render(<AddMenu items={items} />)
    fireEvent.click(trigger())
    fireEvent.click(screen.getByRole('menuitem', { name: 'Quick add' }))
    fireEvent.click(screen.getByRole('button', { name: 'dismiss Quick add' }))
    expect(screen.queryByText('Quick add is open')).not.toBeInTheDocument()
    expect(trigger()).toBeInTheDocument()
  })

  it('keeps the trigger labelled for a screen reader, not just drawn', () => {
    render(<AddMenu items={items} />)
    expect(trigger()).toHaveTextContent('Add')
    expect(trigger()).toHaveAttribute('aria-haspopup', 'menu')
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(trigger())
    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
  })

  it('does not fire a render until its item is picked', () => {
    const render1 = vi.fn(() => <p>never</p>)
    render(<AddMenu items={[{ key: 'a', label: 'A', render: render1 }]} />)
    fireEvent.click(trigger())
    expect(render1).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('menuitem', { name: 'A' }))
    expect(render1).toHaveBeenCalled()
  })
})
