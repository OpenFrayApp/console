// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SettingsPanel } from '../../src/components/SettingsPanel.tsx'
import { DEFAULT_PLAYER_VIEW, type PlayerViewSettings } from '../../src/state/settings.ts'

afterEach(cleanup)

function renderPanel(
  over: {
    enabledLibraries?: string[]
    showHomebrew?: boolean
    librarySort?: 'name' | 'cr'
    playerView?: PlayerViewSettings
  } = {},
) {
  const onSetEnabledLibraries = vi.fn()
  const onSetShowHomebrew = vi.fn()
  const onSetLibrarySort = vi.fn()
  const onSetPlayerView = vi.fn()
  render(
    <SettingsPanel
      onClose={() => {}}
      enabledLibraries={over.enabledLibraries ?? ['srd-5.2']}
      onSetEnabledLibraries={onSetEnabledLibraries}
      showHomebrew={over.showHomebrew ?? true}
      onSetShowHomebrew={onSetShowHomebrew}
      librarySort={over.librarySort ?? 'name'}
      onSetLibrarySort={onSetLibrarySort}
      playerView={over.playerView ?? DEFAULT_PLAYER_VIEW}
      onSetPlayerView={onSetPlayerView}
    />,
  )
  return { onSetEnabledLibraries, onSetShowHomebrew, onSetLibrarySort, onSetPlayerView }
}

/** Open one of the settings tabs by its label. */
const openTab = (label: string) => fireEvent.click(screen.getByRole('tab', { name: label }))

describe('SettingsPanel — the player view', () => {
  it('shows a creature`s rolls by default', () => {
    renderPanel()
    openTab('Player view')
    expect((screen.getByLabelText('Creature rolls') as HTMLSelectElement).value).toBe('shown')
  })

  it('hands the choice back without disturbing the others', () => {
    const { onSetPlayerView } = renderPanel()
    openTab('Player view')
    fireEvent.change(screen.getByLabelText('Creature rolls'), { target: { value: 'hidden' } })
    expect(onSetPlayerView).toHaveBeenCalledWith({ ...DEFAULT_PLAYER_VIEW, rolls: 'hidden' })
  })

  it('says what hiding them keeps', () => {
    renderPanel()
    openTab('Player view')
    expect(screen.getByText(/keeps whether it hit or saved/)).toBeInTheDocument()
  })

  it('starts the players` log fresh each fight, and shares the summary', () => {
    renderPanel()
    openTab('Player view')
    expect((screen.getByLabelText('Game log') as HTMLSelectElement).value).toBe('fight')
    expect((screen.getByLabelText('End-of-fight summary') as HTMLSelectElement).value).toBe('shown')
  })

  it('hides a creature`s conditions when asked', () => {
    const { onSetPlayerView } = renderPanel()
    openTab('Player view')
    fireEvent.change(screen.getByLabelText('Creature conditions'), { target: { value: 'hidden' } })
    expect(onSetPlayerView).toHaveBeenCalledWith({ ...DEFAULT_PLAYER_VIEW, effects: 'hidden' })
  })

  it('holds mid-fight arrivals back when asked', () => {
    const { onSetPlayerView } = renderPanel()
    openTab('Player view')
    expect((screen.getByLabelText('Creatures arriving mid-fight') as HTMLSelectElement).value).toBe(
      'shown',
    )
    fireEvent.change(screen.getByLabelText('Creatures arriving mid-fight'), {
      target: { value: 'hidden' },
    })
    expect(onSetPlayerView).toHaveBeenCalledWith({ ...DEFAULT_PLAYER_VIEW, arrivals: 'hidden' })
  })

  it('hands back a whole-session log and a hidden summary', () => {
    const { onSetPlayerView } = renderPanel()
    openTab('Player view')
    fireEvent.change(screen.getByLabelText('Game log'), { target: { value: 'session' } })
    expect(onSetPlayerView).toHaveBeenCalledWith({ ...DEFAULT_PLAYER_VIEW, log: 'session' })
    fireEvent.change(screen.getByLabelText('End-of-fight summary'), {
      target: { value: 'hidden' },
    })
    expect(onSetPlayerView).toHaveBeenCalledWith({ ...DEFAULT_PLAYER_VIEW, recap: 'hidden' })
  })
})

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

  it('changes the library sort to CR / level', () => {
    const { onSetLibrarySort } = renderPanel()
    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'cr' } })
    expect(onSetLibrarySort).toHaveBeenCalledWith('cr')
  })

  it('links to the importer extension on the Chrome Web Store', () => {
    renderPanel()
    openTab('Importer')
    const link = screen.getByRole('link', { name: /Get it for Chrome/ })
    expect(link.getAttribute('href')).toContain(
      'chromewebstore.google.com/detail/openfray-importer/',
    )
    expect(link.getAttribute('target')).toBe('_blank')
  })

  // The settings outgrew one scroll, so each area is a tab; Libraries is what opens.
  it('opens on Libraries and shows one area at a time', () => {
    renderPanel()
    expect(screen.getByRole('tab', { name: 'Libraries' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('Sort by')).toBeVisible()
    expect(screen.getByLabelText('Creature hit points')).not.toBeVisible()

    openTab('Player view')
    expect(screen.getByLabelText('Creature hit points')).toBeVisible()
    expect(screen.getByLabelText('Sort by')).not.toBeVisible()
    expect(screen.getByRole('tab', { name: 'Libraries' })).toHaveAttribute('aria-selected', 'false')
  })
})
