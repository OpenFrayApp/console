// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, expect, it, vi } from 'vitest'
import { rememberLiveView, loadLiveView, forgetLiveView } from '../../src/state/liveViewRecovery.ts'

const active = {
  status: 'ok' as const,
  capability: 'a'.repeat(43),
  capabilityHash: 'b'.repeat(64),
  generation: 1,
}

afterEach(() => {
  sessionStorage.clear()
  vi.restoreAllMocks()
})

it('keeps the capability tab-local and scopes recovery to the owner, encounter, and code', () => {
  rememberLiveView('owner', 'encounter', 'table', active)
  expect(loadLiveView('owner', 'encounter', 'table')).toEqual(active)
  expect(loadLiveView('other', 'encounter', 'table')).toBeNull()
  expect(loadLiveView('owner', 'other', 'table')).toBeNull()
  expect(loadLiveView('owner', 'encounter', 'other')).toBeNull()
  expect(localStorage.length).toBe(0)
  forgetLiveView()
  expect(loadLiveView('owner', 'encounter', 'table')).toBeNull()
})

it('ignores corrupt or incomplete session records', () => {
  for (const value of [
    '{',
    'null',
    '{}',
    JSON.stringify({
      ownerId: 'owner',
      encounterId: 'encounter',
      code: 'table',
      active: { ...active, generation: -1 },
    }),
  ]) {
    sessionStorage.setItem('openfray:live-view', value)
    expect(loadLiveView('owner', 'encounter', 'table')).toBeNull()
  }
})

it('keeps live sharing usable when tab storage is blocked', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  expect(() => rememberLiveView('owner', 'encounter', 'table', active)).not.toThrow()
  expect(loadLiveView('owner', 'encounter', 'table')).toBeNull()
  expect(() => forgetLiveView()).not.toThrow()
})
