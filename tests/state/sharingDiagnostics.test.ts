// @vitest-environment jsdom
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  clearSharingDiagnostics,
  recordSharingDiagnostic,
  recordSharingResult,
  sharingDiagnosticsAllowed,
  sharingDiagnosticsEnabled,
  sharingDiagnosticsReport,
} from '../../src/state/sharingDiagnostics.ts'

vi.mock('../../src/lib/supabase.ts', () => ({
  supabase: { realtime: { connectionState: () => 'open' } },
}))

beforeEach(() => {
  vi.useFakeTimers()
  history.replaceState(null, '', '/?sharingDiagnostics=1')
  clearSharingDiagnostics()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
  history.replaceState(null, '', '/')
  clearSharingDiagnostics()
})

it('requires explicit opt-in and blocks production even when the query flag is set', () => {
  history.replaceState(null, '', '/')
  recordSharingDiagnostic({ event: 'heartbeat-tick', role: 'gm' })
  expect(sharingDiagnosticsEnabled()).toBe(false)
  expect(sharingDiagnosticsReport()).toBe('')
  history.replaceState(null, '', '/?sharingDiagnostics=1')
  expect(JSON.parse(sharingDiagnosticsReport()).events).toEqual([])
  expect(sharingDiagnosticsAllowed('develop.openfray.pages.dev', false)).toBe(true)
  expect(sharingDiagnosticsAllowed('localhost', false)).toBe(false)
  expect(sharingDiagnosticsAllowed('openfray.app', true)).toBe(false)
  expect(sharingDiagnosticsAllowed('other.openfray.pages.dev', true)).toBe(false)
  vi.stubGlobal('window', {
    location: { hostname: 'openfray.app', search: '?sharingDiagnostics=1' },
  })
  recordSharingDiagnostic({ event: 'heartbeat-tick', role: 'gm' })
  expect(sharingDiagnosticsEnabled()).toBe(false)
  expect(sharingDiagnosticsReport()).toBe('')
})

it('records delayed hidden-tab heartbeats using monotonic gaps', () => {
  recordSharingDiagnostic({ event: 'heartbeat-tick', role: 'gm' })
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  vi.setSystemTime(Date.now() + 60_000)
  vi.advanceTimersByTime(45_000)
  recordSharingDiagnostic({ event: 'heartbeat-tick', role: 'gm' })
  const report = JSON.parse(sharingDiagnosticsReport())
  expect(report.events[1]).toMatchObject({
    event: 'heartbeat-tick',
    role: 'gm',
    gapMs: 45_000,
    visibility: 'hidden',
    socket: 'open',
  })
})

it('drops payloads, identifiers, raw errors, and arbitrary status strings', async () => {
  const input = {
    event: 'send-result' as const,
    role: 'gm' as const,
    status: 'SECRET-status',
    messageType: 'SECRET-creature',
    sequence: NaN,
    ageMs: Infinity,
    payload: { name: 'SECRET-board' },
    senderId: 'SECRET-sender',
    ownerId: 'SECRET-owner',
    capability: 'SECRET-capability',
    pin: 'SECRET-pin',
    url: 'SECRET-url',
    error: new Error('SECRET-error'),
  }
  recordSharingDiagnostic(input)
  recordSharingResult(Promise.reject(new Error('SECRET-auth')), {
    event: 'send-result',
    role: 'gm',
  })
  await Promise.resolve()
  const serialized = sharingDiagnosticsReport()
  expect(serialized).not.toContain('SECRET')
  const report = JSON.parse(serialized)
  expect(report.events[0]).toEqual({
    event: 'send-result',
    role: 'gm',
    atMs: 0,
    visibility: 'visible',
    online: true,
    socket: 'open',
  })
  expect(report.events[1]).toMatchObject({ event: 'send-result', status: 'rejected' })
})

it('bounds capture to the last 300 metadata events', () => {
  for (let index = 0; index < 350; index += 1) {
    recordSharingDiagnostic({
      event: 'send-attempt',
      role: 'gm',
      messageType: 'board',
      sequence: index,
    })
  }
  const report = JSON.parse(sharingDiagnosticsReport())
  expect(report.events).toHaveLength(300)
  expect(report.events[0].sequence).toBe(50)
  expect(report.droppedEvents).toBe(50)
  clearSharingDiagnostics()
  expect(JSON.parse(sharingDiagnosticsReport()).events).toEqual([])
})
