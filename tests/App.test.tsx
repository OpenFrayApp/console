// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import App from '../src/App.tsx'

afterEach(cleanup)

describe('death-save demo', () => {
  it('hides the death-save controls once the PC stabilizes', () => {
    render(<App />)
    expect(screen.getByText('Roll death save')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Save'))
    fireEvent.click(screen.getByText('Save'))
    fireEvent.click(screen.getByText('Save'))

    // Three successes -> stable: no more Save/Fail/Roll, and the Stable badge shows.
    expect(screen.queryByText('Save')).toBeNull()
    expect(screen.queryByText('Fail')).toBeNull()
    expect(screen.queryByText('Roll death save')).toBeNull()
    expect(screen.getByText('Stable')).toBeInTheDocument()
  })
})
