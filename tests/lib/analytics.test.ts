// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { afterEach, describe, expect, it, vi } from 'vitest'
import { EVENTS, track } from '../../src/lib/analytics.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('track', () => {
  it('forwards the event name to fathom.trackEvent when Fathom is loaded', () => {
    const trackEvent = vi.fn()
    vi.stubGlobal('window', { fathom: { trackEvent } })
    track(EVENTS.combatStarted)
    expect(trackEvent).toHaveBeenCalledTimes(1)
    expect(trackEvent).toHaveBeenCalledWith('Combat started')
  })

  it('no-ops when Fathom is absent (blocked or not yet loaded)', () => {
    vi.stubGlobal('window', {})
    expect(() => track(EVENTS.combatStarted)).not.toThrow()
  })

  it('no-ops when there is no window at all', () => {
    expect(() => track(EVENTS.themeToggled)).not.toThrow()
  })

  it('swallows a throwing Fathom rather than breaking the app', () => {
    vi.stubGlobal('window', {
      fathom: {
        trackEvent: () => {
          throw new Error('fathom exploded')
        },
      },
    })
    expect(() => track(EVENTS.combatStarted)).not.toThrow()
  })
})

describe('EVENTS', () => {
  // The values are the names on the Fathom dashboard — renaming one silently forks
  // its event history, so a rename must be deliberate enough to update this pin.
  it('keeps the dashboard event names stable', () => {
    expect(EVENTS).toEqual({
      combatStarted: 'Combat started',
      combatStopped: 'Combat stopped',
      creatureAdded: 'Creature added',
      pcAdded: 'PC added',
      quickAdded: 'Quick add',
      attackRolled: 'Attack rolled',
      saveRolled: 'Save rolled',
      groupSaveRolled: 'Group save rolled',
      spellCast: 'Spell cast',
      manualRoll: 'Manual dice rolled',
      effectApplied: 'Effect applied',
      concentrationStarted: 'Concentration started',
      legendaryResistanceUsed: 'Legendary Resistance used',
      reactionUsed: 'Reaction used',
      shortRest: 'Short rest',
      longRest: 'Long rest',
      clearedFoes: 'Cleared foes',
      clearedBoard: 'Cleared board',
      customCreatureCreated: 'Custom creature created',
      customSpellCreated: 'Custom spell created',
      campaignCreated: 'Campaign created',
      characterCreated: 'Character created',
      creatureImported: 'Creature imported',
      signInStarted: 'Sign-in started',
      signedOut: 'Signed out',
      accountDeleted: 'Account deleted',
      compendiumOpened: 'Compendium opened',
      settingsOpened: 'Settings opened',
      ruleSetToggled: 'Rule set toggled',
      homebrewToggled: 'Homebrew toggled',
      librarySortChanged: 'Library sort changed',
      themeToggled: 'Theme toggled',
      importerClicked: 'Importer clicked',
    })
  })

  it('never reuses a dashboard name across two events', () => {
    const names = Object.values(EVENTS)
    expect(new Set(names).size).toBe(names.length)
  })
})
