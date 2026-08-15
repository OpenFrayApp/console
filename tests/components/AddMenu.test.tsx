// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AddMenu, type AddMenuItem } from '../../src/components/AddMenu.tsx'

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

  // The picked control replaces the trigger rather than opening on top of it, so a
  // phone never stacks one fixed sheet over another.
  it('swaps itself for the picked control, opened', () => {
    render(<AddMenu items={items} />)
    fireEvent.click(trigger())
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add creature' }))
    expect(screen.getByText('Add creature is open')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add to the encounter' })).not.toBeInTheDocument()
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
