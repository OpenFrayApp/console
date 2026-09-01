// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { describe, expect, it } from 'vitest'
import { emptyEncounter, encounterReducer } from '../../src/state/encounter.ts'
import {
  EncounterLifecycle,
  type CloudEncounterAdapter,
} from '../../src/state/encounterLifecycle.ts'
import { IndexedDbRecovery } from '../../src/state/indexedDbRecovery.ts'
import { recoverySnapshot as snapshot } from '../fixtures/sessionSnapshot.ts'

/** Build a browser lifecycle around real IndexedDB and a controlled cloud outcome. */
function lifecycle(
  device: IndexedDbRecovery,
  cloudResult: Awaited<ReturnType<CloudEncounterAdapter['load']>>,
): EncounterLifecycle {
  return new EncounterLifecycle({
    device,
    session: {
      load: () => ({ status: 'empty', snapshot: null }),
      save: () => ({ status: 'saved' }),
    },
    cloud: {
      load: async () => cloudResult,
      acquire: async () => ({ status: 'acquired', revision: 1, leaseToken: 'writer-a' }),
      takeover: async () => ({ status: 'acquired', revision: 1, leaseToken: 'writer-a' }),
      save: async (_ownerId, id, revision, writerId) => ({
        status: 'saved',
        id: id ?? 'cloud-row',
        revision: revision + 1,
        leaseToken: writerId,
      }),
    },
    clock: { now: () => new Date('2026-09-02T10:11:12.000Z') },
  })
}

describe('IndexedDB recovery', () => {
  it('reopens a signed-in working board after a browser restart while cloud is offline', async () => {
    const databaseName = `openfray-restart-${crypto.randomUUID()}`
    const firstDevice = new IndexedDbRecovery(databaseName)
    const firstBrowserSession = lifecycle(firstDevice, { status: 'empty' })
    const recovered = snapshot('offline-fight')

    await firstBrowserSession.identify('owner-a')
    await firstBrowserSession.commit(recovered)
    await firstDevice.close()

    const restartedDevice = new IndexedDbRecovery(databaseName)
    const restartedBrowserSession = lifecycle(restartedDevice, { status: 'failed' })
    await expect(restartedBrowserSession.restore()).resolves.toEqual({
      ownerId: 'owner-a',
      snapshot: recovered,
      savedAt: '2026-09-02T10:11:12.000Z',
    })
    const resolution = await restartedBrowserSession.identify('owner-a')
    expect(resolution.snapshot).toEqual(recovered)

    const workingBoard = encounterReducer(emptyEncounter(), {
      type: 'load',
      encounter: resolution.snapshot!.encounter,
    })
    expect(workingBoard.encounterId).toBe('offline-fight')
    await restartedDevice.close()
  })

  it('retains the current and previous validated recovery copies', async () => {
    const databaseName = `openfray-copies-${crypto.randomUUID()}`
    const recovery = new IndexedDbRecovery(databaseName)

    await recovery.save('owner-a', snapshot('first'), '2026-09-02T10:11:12.000Z')
    await recovery.save('owner-a', snapshot('second'), '2026-09-02T10:12:12.000Z')
    await recovery.save('owner-a', snapshot('third'), '2026-09-02T10:13:12.000Z')

    await expect(recovery.load('owner-a')).resolves.toMatchObject({
      snapshot: snapshot('third'),
    })
    await expect(recovery.loadPrevious('owner-a')).resolves.toMatchObject({
      snapshot: snapshot('second'),
    })
    await recovery.close()
  })

  it('restores the previous validated copy when the current copy is damaged', async () => {
    const databaseName = `openfray-fallback-${crypto.randomUUID()}`
    const recovery = new IndexedDbRecovery(databaseName)
    await recovery.save('owner-a', snapshot('first'), '2026-09-02T10:11:12.000Z')
    await recovery.save('owner-a', snapshot('second'), '2026-09-02T10:12:12.000Z')
    await recovery.close()

    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName)
      request.addEventListener('success', () => resolve(request.result), { once: true })
      request.addEventListener('error', () => reject(request.error), { once: true })
    })
    const transaction = database.transaction('copies', 'readwrite')
    const copies = transaction.objectStore('copies')
    const record = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const request = copies.get('owner-a')
      request.addEventListener('success', () => resolve(request.result), { once: true })
      request.addEventListener('error', () => reject(request.error), { once: true })
    })
    copies.put({ ...record, serialized: '{ damaged' })
    await new Promise<void>((resolve, reject) => {
      transaction.addEventListener('complete', () => resolve(), { once: true })
      transaction.addEventListener('error', () => reject(transaction.error), { once: true })
    })
    database.close()

    const restarted = new IndexedDbRecovery(databaseName)
    await expect(restarted.load('owner-a')).resolves.toMatchObject({ snapshot: snapshot('first') })
    await restarted.close()
  })

  it('keeps each signed-in identity in its own recovery slot', async () => {
    const databaseName = `openfray-identities-${crypto.randomUUID()}`
    const recovery = new IndexedDbRecovery(databaseName)
    await recovery.save('owner-a', snapshot('owner-a-fight'), '2026-09-02T10:11:12.000Z')
    await recovery.save('owner-b', snapshot('owner-b-fight'), '2026-09-02T10:12:12.000Z')

    await expect(recovery.load('owner-a')).resolves.toEqual({
      ownerId: 'owner-a',
      snapshot: snapshot('owner-a-fight'),
      savedAt: '2026-09-02T10:11:12.000Z',
    })
    await expect(recovery.loadLatest()).resolves.toEqual({
      ownerId: 'owner-b',
      snapshot: snapshot('owner-b-fight'),
      savedAt: '2026-09-02T10:12:12.000Z',
    })
    await recovery.close()
  })
})
