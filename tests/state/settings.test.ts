// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_PLAYER_VIEW, loadSettings, saveSettings } from '../../src/state/settings.ts'
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

  it('defaults the library sort to name and round-trips a change', () => {
    expect(loadSettings().librarySort).toBe('name')
    saveSettings({ librarySort: 'cr' })
    expect(loadSettings().librarySort).toBe('cr')
  })

  it('merges a saved preference without clobbering the others', () => {
    saveSettings({ enabledLibraries: ['srd-5.1'] })
    saveSettings({ librarySort: 'cr' })
    expect(loadSettings().enabledLibraries).toEqual(['srd-5.1'])
    expect(loadSettings().librarySort).toBe('cr')
  })
})

describe('player-view settings', () => {
  it('holds a creature to a wound word and keeps its armor class off the screen', () => {
    expect(loadSettings().playerView).toEqual(DEFAULT_PLAYER_VIEW)
  })

  it('round-trips what the GM chose', () => {
    const chosen = { ...DEFAULT_PLAYER_VIEW, hp: 'exact' as const, ac: 'shown' as const }
    saveSettings({ playerView: chosen })
    expect(loadSettings().playerView).toEqual(chosen)
  })

  // A stored value that isn't one of the three would otherwise reach playerBoard and
  // fall through its branches to "no hit points at all" — quiet, and the wrong quiet.
  it('falls back to the guarded default when a stored value is nonsense', () => {
    localStorage.setItem(
      'openfray-settings',
      JSON.stringify({ playerView: { hp: 'everything', ac: 'maybe' } }),
    )
    expect(loadSettings().playerView).toEqual(DEFAULT_PLAYER_VIEW)
  })

  it('only an explicit "shown" reveals armor class', () => {
    localStorage.setItem('openfray-settings', JSON.stringify({ playerView: { ac: 'Shown' } }))
    expect(loadSettings().playerView.ac).toBe('hidden')
  })

  it('starts the players` log fresh with each fight', () => {
    expect(loadSettings().playerView.log).toBe('fight')
  })

  it('keeps the whole session only when the GM asked for it', () => {
    localStorage.setItem('openfray-settings', JSON.stringify({ playerView: { log: 'everything' } }))
    expect(loadSettings().playerView.log).toBe('fight')
    saveSettings({ playerView: { ...DEFAULT_PLAYER_VIEW, log: 'session' } })
    expect(loadSettings().playerView.log).toBe('session')
  })

  it('has no share code until a GM shares for the first time', () => {
    expect(loadSettings().playerViewCode).toBeNull()
    saveSettings({ playerViewCode: 'abc123' })
    expect(loadSettings().playerViewCode).toBe('abc123')
  })
})
