// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { expect, it } from 'vitest'
import { EncounterLifecycle } from '../../src/state/encounterLifecycle.ts'
import { recoverySnapshot } from '../fixtures/sessionSnapshot.ts'
import type { SessionSnapshot } from '../../src/state/persistence.ts'

/** Build recovery adapters that can fail or return stale device data. */
function harness(
  options: { owner?: boolean; fail?: boolean; stale?: boolean; read?: () => Promise<void> } = {},
) {
  let stored: SessionSnapshot | null = options.owner ? recoverySnapshot() : null
  const lifecycle = new EncounterLifecycle({
    device: {
      loadLatest: async () =>
        options.owner
          ? { ownerId: 'owner-a', snapshot: recoverySnapshot(), savedAt: '2026-09-02T10:00:00Z' }
          : null,
      load: async () => {
        await options.read?.()
        return stored
          ? {
              ownerId: 'owner-a',
              snapshot: options.stale ? recoverySnapshot('stale') : stored,
              savedAt: '2026-09-02T10:00:00Z',
            }
          : null
      },
      loadConflict: async () => null,
      save: async (_ownerId, snapshot) => {
        if (options.fail) return { status: 'failed', reason: 'quota' }
        stored = snapshot
        return { status: 'saved' }
      },
      markSynced: async () => ({ status: 'saved' }),
      archiveConflict: async () => ({ status: 'saved' }),
    },
    session: {
      load: () =>
        stored ? { status: 'loaded', snapshot: stored } : { status: 'empty', snapshot: null },
      save: (snapshot) => {
        stored = snapshot
        return { status: 'saved' }
      },
    },
    cloud: {
      load: async () => ({ status: 'failed' }),
      acquire: async () => ({ status: 'failed' }),
      takeover: async () => ({ status: 'failed' }),
      save: async () => ({ status: 'failed' }),
    },
    clock: { now: () => new Date('2026-09-02T10:00:00Z') },
  })
  return lifecycle
}

it('allows an update only after reading back the latest validated recovery copy', async () => {
  const lifecycle = harness()
  await lifecycle.restore()
  expect(await lifecycle.checkpointForUpdate()).toBe(false)
  await lifecycle.commit(recoverySnapshot())
  expect(await lifecycle.checkpointForUpdate()).toBe(true)
})

it('resumes signed-in recovery offline without granting cloud write authority', async () => {
  const lifecycle = harness({ owner: true })
  expect((await lifecycle.resumeOffline()).snapshot?.encounter.encounterId).toBe('local')
  await lifecycle.commit(recoverySnapshot('latest'))
  expect(await lifecycle.checkpointForUpdate()).toBe(true)
  expect(lifecycle.saveStatus().kind).toBe('sign-in')
})

it.each([{ fail: true }, { stale: true }])(
  'blocks update when signed-in recovery cannot be verified: %j',
  async (fault) => {
    const lifecycle = harness({ owner: true, ...fault })
    await lifecycle.resumeOffline()
    await lifecycle.commit(recoverySnapshot('latest'))
    expect(await lifecycle.checkpointForUpdate()).toBe(false)
  },
)

it('blocks a checkpoint superseded by another committed action', async () => {
  let beginRead: () => void = () => undefined
  let finishRead: () => void = () => undefined
  const reading = new Promise<void>((resolve) => {
    beginRead = resolve
  })
  const held = new Promise<void>((resolve) => {
    finishRead = resolve
  })
  const lifecycle = harness({
    owner: true,
    read: () => {
      beginRead()
      return held
    },
  })
  await lifecycle.resumeOffline()
  await lifecycle.commit(recoverySnapshot('before'))
  const checkpoint = lifecycle.checkpointForUpdate()
  await reading
  await lifecycle.commit(recoverySnapshot('after'))
  finishRead()
  expect(await checkpoint).toBe(false)
})

it('returns the recovered board to overlapping offline startup callers', async () => {
  const lifecycle = harness({ owner: true })
  const restored = await Promise.all([lifecycle.resumeOffline(), lifecycle.resumeOffline()])
  expect(restored.map((result) => result.snapshot?.encounter.encounterId)).toEqual([
    'local',
    'local',
  ])
})

it('blocks an update when recovery readback throws', async () => {
  const lifecycle = harness({
    owner: true,
    read: async () => {
      throw new Error('Storage denied')
    },
  })
  await lifecycle.resumeOffline()
  expect(await lifecycle.checkpointForUpdate()).toBe(false)
})
