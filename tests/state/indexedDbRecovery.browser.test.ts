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
      save: async (id) => id ?? 'cloud-row',
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

  it('keeps each signed-in identity in its own recovery slot', async () => {
    const databaseName = `openfray-identities-${crypto.randomUUID()}`
    const recovery = new IndexedDbRecovery(databaseName)
    await recovery.save('owner-a', snapshot('owner-a-fight'), '2026-09-02T10:11:12.000Z')
    await recovery.save('owner-b', snapshot('owner-b-fight'), '2026-09-02T10:12:12.000Z')

    await expect(recovery.load('owner-a')).resolves.toEqual({
      ownerId: 'owner-a',
      snapshot: snapshot('owner-a-fight'),
    })
    await expect(recovery.loadLatest()).resolves.toEqual({
      ownerId: 'owner-b',
      snapshot: snapshot('owner-b-fight'),
    })
    await recovery.close()
  })
})
