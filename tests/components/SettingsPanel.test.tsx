// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SettingsPanel } from '../../src/components/SettingsPanel.tsx'

afterEach(cleanup)

describe('SettingsPanel', () => {
  it('lists the content libraries and toggles one on', () => {
    const onSet = vi.fn()
    render(
      <SettingsPanel
        onClose={() => {}}
        enabledLibraries={['srd-5.2']}
        onSetEnabledLibraries={onSet}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy()
    expect(screen.getByText('Content libraries')).toBeTruthy()

    fireEvent.click(screen.getByText('Tome of Beasts 3 (Kobold Press)'))
    expect(onSet).toHaveBeenCalledWith(['srd-5.2', 'kobold-press-tob3'])
  })

  it('never lets the user disable the last library', () => {
    const onSet = vi.fn()
    render(
      <SettingsPanel
        onClose={() => {}}
        enabledLibraries={['srd-5.2']}
        onSetEnabledLibraries={onSet}
      />,
    )
    // Unchecking the only enabled library is a no-op.
    fireEvent.click(screen.getByText('Core Rules 2024 (SRD 5.2.1)'))
    expect(onSet).not.toHaveBeenCalled()
  })
})
