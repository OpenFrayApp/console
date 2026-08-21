// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

// A null-safe wrapper over Fathom's trackEvent. Fathom is loaded from index.html and may
// be absent (blocked, not yet loaded, or ignored on localhost), so every call is guarded.
// Event names are static strings from EVENTS below — never interpolate user data, so no
// personal data ever reaches Fathom.

declare global {
  interface Window {
    fathom?: {
      trackEvent: (name: string, opts?: { _value?: number }) => void
      /**
       * Only `main.tsx` calls this, and only for `/s/` and `/p/`, where the automatic
       * pageview is turned off because the path carries an unlisted code. Optional for the
       * same reason `fathom` itself is: a blocked or half-loaded script is the normal case
       * to survive, not an error.
       */
      trackPageview?: (opts?: { url?: string; referrer?: string }) => void
    }
  }
}

/**
 * Every analytics event the console can emit — the single source of truth. The values are
 * the human-readable names shown in the Fathom dashboard.
 */
export const EVENTS = {
  // Combat lifecycle
  combatStarted: 'Combat started',
  combatStopped: 'Combat stopped',
  // Adding to the board
  creatureAdded: 'Creature added',
  pcAdded: 'PC added',
  quickAdded: 'Quick add',
  // Rolling and resolving
  attackRolled: 'Attack rolled',
  saveRolled: 'Save rolled',
  groupSaveRolled: 'Group save rolled',
  spellCast: 'Spell cast',
  manualRoll: 'Manual dice rolled',
  // Effects and resources
  effectApplied: 'Effect applied',
  presetStaged: 'Preset staged',
  presetSaved: 'Preset saved',
  concentrationStarted: 'Concentration started',
  legendaryResistanceUsed: 'Legendary Resistance used',
  reactionUsed: 'Reaction used',
  // Rests and clearing the board
  shortRest: 'Short rest',
  longRest: 'Long rest',
  clearedFoes: 'Cleared foes',
  clearedBoard: 'Cleared board',
  // Library and content creation
  customCreatureCreated: 'Custom creature created',
  customSpellCreated: 'Custom spell created',
  campaignCreated: 'Campaign created',
  characterCreated: 'Character created',
  creatureImported: 'Creature imported',
  // Account. Fathom events carry no properties, so the provider is part of the
  // name; the sign-in total is the two added together.
  signInDiscord: 'Sign-in started: Discord',
  signInGoogle: 'Sign-in started: Google',
  signedOut: 'Signed out',
  accountDeleted: 'Account deleted',
  // Navigation and settings
  compendiumOpened: 'Compendium opened',
  settingsOpened: 'Settings opened',
  ruleSetToggled: 'Rule set toggled',
  homebrewToggled: 'Homebrew toggled',
  librarySortChanged: 'Library sort changed',
  playerViewChanged: 'Player view setting changed',
  themeToggled: 'Theme toggled',
  keyboardShortcutUsed: 'Keyboard shortcut used',
  keybindingChanged: 'Keybinding changed',
  // Saved encounters
  encounterSaved: 'Encounter saved',
  encounterRestored: 'Encounter restored',
  encounterCastAdded: 'Encounter creatures added',
  encounterShared: 'Encounter shared',
  creatureShared: 'Creature shared',
  encounterLinkOpened: 'Shared encounter opened',
  encounterLinkAdded: 'Shared encounter added',
  shareReportOpened: 'Report form opened',
  shareReported: 'Encounter reported',
  // Sharing the board with the table
  playerViewShared: 'Player view shared',
  playerViewStopped: 'Player view stopped',
  playerViewNamed: 'Player view named',
  importerClicked: 'Importer clicked',
  docsOpened: 'Handbook opened',
  bookOpened: 'Book opened',
} as const

export type EventName = (typeof EVENTS)[keyof typeof EVENTS]

/** Record a Fathom event. Safe to call anywhere; a no-op when Fathom isn't available. */
export function track(event: EventName): void {
  try {
    window.fathom?.trackEvent(event)
  } catch {
    // Analytics must never break the app.
  }
}
