// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import type { Encounter } from '../../src/schema/encounter.ts'
import {
  clearSession,
  loadSession,
  saveSession,
  type SessionSnapshot,
} from '../../src/state/persistence.ts'

function encounter(combatantIds: string[] = []): Encounter {
  return {
    encounterId: 'local',
    ownerId: null,
    round: 0,
    activeIndex: 0,
    combatants: combatantIds.map(
      (id) =>
        ({
          isPC: false,
          combatantId: id,
          creatureId: 'srd:goblin',
          label: id,
          initiative: 0,
        }) as never,
    ),
    log: [],
  }
}

function snapshot(overrides: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    encounter: encounter(),
    rollLog: [],
    theme: 'dark',
    view: 'encounter',
    selectedId: null,
    ...overrides,
  }
}

describe('session persistence', () => {
  beforeEach(() => {
    clearSession()
  })

  it('returns null when nothing has been saved', () => {
    expect(loadSession()).toBeNull()
  })

  it('round-trips a saved snapshot', () => {
    const snap = snapshot({
      theme: 'light',
      view: 'compendium',
      rollLog: [{ id: 'r1', label: 'Goblin: initiative' }],
    })
    saveSession(snap)
    expect(loadSession()).toEqual(snap)
  })

  it('returns null when the stored version does not match', () => {
    sessionStorage.setItem(
      'openfray:session',
      JSON.stringify({ version: 999, snapshot: snapshot() }),
    )
    expect(loadSession()).toBeNull()
  })

  it('returns null for a malformed blob instead of throwing', () => {
    sessionStorage.setItem('openfray:session', '{ not json')
    expect(loadSession()).toBeNull()
  })

  it('drops a selectedId that no longer matches a combatant', () => {
    saveSession(snapshot({ encounter: encounter(['a', 'b']), selectedId: 'gone' }))
    expect(loadSession()?.selectedId).toBeNull()
  })

  it('keeps a selectedId that still matches a combatant', () => {
    saveSession(snapshot({ encounter: encounter(['a', 'b']), selectedId: 'b' }))
    expect(loadSession()?.selectedId).toBe('b')
  })

  it('clearSession removes the saved snapshot', () => {
    saveSession(snapshot())
    clearSession()
    expect(loadSession()).toBeNull()
  })
})
