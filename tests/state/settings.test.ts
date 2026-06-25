// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadSettings, saveSettings } from '../../src/state/settings.ts'
import { DEFAULT_ENABLED_LIBRARIES } from '../../src/compendium/libraries.ts'

beforeEach(() => localStorage.clear())
afterEach(() => localStorage.clear())

describe('app settings (localStorage)', () => {
  it('falls back to the default libraries when nothing is stored', () => {
    expect(loadSettings().enabledLibraries).toEqual(DEFAULT_ENABLED_LIBRARIES)
  })

  it('round-trips a saved selection across loads', () => {
    saveSettings({ enabledLibraries: ['srd-5.2', 'kobold-press-tob3'] })
    expect(loadSettings().enabledLibraries).toEqual(['srd-5.2', 'kobold-press-tob3'])
  })

  it('sanitizes a stored selection, dropping unknown ids', () => {
    localStorage.setItem(
      'openfray-settings',
      JSON.stringify({ enabledLibraries: ['srd-5.1', 'bogus'] }),
    )
    expect(loadSettings().enabledLibraries).toEqual(['srd-5.1'])
  })

  it('falls back when the stored value is malformed', () => {
    localStorage.setItem('openfray-settings', 'not json')
    expect(loadSettings().enabledLibraries).toEqual(DEFAULT_ENABLED_LIBRARIES)
  })
})
