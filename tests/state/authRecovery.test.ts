// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, expect, it } from 'vitest'
import { encodeSession } from '../../src/codecs/session.ts'
import {
  loadAuthRecovery,
  loadAuthRecoveryConflict,
  saveAuthRecovery,
  saveAuthRecoveryConflict,
} from '../../src/state/authRecovery.ts'
import type { ReconciliationConflict } from '../../src/state/encounterLifecycle.ts'
import { recoverySnapshot as snapshot } from '../fixtures/sessionSnapshot.ts'

afterEach(() => sessionStorage.clear())

/** Build the three independent branches protected during anonymous identity renewal. */
function conflict(): ReconciliationConflict {
  return {
    id: 'renewal-copies',
    anonymous: true,
    device: { snapshot: snapshot('anonymous-board'), activeAt: '2026-09-02T10:11:12.000Z' },
    cloud: { snapshot: snapshot('cloud-board'), activeAt: '2026-09-02T10:10:12.000Z', revision: 8 },
    ownerRecovery: { snapshot: snapshot('unsynced-owner'), activeAt: '2026-09-02T10:09:12.000Z' },
  }
}

it('reads legacy session-only handoffs and preserves every branch when later anonymous actions update the new envelope', () => {
  const legacy = encodeSession(snapshot('legacy-anonymous'))
  if (legacy.status !== 'ok') throw new Error('Invalid fixture')
  sessionStorage.setItem('openfray:auth-recovery', legacy.serialized)
  expect(loadAuthRecovery().snapshot?.encounter.encounterId).toBe('legacy-anonymous')
  expect(saveAuthRecoveryConflict('original-owner', conflict()).status).toBe('saved')
  expect(saveAuthRecovery(snapshot('latest-anonymous')).status).toBe('saved')
  expect(loadAuthRecovery().snapshot?.encounter.encounterId).toBe('latest-anonymous')
  const retained = loadAuthRecoveryConflict('original-owner')
  expect(retained?.device.snapshot.encounter.encounterId).toBe('latest-anonymous')
  expect(retained?.cloud.snapshot.encounter.encounterId).toBe('cloud-board')
  expect(retained?.ownerRecovery?.snapshot.encounter.encounterId).toBe('unsynced-owner')
  expect(loadAuthRecoveryConflict('wrong-owner')).toBeNull()
})

it('preserves unsupported recovery envelopes instead of downgrading or erasing them', () => {
  expect(saveAuthRecoveryConflict('original-owner', conflict()).status).toBe('saved')
  const future = JSON.parse(sessionStorage.getItem('openfray:auth-recovery')!)
  future.schemaVersion = 2
  const raw = JSON.stringify(future)
  sessionStorage.setItem('openfray:auth-recovery', raw)
  expect(loadAuthRecovery()).toEqual({
    status: 'blocked',
    snapshot: null,
    blockedBy: 'unsupported',
  })
  expect(saveAuthRecovery(snapshot('replacement'))).toEqual({
    status: 'blocked',
    reason: 'unsupported',
  })
  expect(sessionStorage.getItem('openfray:auth-recovery')).toBe(raw)
})

it('fails closed when one protected branch is damaged without overwriting the remaining recovery', () => {
  expect(saveAuthRecoveryConflict('original-owner', conflict()).status).toBe('saved')
  const damaged = JSON.parse(sessionStorage.getItem('openfray:auth-recovery')!)
  damaged.conflict.cloud.envelope = { damaged: true }
  const raw = JSON.stringify(damaged)
  sessionStorage.setItem('openfray:auth-recovery', raw)
  expect(loadAuthRecovery()).toEqual({ status: 'blocked', snapshot: null, blockedBy: 'invalid' })
  expect(loadAuthRecoveryConflict('original-owner')).toBeNull()
  expect(saveAuthRecovery(snapshot('replacement'))).toEqual({
    status: 'blocked',
    reason: 'invalid',
  })
  expect(sessionStorage.getItem('openfray:auth-recovery')).toBe(raw)
})
