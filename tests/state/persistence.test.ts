// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { recoverySnapshot } from '../fixtures/sessionSnapshot.ts'
import {
  clearSession,
  deleteRecoveryCopy,
  exportRecoveryCopy,
  listRecoveryCopies,
  loadSession,
  replaceSession,
  saveSession,
} from '../../src/state/persistence.ts'

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
    const value = recoverySnapshot('local', { theme: 'light', view: 'compendium' })
    expect(saveSession(value)).toEqual({ status: 'saved' })
    expect(loadSession()).toEqual({ status: 'loaded', snapshot: value })
    expect(JSON.parse(sessionStorage.getItem('openfray:session') ?? '{}')).toMatchObject({
      kind: 'session',
      schemaVersion: 3,
      payload: value,
    })
  })

  it('retains the last validated current copy as previous', () => {
    saveSession(recoverySnapshot('first'))
    saveSession(recoverySnapshot('second'))

    expect(exportRecoveryCopy('previous')?.serialized).toContain('"encounterId":"first"')
    expect(listRecoveryCopies()).toEqual([
      { slot: 'current', bytes: expect.any(Number), status: 'valid' },
      { slot: 'previous', bytes: expect.any(Number), status: 'valid' },
    ])
  })

  it('quarantines invalid current data and restores the previous validated copy', () => {
    const first = recoverySnapshot('first')
    saveSession(first)
    saveSession(recoverySnapshot('second'))
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
    expect(saveSession(recoverySnapshot())).toEqual({
      status: 'blocked',
      reason: 'unsupported',
    })
    expect(exportRecoveryCopy('current')).toEqual({
      slot: 'current',
      filename: 'openfray-session-current.json',
      serialized: future,
    })
  })

  it('archives a supported legacy value before rewriting it canonically', () => {
    const legacy = JSON.stringify({ version: 2, snapshot: recoverySnapshot() })
    sessionStorage.setItem('openfray:session', legacy)

    expect(loadSession()).toEqual({ status: 'loaded', snapshot: recoverySnapshot() })
    expect(exportRecoveryCopy('migrated')?.serialized).toBe(legacy)
    expect(exportRecoveryCopy('current')?.serialized).toContain('"schemaVersion":3')
  })

  it('allows explicit replacement and deletion of a future copy', () => {
    const future = '{"kind":"session","schemaVersion":999,"payload":{}}'
    sessionStorage.setItem('openfray:session', future)

    expect(replaceSession(recoverySnapshot())).toEqual({ status: 'saved' })
    expect(loadSession()).toEqual({ status: 'loaded', snapshot: recoverySnapshot() })
    expect(deleteRecoveryCopy('current')).toEqual({ status: 'deleted' })
    expect(loadSession()).toEqual({ status: 'empty', snapshot: null })
  })

  it('keeps the existing current and previous copies when a later write exceeds storage quota', () => {
    const first = recoverySnapshot('first')
    const second = recoverySnapshot('second')
    saveSession(first)
    saveSession(second)
    const original = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === 'openfray:session') throw new DOMException('full', 'QuotaExceededError')
      return original.call(this, key, value)
    })

    expect(saveSession(recoverySnapshot('third'))).toEqual({
      status: 'failed',
      reason: 'quota',
    })
    expect(loadSession()).toEqual({ status: 'loaded', snapshot: second })
    expect(exportRecoveryCopy('previous')?.serialized).toContain('"encounterId":"first"')
  })

  it('clearSession removes every recovery copy', () => {
    saveSession(recoverySnapshot())
    sessionStorage.setItem('openfray:session:quarantine', 'invalid')
    expect(clearSession()).toEqual({ status: 'deleted' })
    expect(listRecoveryCopies()).toEqual([])
  })
})
