// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { SourceLink } from '../../src/components/SourceLink.tsx'

afterEach(cleanup)

describe('SourceLink', () => {
  it('links an SRD source to its attribution page', () => {
    render(<SourceLink source="srd-5.2" />)
    const link = screen.getByRole('link', { name: /SRD 5\.2/ })
    expect(link).toHaveAttribute('href', 'https://www.dndbeyond.com/srd')
  })

  it('shows custom content without a link', () => {
    render(<SourceLink source="custom" />)
    expect(screen.getByText(/Custom/)).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })
})
