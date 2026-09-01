// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  CURRENT_SESSION_SCHEMA_VERSION,
  MAX_SESSION_BYTES,
  decodeSession,
  encodeSession,
} from '../../src/codecs/session.ts'
import type { SessionSnapshot } from '../../src/state/persistence.ts'

/** Read one canonical hardening fixture as parsed JSON. */
function fixture<T>(name: string): T {
  return JSON.parse(
    readFileSync(new URL(`../fixtures/hardening/${name}`, import.meta.url), 'utf8'),
  ) as T
}

/** Build the smallest valid session used at the codec boundary. */
function snapshot(): SessionSnapshot {
  return {
    encounter: {
      encounterId: 'fixture',
      ownerId: null,
      round: 0,
      activeIndex: 0,
      combatants: [],
      log: [],
    },
    theme: 'dark',
    view: 'encounter',
    selectedId: null,
  }
}

describe('session codec', () => {
  it('encodes only the canonical envelope and strips unknown fields on decode', () => {
    const encoded = encodeSession(snapshot())
    expect(encoded.status).toBe('ok')
    if (encoded.status !== 'ok') return

    expect(JSON.parse(encoded.serialized)).toEqual({
      kind: 'session',
      schemaVersion: CURRENT_SESSION_SCHEMA_VERSION,
      payload: snapshot(),
    })

    const withUnknown = JSON.stringify({
      ...JSON.parse(encoded.serialized),
      unknownEnvelope: true,
      payload: { ...snapshot(), unknownPayload: true },
    })
    const decoded = decodeSession(withUnknown)
    expect(decoded.status).toBe('ok')
    if (decoded.status !== 'ok') return
    expect(decoded.snapshot).toEqual(snapshot())
    expect(decoded.canonical).toBe(encoded.serialized)
  })

  it('migrates v2 deterministically to the current envelope', () => {
    const legacy = JSON.stringify({ version: 2, snapshot: snapshot() })
    const first = decodeSession(legacy)
    const second = decodeSession(legacy)

    expect(first).toEqual(second)
    expect(first.status).toBe('ok')
    if (first.status !== 'ok') return
    expect(first.migratedFrom).toBe(2)
    expect(decodeSession(first.canonical)).toEqual({
      status: 'ok',
      snapshot: snapshot(),
      canonical: first.canonical,
    })
  })

  it('migrates the historical newest-first v1 roll log without dropping dice data', () => {
    const legacy = JSON.stringify({
      version: 1,
      snapshot: {
        ...snapshot(),
        encounter: {
          ...snapshot().encounter,
          round: 3,
          log: [{ id: 'event', round: 2, message: 'Goblin moved' }],
        },
        rollLog: [
          { id: 'newer', label: 'Newer roll' },
          {
            id: 'older',
            label: 'Older roll',
            result: {
              formula: '1d20',
              kind: 'attack',
              dice: [{ sides: 20, sign: 1, results: [20], kept: [20], total: 20 }],
              modifier: 0,
              total: 20,
              crit: true,
              fumble: false,
              advantageState: 'normal',
            },
            applied: [{ source: 'Bless', effect: '+1d4' }],
          },
        ],
      },
    })

    const decoded = decodeSession(legacy)
    expect(decoded).toEqual(decodeSession(legacy))
    expect(decoded.status).toBe('ok')
    if (decoded.status !== 'ok') return
    expect(decoded.migratedFrom).toBe(1)
    expect(decodeSession(decoded.canonical)).toEqual({
      status: 'ok',
      snapshot: decoded.snapshot,
      canonical: decoded.canonical,
    })
    expect(decoded.snapshot.encounter.log).toEqual([
      { id: 'event', round: 2, category: 'note', message: 'Goblin moved' },
      {
        id: 'older',
        round: 3,
        category: 'roll',
        message: 'Older roll',
        result: {
          formula: '1d20',
          kind: 'attack',
          dice: [
            {
              sides: 20,
              sign: 1,
              results: [20],
              kept: [20],
              total: 20,
              multiplier: 1,
              naturalHigh: true,
              naturalLow: false,
            },
          ],
          modifier: 0,
          modifiers: [],
          total: 20,
          crit: true,
          fumble: false,
          advantageState: 'normal',
        },
        applied: [{ source: 'Bless', effect: '+1d4' }],
      },
      { id: 'newer', round: 3, category: 'roll', message: 'Newer roll' },
    ])
  })

  it('rejects unknown nested gameplay fields instead of silently dropping them', () => {
    const encoded = encodeSession(snapshot())
    expect(encoded.status).toBe('ok')
    if (encoded.status !== 'ok') return
    const envelope = JSON.parse(encoded.serialized) as {
      payload: { encounter: Record<string, unknown> }
    }
    envelope.payload.encounter.futureGameplayField = { authored: true }

    expect(decodeSession(JSON.stringify(envelope))).toMatchObject({
      status: 'invalid',
      reason: 'payload',
    })
  })

  it('rejects non-finite JSON numbers before canonicalization can change them', () => {
    const raw = `{"kind":"session","schemaVersion":${CURRENT_SESSION_SCHEMA_VERSION},"payload":{"encounter":{"encounterId":"fixture","ownerId":null,"round":1e400,"activeIndex":0,"combatants":[],"log":[]},"theme":"dark","view":"encounter","selectedId":null}}`
    expect(decodeSession(raw)).toMatchObject({ status: 'invalid', reason: 'payload' })
  })

  it('rejects deeply nested input within the byte bound without recursive traversal', () => {
    const raw = `{"kind":"session","schemaVersion":${CURRENT_SESSION_SCHEMA_VERSION},"payload":${'{"x":'.repeat(101)}null${'}'.repeat(101)}}`
    expect(decodeSession(raw)).toEqual({ status: 'invalid', reason: 'envelope' })
  })

  it('rejects one malformed gameplay child instead of partially loading the aggregate', () => {
    const malformed = JSON.stringify({
      kind: 'session',
      schemaVersion: CURRENT_SESSION_SCHEMA_VERSION,
      payload: {
        ...snapshot(),
        encounter: { ...snapshot().encounter, combatants: [null] },
      },
    })
    expect(decodeSession(malformed)).toMatchObject({ status: 'invalid', reason: 'payload' })
  })

  it('preserves future versions as unsupported outcomes', () => {
    const future = JSON.stringify({ kind: 'session', schemaVersion: 999, payload: snapshot() })
    expect(decodeSession(future)).toEqual({ status: 'unsupported', schemaVersion: 999 })
  })

  it('rejects UTF-8 input beyond the byte limit', () => {
    const oversized = 'é'.repeat(Math.floor(MAX_SESSION_BYTES / 2) + 1)
    expect(decodeSession(oversized)).toEqual({ status: 'invalid', reason: 'too-large' })
  })

  it('migrates the canonical historical v1 fixture', () => {
    const legacy = fixture<{ cases: { id: string; input: unknown }[] }>('legacy.json')
    const stored = legacy.cases.find((entry) => entry.id === 'session-envelope-v1')?.input
    const decoded = decodeSession(JSON.stringify(stored))

    expect(decoded.status).toBe('ok')
    if (decoded.status !== 'ok') return
    expect(decoded.migratedFrom).toBe(1)
    expect(decoded.snapshot.encounter.log[0]).toMatchObject({
      id: 'synthetic-legacy-roll',
      category: 'roll',
      result: { total: 17, modifiers: [3] },
    })
  })

  it.each(['performance-20.json', 'performance-100.json'])(
    'keeps the canonical %s aggregate within the codec bound',
    (name) => {
      const performance = fixture<{ encounter: SessionSnapshot['encounter'] }>(name)
      const result = encodeSession({ ...snapshot(), encounter: performance.encounter })
      expect(result.status).toBe('ok')
      if (result.status === 'ok')
        expect(new TextEncoder().encode(result.serialized).byteLength).toBeLessThanOrEqual(
          MAX_SESSION_BYTES,
        )
    },
  )

  it('does not allow prototype-pollution keys through canonical decoding', () => {
    const raw = `{"kind":"session","schemaVersion":${CURRENT_SESSION_SCHEMA_VERSION},"payload":{"encounter":{"encounterId":"fixture","ownerId":null,"round":0,"activeIndex":0,"combatants":[],"log":[],"constructor":{"prototype":{"polluted":true}}},"theme":"dark","view":"encounter","selectedId":null},"__proto__":{"polluted":true}}`
    const decoded = decodeSession(raw)
    expect(decoded).toEqual({ status: 'invalid', reason: 'envelope' })
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined()
  })
})
