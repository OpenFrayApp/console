// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { FormSection } from '../../src/components/FormSection.tsx'

afterEach(cleanup)

/** Render a "Senses" section and return its <details> element. */
function renderSection(open?: boolean): HTMLDetailsElement {
  render(
    <FormSection title="Senses" open={open}>
      <span>fields</span>
    </FormSection>,
  )
  return screen.getByText('fields').closest('details')!
}

describe('FormSection', () => {
  it('renders the title as the toggle and the fields inside the section', () => {
    renderSection()
    expect(screen.getByText('Senses').tagName).toBe('SUMMARY')
    expect(screen.getByText('fields')).toBeInTheDocument()
  })

  it('starts closed by default — advanced sections stay out of the way', () => {
    expect(renderSection().open).toBe(false)
  })

  it('starts open when asked — core sections', () => {
    expect(renderSection(true).open).toBe(true)
  })

  it('clicking the title toggles the section open and closed', () => {
    const details = renderSection()
    fireEvent.click(screen.getByText('Senses'))
    expect(details.open).toBe(true)
    fireEvent.click(screen.getByText('Senses'))
    expect(details.open).toBe(false)
  })
})
