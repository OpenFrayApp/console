// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { FormSection } from '../../../src/components/editors/FormSection.tsx'

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
    const details = renderSection()
    const summary = screen.getByText('Senses')
    expect(summary.tagName).toBe('SUMMARY')
    expect(details.firstElementChild).toBe(summary)
    expect(details).toContainElement(screen.getByText('fields'))
  })

  it('starts closed by default — advanced sections stay out of the way', () => {
    expect(renderSection().open).toBe(false)
  })

  it('starts open when asked — core sections', () => {
    expect(renderSection(true).open).toBe(true)
  })
})
