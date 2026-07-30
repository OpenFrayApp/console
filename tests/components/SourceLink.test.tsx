// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { SourceLink } from '../../src/components/SourceLink.tsx'

afterEach(cleanup)

describe('SourceLink', () => {
  it('links the ruleset to its source, and never shows the license', () => {
    render(<SourceLink source="srd-5.2" />)
    const link = screen.getByRole('link', { name: /Basic Rules 2024/ })
    expect(link).toHaveAttribute('href', 'https://www.dndbeyond.com/srd')
    // A new tab: following a source mid-fight must not take the board off the screen.
    expect(link).toHaveAttribute('target', '_blank')
    expect(screen.queryByText(/License/)).toBeNull()
  })

  it('links one of our own books to the book itself, not to the site root', () => {
    render(<SourceLink source="openfray-brood-and-bloom" />)
    expect(screen.getByRole('link', { name: /Brood & Bloom/ })).toHaveAttribute(
      'href',
      '/brood-and-bloom/',
    )
  })

  it('leaves custom content unlinked — there is nowhere to send the reader', () => {
    render(<SourceLink source="custom" />)
    expect(screen.getByText(/Custom \(you\)/)).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('folds the page into the ruleset parens', () => {
    render(<SourceLink source="srd-5.2" page={266} />)
    expect(screen.getByText(/\(SRD 5\.2\.1, pg\. 266\)/)).toBeInTheDocument()
  })

  it('shows the 2014 ruleset', () => {
    render(<SourceLink source="srd-5.1" />)
    expect(screen.getByText(/Basic Rules 2014/)).toBeInTheDocument()
  })

  it('shows an OpenFray library (Brood & Bloom) by name, not its id', () => {
    render(<SourceLink source="openfray-brood-and-bloom" />)
    expect(screen.getByText(/Brood & Bloom/)).toBeInTheDocument()
    expect(screen.queryByText(/openfray-brood/)).toBeNull()
  })

  it('shows an OpenFray library (The Waking Garden) by name, not its id', () => {
    render(<SourceLink source="openfray-waking-garden" />)
    expect(screen.getByText(/The Waking Garden/)).toBeInTheDocument()
    expect(screen.queryByText(/openfray-waking/)).toBeNull()
  })

  it('shows custom content without a license link', () => {
    render(<SourceLink source="custom" />)
    expect(screen.getByText(/Custom/)).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('shows a third-party (OGL) source and appends the page when there are no parens', () => {
    render(<SourceLink source="kobold-press-tob3" page={16} />)
    expect(screen.getByText(/Tome of Beasts 3 \(pg\. 16\)/)).toBeInTheDocument()
  })
})
