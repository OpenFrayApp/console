// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { Modal } from '../../src/components/Modal.tsx'

afterEach(cleanup)

/** Render a Modal with a body paragraph and return its onClose spy. */
function renderModal(subtitle?: string) {
  const onClose = vi.fn()
  render(
    <Modal title="Delete goblin?" subtitle={subtitle} onClose={onClose}>
      <p>This cannot be undone.</p>
    </Modal>,
  )
  return onClose
}

describe('Modal', () => {
  it('is an aria-modal dialog holding the title, subtitle and body', () => {
    renderModal('Removes it from the encounter')
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(within(dialog).getByText('Delete goblin?')).toBeInTheDocument()
    expect(within(dialog).getByText('Removes it from the encounter')).toBeInTheDocument()
    expect(within(dialog).getByText('This cannot be undone.')).toBeInTheDocument()
  })

  it('closes from the Close button', () => {
    const onClose = renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape', () => {
    const onClose = renderModal()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on a pointer-down on the backdrop', () => {
    const onClose = renderModal()
    fireEvent.pointerDown(screen.getByRole('dialog').parentElement!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('stays open for pointer-downs inside the dialog', () => {
    const onClose = renderModal()
    fireEvent.pointerDown(screen.getByRole('dialog'))
    fireEvent.pointerDown(screen.getByText('This cannot be undone.'))
    expect(onClose).not.toHaveBeenCalled()
  })
})
