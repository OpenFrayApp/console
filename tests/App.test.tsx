// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import App from '../src/App.tsx'

afterEach(cleanup)

describe('App', () => {
  it('shows the encounter console by default with view navigation', () => {
    render(<App />)
    expect(screen.getByText('+ Add creature')).toBeInTheDocument()
    expect(screen.getByText(/Add creatures to build the encounter/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'encounter' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'compendium' })).toBeInTheDocument()
  })
})
