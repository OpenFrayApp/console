// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { SourceLink } from '../../src/components/SourceLink.tsx'

afterEach(cleanup)

describe('SourceLink', () => {
  it('shows the ruleset as plain text — no link, no license', () => {
    render(<SourceLink source="srd-5.2" />)
    expect(screen.getByText(/Core Rules 2024/)).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByText(/License/)).toBeNull()
  })

  it('folds the page into the ruleset parens', () => {
    render(<SourceLink source="srd-5.2" page={266} />)
    expect(screen.getByText(/\(SRD 5\.2\.1, pg\. 266\)/)).toBeInTheDocument()
  })

  it('shows the 2014 ruleset', () => {
    render(<SourceLink source="srd-5.1" />)
    expect(screen.getByText(/Core Rules 2014/)).toBeInTheDocument()
  })

  it('shows custom content without a license link', () => {
    render(<SourceLink source="custom" />)
    expect(screen.getByText(/Custom/)).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })
})
