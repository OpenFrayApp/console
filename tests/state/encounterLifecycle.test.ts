// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { describe, expect, it } from 'vitest'
import { decodeSession } from '../../src/codecs/session.ts'
import type { Encounter } from '../../src/schema/encounter.ts'
import {
  recoveryEncounter as encounter,
  recoverySnapshot as snapshot,
} from '../fixtures/sessionSnapshot.ts'
import {
  EncounterLifecycle,
  requiresNavigationWarning,
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
  cloudSaveResult?: string | null
  deviceUnavailable?: boolean
  deviceWrite?: SessionWriteResult
  deviceSave?: () => Promise<SessionWriteResult>
  sessionWrite?: SessionWriteResult
  online?: boolean
}) {
  const calls: string[] = []
  const deviceWrites: Array<{ ownerId: string; snapshot: SessionSnapshot; savedAt: string }> = []
  const sessionWrites: SessionSnapshot[] = []
  const cloudWrites: Array<{ id: string | null; encounter: Encounter; updatedAt: string }> = []
  const saved: SessionWriteResult = { status: 'saved' }
  let online = options.online ?? true
  let networkListener: () => void = () => undefined
  let networkSubscriptions = 0
  let networkUnsubscriptions = 0
  let scheduledCloud: (() => void | Promise<void>) | null = null
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
      return options.deviceSave ? options.deviceSave() : (options.deviceWrite ?? saved)
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
      return options.sessionWrite ?? saved
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
      return options.cloudSaveResult !== undefined ? options.cloudSaveResult : (id ?? 'cloud-row')
    },
  }
  const lifecycle = new EncounterLifecycle({
    device,
    session,
    cloud,
    clock: { now: () => new Date('2026-09-02T10:11:12.000Z') },
    network: {
      online: () => online,
      /** Capture the lifecycle's connectivity observer. */
      subscribe(listener) {
        networkSubscriptions += 1
        networkListener = listener
        return () => {
          networkUnsubscriptions += 1
        }
      },
    },
    scheduler: {
      /** Hold deferred cloud work until the test crosses the debounce boundary. */
      after(_delay, task) {
        scheduledCloud = task
        return () => {
          if (scheduledCloud === task) scheduledCloud = null
        }
      },
    },
  })
  return {
    lifecycle,
    calls,
    deviceWrites,
    sessionWrites,
    cloudWrites,
    /** Report deterministic network-listener counts. */
    networkCounts() {
      return { subscriptions: networkSubscriptions, unsubscriptions: networkUnsubscriptions }
    },
    /** Change deterministic connectivity and notify the lifecycle. */
    setOnline(value: boolean) {
      online = value
      networkListener()
    },
    /** Run the latest deferred cloud write. */
    async flushCloud() {
      const task = scheduledCloud
      scheduledCloud = null
      await task?.()
    },
  }
}

describe('encounter lifecycle', () => {
  it('observes network state only while a save-status consumer is mounted', () => {
    const { lifecycle, networkCounts } = harness({})
    const first = lifecycle.subscribe(() => undefined)
    const second = lifecycle.subscribe(() => undefined)
    expect(networkCounts()).toEqual({ subscriptions: 1, unsubscriptions: 0 })

    first()
    expect(networkCounts()).toEqual({ subscriptions: 1, unsubscriptions: 0 })
    second()
    expect(networkCounts()).toEqual({ subscriptions: 1, unsubscriptions: 1 })
  })

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
    const { lifecycle, deviceWrites, sessionWrites, cloudWrites, flushCloud } = harness({
      latest: { ownerId: 'owner-a', snapshot: recovered },
      byOwner: { 'owner-a': recovered },
      cloud: { status: 'empty' },
    })

    await lifecycle.restore()
    await lifecycle.identify('owner-a')
    await lifecycle.commit(snapshot('next'))
    expect(cloudWrites).toEqual([])
    await flushCloud()

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

  it('marks a committed action pending until signed-in recovery succeeds', async () => {
    let finishWrite: (result: SessionWriteResult) => void = () => undefined
    const delayed = new Promise<SessionWriteResult>((resolve) => {
      finishWrite = resolve
    })
    const { lifecycle, flushCloud } = harness({
      latest: { ownerId: 'owner-a', snapshot: snapshot('first') },
      byOwner: { 'owner-a': snapshot('first') },
      cloud: { status: 'empty' },
      deviceSave: () => delayed,
    })
    await lifecycle.identify('owner-a')
    const states: string[] = []
    lifecycle.subscribe((state) => states.push(state.kind))

    const committed = lifecycle.commit(snapshot('next'))
    expect(lifecycle.saveStatus()).toEqual({ kind: 'saving' })
    finishWrite({ status: 'saved' })
    await committed

    expect(lifecycle.saveStatus()).toEqual({ kind: 'saving' })
    await flushCloud()
    expect(lifecycle.saveStatus()).toEqual({ kind: 'saved' })
    expect(states).toEqual(['saving', 'saving', 'saved'])
  })

  it('debounces cloud saving to the latest recovered working board', async () => {
    const { lifecycle, cloudWrites, flushCloud } = harness({
      latest: { ownerId: 'owner-a', snapshot: snapshot('first') },
      byOwner: { 'owner-a': snapshot('first') },
      cloud: { status: 'empty' },
    })
    await lifecycle.identify('owner-a')

    await lifecycle.commit(snapshot('second'))
    await lifecycle.commit(snapshot('third'))
    expect(cloudWrites).toEqual([])
    await flushCloud()

    expect(cloudWrites.map((write) => write.encounter.encounterId)).toEqual(['third'])
    expect(lifecycle.saveStatus()).toEqual({ kind: 'saved' })
  })

  it('keeps a failed cloud write observable as Offline', async () => {
    const { lifecycle, flushCloud } = harness({
      latest: { ownerId: 'owner-a', snapshot: snapshot('first') },
      byOwner: { 'owner-a': snapshot('first') },
      cloud: { status: 'empty' },
      cloudSaveResult: null,
    })
    await lifecycle.identify('owner-a')
    await lifecycle.commit(snapshot('next'))
    await flushCloud()

    expect(lifecycle.saveStatus()).toEqual({ kind: 'offline' })
  })

  it.each([
    { status: 'failed', reason: 'unavailable' },
    { status: 'failed', reason: 'quota' },
  ] as const)(
    'keeps the board playable and exposes retry after $reason recovery failure',
    async (failure) => {
      const { lifecycle } = harness({
        latest: { ownerId: 'owner-a', snapshot: snapshot('first') },
        byOwner: { 'owner-a': snapshot('first') },
        cloud: { status: 'empty' },
        deviceWrite: failure,
      })
      await lifecycle.identify('owner-a')

      await expect(lifecycle.commit(snapshot('next'))).resolves.toEqual(failure)
      const status = lifecycle.saveStatus()
      expect(status).toEqual({ kind: 'failed', reason: failure.reason })
      expect(requiresNavigationWarning(status)).toBe(true)
      const download = lifecycle.recoveryDownload()
      expect(download).not.toBeNull()
      expect(decodeSession(download!.serialized)).toMatchObject({
        status: 'ok',
        snapshot: snapshot('next'),
      })
    },
  )

  it('retries the latest working board after an interrupted recovery write', async () => {
    let attempts = 0
    const { lifecycle, deviceWrites, flushCloud } = harness({
      latest: { ownerId: 'owner-a', snapshot: snapshot('first') },
      byOwner: { 'owner-a': snapshot('first') },
      cloud: { status: 'empty' },
      deviceSave: async () =>
        ++attempts === 1 ? { status: 'failed', reason: 'unavailable' } : { status: 'saved' },
    })
    await lifecycle.identify('owner-a')
    await lifecycle.commit(snapshot('next'))

    await expect(lifecycle.retry()).resolves.toEqual({ status: 'saved' })
    expect(lifecycle.saveStatus()).toEqual({ kind: 'saving' })
    await flushCloud()
    expect(deviceWrites.map((write) => write.snapshot)).toEqual([
      snapshot('next'),
      snapshot('next'),
    ])
    expect(lifecycle.saveStatus()).toEqual({ kind: 'saved' })
  })

  it('distinguishes anonymous and offline recovery from a fully saved owner copy', async () => {
    const anonymous = harness({})
    await anonymous.lifecycle.identify(null)
    await anonymous.lifecycle.commit(snapshot('anonymous'))
    expect(anonymous.lifecycle.saveStatus()).toEqual({ kind: 'sign-in' })

    const owner = harness({
      latest: { ownerId: 'owner-a', snapshot: snapshot('first') },
      byOwner: { 'owner-a': snapshot('first') },
      cloud: { status: 'empty' },
      online: false,
    })
    await owner.lifecycle.identify('owner-a')
    await owner.lifecycle.commit(snapshot('offline'))
    expect(owner.lifecycle.saveStatus()).toEqual({ kind: 'offline' })

    const unavailable = harness({
      latest: { ownerId: 'owner-a', snapshot: snapshot('first') },
      byOwner: { 'owner-a': snapshot('first') },
      cloud: { status: 'failed' },
    })
    await unavailable.lifecycle.identify('owner-a')
    unavailable.lifecycle.subscribe(() => undefined)
    await unavailable.lifecycle.commit(snapshot('local-only'))
    unavailable.setOnline(false)
    unavailable.setOnline(true)
    expect(unavailable.lifecycle.saveStatus()).toEqual({ kind: 'offline' })
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
