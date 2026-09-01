// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Encounter } from '../../src/schema/encounter.ts'
import {
  clearSession,
  deleteRecoveryCopy,
  exportRecoveryCopy,
  listRecoveryCopies,
  loadSession,
  replaceSession,
  saveSession,
  type SessionSnapshot,
} from '../../src/state/persistence.ts'

/** Build a valid encounter for the browser-storage boundary. */
function encounter(id = 'local'): Encounter {
  return {
    encounterId: id,
    ownerId: null,
    round: 0,
    activeIndex: 0,
    combatants: [],
    log: [],
  }
}

/** Build a valid recovery snapshot. */
function snapshot(overrides: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    encounter: encounter(),
    theme: 'dark',
    view: 'encounter',
    selectedId: null,
    ...overrides,
  }
}

describe('session persistence', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns an empty result when nothing has been saved', () => {
    expect(loadSession()).toEqual({ status: 'empty', snapshot: null })
  })

  it('round-trips a canonical saved snapshot', () => {
    const value = snapshot({ theme: 'light', view: 'compendium' })
    expect(saveSession(value)).toEqual({ status: 'saved' })
    expect(loadSession()).toEqual({ status: 'loaded', snapshot: value })
    expect(JSON.parse(sessionStorage.getItem('openfray:session') ?? '{}')).toMatchObject({
      kind: 'session',
      schemaVersion: 3,
      payload: value,
    })
  })

  it('retains the last validated current copy as previous', () => {
    saveSession(snapshot({ encounter: encounter('first') }))
    saveSession(snapshot({ encounter: encounter('second') }))

    expect(exportRecoveryCopy('previous')?.serialized).toContain('"encounterId":"first"')
    expect(listRecoveryCopies()).toEqual([
      { slot: 'current', bytes: expect.any(Number), status: 'valid' },
      { slot: 'previous', bytes: expect.any(Number), status: 'valid' },
    ])
  })

  it('quarantines invalid current data and restores the previous validated copy', () => {
    const first = snapshot({ encounter: encounter('first') })
    saveSession(first)
    saveSession(snapshot({ encounter: encounter('second') }))
    const malformed = '{ not json'
    sessionStorage.setItem('openfray:session', malformed)

    expect(loadSession()).toEqual({ status: 'recovered', snapshot: first, blockedBy: 'invalid' })
    expect(exportRecoveryCopy('current')?.serialized).toBe(malformed)
    expect(exportRecoveryCopy('quarantine')?.serialized).toBe(malformed)
  })

  it('does not overwrite an earlier quarantined value', () => {
    sessionStorage.setItem('openfray:session:quarantine', 'earlier invalid value')
    sessionStorage.setItem('openfray:session', '{ later invalid value')
    loadSession()
    expect(exportRecoveryCopy('quarantine')?.serialized).toBe('earlier invalid value')
  })

  it('preserves future data byte-for-byte and blocks ordinary autosave', () => {
    const future = '{"kind":"session","schemaVersion":999,"payload":{"future":true}}'
    sessionStorage.setItem('openfray:session', future)

    expect(loadSession()).toEqual({ status: 'blocked', snapshot: null, blockedBy: 'unsupported' })
    expect(saveSession(snapshot())).toEqual({ status: 'blocked', reason: 'unsupported' })
    expect(exportRecoveryCopy('current')).toEqual({
      slot: 'current',
      filename: 'openfray-session-current.json',
      serialized: future,
    })
  })

  it('archives a supported legacy value before rewriting it canonically', () => {
    const legacy = JSON.stringify({ version: 2, snapshot: snapshot() })
    sessionStorage.setItem('openfray:session', legacy)

    expect(loadSession()).toEqual({ status: 'loaded', snapshot: snapshot() })
    expect(exportRecoveryCopy('migrated')?.serialized).toBe(legacy)
    expect(exportRecoveryCopy('current')?.serialized).toContain('"schemaVersion":3')
  })

  it('allows explicit replacement and deletion of a future copy', () => {
    const future = '{"kind":"session","schemaVersion":999,"payload":{}}'
    sessionStorage.setItem('openfray:session', future)

    expect(replaceSession(snapshot())).toEqual({ status: 'saved' })
    expect(loadSession()).toEqual({ status: 'loaded', snapshot: snapshot() })
    expect(deleteRecoveryCopy('current')).toEqual({ status: 'deleted' })
    expect(loadSession()).toEqual({ status: 'empty', snapshot: null })
  })

  it('keeps the existing current and previous copies when a later write exceeds storage quota', () => {
    const first = snapshot({ encounter: encounter('first') })
    const second = snapshot({ encounter: encounter('second') })
    saveSession(first)
    saveSession(second)
    const original = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === 'openfray:session') throw new DOMException('full', 'QuotaExceededError')
      return original.call(this, key, value)
    })

    expect(saveSession(snapshot({ encounter: encounter('third') }))).toEqual({
      status: 'failed',
      reason: 'quota',
    })
    expect(loadSession()).toEqual({ status: 'loaded', snapshot: second })
    expect(exportRecoveryCopy('previous')?.serialized).toContain('"encounterId":"first"')
  })

  it('clearSession removes every recovery copy', () => {
    saveSession(snapshot())
    sessionStorage.setItem('openfray:session:quarantine', 'invalid')
    expect(clearSession()).toEqual({ status: 'deleted' })
    expect(listRecoveryCopies()).toEqual([])
  })
})
