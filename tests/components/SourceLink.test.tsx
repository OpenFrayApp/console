// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { SourceLink } from '../../src/components/SourceLink.tsx'

afterEach(cleanup)

describe('SourceLink', () => {
  it('shows the ruleset and a linked license', () => {
    render(<SourceLink source="srd-5.2" />)
    expect(screen.getByText(/Core Rules 2024/)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'CC-BY-4.0' })
    expect(link).toHaveAttribute('href', 'https://www.dndbeyond.com/srd')
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
