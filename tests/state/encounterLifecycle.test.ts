// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { describe, expect, it } from 'vitest'
import type { Encounter } from '../../src/schema/encounter.ts'
import {
  recoveryEncounter as encounter,
  recoverySnapshot as snapshot,
} from '../fixtures/sessionSnapshot.ts'
import {
  EncounterLifecycle,
  type CloudEncounterAdapter,
  type DeviceRecoveryAdapter,
  type SessionRecoveryAdapter,
} from '../../src/state/encounterLifecycle.ts'
import type {
  SessionLoadResult,
  SessionSnapshot,
  SessionWriteResult,
} from '../../src/state/persistence.ts'

/** Build deterministic lifecycle adapters and expose their observed calls. */
function harness(options: {
  latest?: { ownerId: string; snapshot: SessionSnapshot } | null
  byOwner?: Record<string, SessionSnapshot>
  anonymous?: SessionLoadResult
  cloud?: Awaited<ReturnType<CloudEncounterAdapter['load']>>
  deviceUnavailable?: boolean
}) {
  const calls: string[] = []
  const deviceWrites: Array<{ ownerId: string; snapshot: SessionSnapshot; savedAt: string }> = []
  const sessionWrites: SessionSnapshot[] = []
  const cloudWrites: Array<{ id: string | null; encounter: Encounter; updatedAt: string }> = []
  const saved: SessionWriteResult = { status: 'saved' }
  const device: DeviceRecoveryAdapter = {
    async loadLatest() {
      calls.push('device:latest')
      if (options.deviceUnavailable) throw new Error('IndexedDB unavailable')
      return options.latest ?? null
    },
    async load(ownerId) {
      calls.push(`device:${ownerId}`)
      if (options.deviceUnavailable) throw new Error('IndexedDB unavailable')
      const value = options.byOwner?.[ownerId]
      return value ? { ownerId, snapshot: value } : null
    },
    async save(ownerId, value, savedAt) {
      calls.push(`device-save:${ownerId}`)
      deviceWrites.push({ ownerId, snapshot: value, savedAt })
      return saved
    },
  }
  const session: SessionRecoveryAdapter = {
    load() {
      calls.push('session:load')
      return options.anonymous ?? { status: 'empty', snapshot: null }
    },
    save(value) {
      calls.push('session:save')
      sessionWrites.push(value)
      return saved
    },
  }
  const cloud: CloudEncounterAdapter = {
    async load() {
      calls.push('cloud:load')
      return options.cloud ?? { status: 'failed' }
    },
    async save(id, value, updatedAt) {
      calls.push('cloud:save')
      cloudWrites.push({ id, encounter: value, updatedAt })
      return id ?? 'cloud-row'
    },
  }
  const lifecycle = new EncounterLifecycle({
    device,
    session,
    cloud,
    clock: { now: () => new Date('2026-09-02T10:11:12.000Z') },
  })
  return { lifecycle, calls, deviceWrites, sessionWrites, cloudWrites }
}

describe('encounter lifecycle', () => {
  it('restores the latest signed-in recovery copy before identity and cloud work', async () => {
    const recovered = snapshot('device-copy')
    const { lifecycle, calls } = harness({
      latest: { ownerId: 'owner-a', snapshot: recovered },
      byOwner: { 'owner-a': recovered },
      cloud: { status: 'failed' },
    })

    await expect(lifecycle.restore()).resolves.toEqual({
      ownerId: 'owner-a',
      snapshot: recovered,
    })
    expect(calls).toEqual(['device:latest'])

    await expect(lifecycle.identify('owner-a')).resolves.toMatchObject({ snapshot: recovered })
    expect(calls).toEqual(['device:latest', 'device:owner-a', 'cloud:load'])
  })

  it('keeps anonymous recovery tab-scoped and never writes it to device or cloud adapters', async () => {
    const anonymous = snapshot('anonymous')
    const { lifecycle, calls, deviceWrites, sessionWrites, cloudWrites } = harness({
      anonymous: { status: 'loaded', snapshot: anonymous },
    })

    await expect(lifecycle.restore()).resolves.toEqual({ ownerId: null, snapshot: anonymous })
    await lifecycle.identify(null)
    await lifecycle.commit(snapshot('anonymous-next'))

    expect(sessionWrites).toEqual([snapshot('anonymous-next')])
    expect(deviceWrites).toEqual([])
    expect(cloudWrites).toEqual([])
    expect(calls).toEqual(['device:latest', 'session:load', 'session:save'])
  })

  it('writes signed-in recovery with a deterministic clock and keeps the legacy copy readable', async () => {
    const recovered = snapshot('device-copy')
    const { lifecycle, deviceWrites, sessionWrites, cloudWrites } = harness({
      latest: { ownerId: 'owner-a', snapshot: recovered },
      byOwner: { 'owner-a': recovered },
      cloud: { status: 'empty' },
    })

    await lifecycle.restore()
    await lifecycle.identify('owner-a')
    await lifecycle.commit(snapshot('next'))

    expect(deviceWrites).toEqual([
      {
        ownerId: 'owner-a',
        snapshot: snapshot('next'),
        savedAt: '2026-09-02T10:11:12.000Z',
      },
    ])
    expect(sessionWrites).toEqual([snapshot('next')])
    expect(cloudWrites).toEqual([
      {
        id: null,
        encounter: encounter('next'),
        updatedAt: '2026-09-02T10:11:12.000Z',
      },
    ])
  })

  it('keeps the versioned session fallback readable when IndexedDB initialization fails', async () => {
    const fallback = snapshot('legacy-session-copy')
    const { lifecycle, calls } = harness({
      deviceUnavailable: true,
      anonymous: { status: 'loaded', snapshot: fallback },
      cloud: { status: 'failed' },
    })

    await expect(lifecycle.restore()).resolves.toEqual({ ownerId: null, snapshot: fallback })
    await expect(lifecycle.identify('owner-a')).resolves.toMatchObject({ snapshot: fallback })
    expect(calls).toEqual(['device:latest', 'session:load', 'device:owner-a', 'cloud:load'])
  })

  it('loads the resolved owner recovery before reconciling a different startup identity', async () => {
    const previousOwner = snapshot('previous-owner')
    const currentOwner = snapshot('current-owner')
    const { lifecycle, calls } = harness({
      latest: { ownerId: 'owner-a', snapshot: previousOwner },
      byOwner: { 'owner-b': currentOwner },
      cloud: { status: 'failed' },
    })

    await lifecycle.restore()
    await expect(lifecycle.identify('owner-b')).resolves.toMatchObject({ snapshot: currentOwner })
    expect(calls).toEqual(['device:latest', 'device:owner-b', 'cloud:load'])
  })

  it('clears owner recovery when the authenticated session signs out', async () => {
    const recovered = snapshot('owner-board')
    const { lifecycle } = harness({
      latest: { ownerId: 'owner-a', snapshot: recovered },
      byOwner: { 'owner-a': recovered },
      cloud: { status: 'failed' },
    })

    await lifecycle.identify('owner-a')
    await expect(lifecycle.identify(null)).resolves.toEqual({
      ownerId: null,
      snapshot: null,
      clearWorkingBoard: true,
    })
  })

  it.each([{ status: 'failed' }, { status: 'empty' }] as const)(
    'clears a previous owner board when the resolved owner has no recovery and cloud is $status',
    async (cloud) => {
      const previousOwner = snapshot('previous-owner')
      const { lifecycle } = harness({
        latest: { ownerId: 'owner-a', snapshot: previousOwner },
        cloud,
      })

      await lifecycle.restore()
      await expect(lifecycle.identify('owner-b')).resolves.toEqual({
        ownerId: 'owner-b',
        snapshot: null,
        clearWorkingBoard: true,
      })
    },
  )
})
