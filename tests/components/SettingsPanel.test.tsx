// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SettingsPanel } from '../../src/components/SettingsPanel.tsx'

afterEach(cleanup)

function renderPanel(over: { enabledLibraries?: string[]; showHomebrew?: boolean } = {}) {
  const onSetEnabledLibraries = vi.fn()
  const onSetShowHomebrew = vi.fn()
  render(
    <SettingsPanel
      onClose={() => {}}
      enabledLibraries={over.enabledLibraries ?? ['srd-5.2']}
      onSetEnabledLibraries={onSetEnabledLibraries}
      showHomebrew={over.showHomebrew ?? true}
      onSetShowHomebrew={onSetShowHomebrew}
    />,
  )
  return { onSetEnabledLibraries, onSetShowHomebrew }
}

describe('SettingsPanel', () => {
  it('groups the rule sets under Core / OpenFray / Other and toggles one on', () => {
    const { onSetEnabledLibraries } = renderPanel()
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy()
    expect(screen.getByText('Libraries')).toBeTruthy()
    for (const group of ['Core', 'OpenFray', 'Other']) {
      expect(screen.getByRole('heading', { name: group })).toBeTruthy()
    }

    fireEvent.click(screen.getByText('Tome of Beasts 3 (Kobold Press)'))
    expect(onSetEnabledLibraries).toHaveBeenCalledWith(['srd-5.2', 'kobold-press-tob3'])
  })

  it('never lets the user disable the last library', () => {
    const { onSetEnabledLibraries } = renderPanel()
    fireEvent.click(screen.getByText('Basic Rules 2024 (SRD 5.2.1)'))
    expect(onSetEnabledLibraries).not.toHaveBeenCalled()
  })

  it('lists homebrew under Other, on by default, and toggles it off', () => {
    const { onSetShowHomebrew } = renderPanel({ showHomebrew: true })
    const label = screen.getByText('Homebrew creations').closest('label')!
    const checkbox = label.querySelector('input[type=checkbox]') as HTMLInputElement
    expect(checkbox.checked).toBe(true)

    fireEvent.click(screen.getByText('Homebrew creations'))
    expect(onSetShowHomebrew).toHaveBeenCalledWith(false)
  })

  it('links to the importer extension on the Chrome Web Store', () => {
    renderPanel()
    const link = screen.getByRole('link', { name: /Get it for Chrome/ })
    expect(link.getAttribute('href')).toContain(
      'chromewebstore.google.com/detail/openfray-importer/',
    )
    expect(link.getAttribute('target')).toBe('_blank')
  })
})
