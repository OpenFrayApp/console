// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { describe, expect, it, vi } from 'vitest'
import { emptyEncounter, encounterReducer } from '../../src/state/encounter.ts'
import {
  EncounterLifecycle,
  type CloudEncounterAdapter,
} from '../../src/state/encounterLifecycle.ts'
import { IndexedDbRecovery } from '../../src/state/indexedDbRecovery.ts'
import { pc } from '../fixtures.ts'
import {
  loadSession,
  loadOwnerSession,
  saveSession,
  type SessionSnapshot,
} from '../../src/state/persistence.ts'
import {
  clearAuthRecovery,
  loadAuthRecovery,
  loadAuthRecoveryConflict,
  saveAuthRecovery,
  saveAuthRecoveryConflict,
} from '../../src/state/authRecovery.ts'
import type { SessionRecoveryAdapter } from '../../src/state/encounterLifecycle.ts'
import { recoverySnapshot as snapshot } from '../fixtures/sessionSnapshot.ts'

/** Build a browser lifecycle around real IndexedDB and a controlled cloud outcome. */
function lifecycle(
  device: IndexedDbRecovery,
  cloudResult: Awaited<ReturnType<CloudEncounterAdapter['load']>>,
  authSnapshot: SessionSnapshot | null = null,
  cloudAdapter?: CloudEncounterAdapter,
  sessionRecovery?: SessionRecoveryAdapter,
): EncounterLifecycle {
  return new EncounterLifecycle({
    device,
    session: sessionRecovery ?? {
      load: () => ({ status: 'empty', snapshot: null }),
      save: () => ({ status: 'saved' }),
    },
    authRecovery: {
      loadConflict: () => null,
      saveConflict: () => ({ status: 'saved' }),
      load: () =>
        authSnapshot
          ? { status: 'loaded', snapshot: authSnapshot }
          : { status: 'empty', snapshot: null },
      save: (value) => {
        authSnapshot = value
        return { status: 'saved' }
      },
      clear: () => {
        authSnapshot = null
        return { status: 'deleted' }
      },
    },
    cloud: cloudAdapter ?? {
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
  it.each([
    { choice: 'device', cloudState: 'existing' },
    { choice: 'cloud', cloudState: 'existing' },
    { choice: 'device', cloudState: 'empty' },
    { choice: 'cloud', cloudState: 'empty' },
  ] as const)(
    'preserves the third unsynced owner branch with $cloudState cloud through $choice choice, later commits and restart',
    async ({ choice, cloudState }) => {
      const name = `openfray-third-branch-${crypto.randomUUID()}`
      const device = new IndexedDbRecovery(name)
      await device.save('owner-a', snapshot('unsynced-owner'), '2026-09-02T10:10:12.000Z')
      const anonymous = snapshot('anonymous-board')
      anonymous.encounter.combatants = [pc({ name: 'Anonymous guard' })]
      const cloud = {
        status: 'loaded' as const,
        id: 'cloud-row',
        encounter: snapshot('cloud-board').encounter,
        revision: 1,
        playerCode: null,
        updatedAt: '2026-09-02T10:11:12.000Z',
      }
      const first = lifecycle(
        device,
        cloudState === 'empty' ? { status: 'empty' } : cloud,
        anonymous,
      )
      const returned = await first.identify('owner-a')
      expect(first.recoveryDownload()?.serialized).toContain('unsynced-owner')
      expect((await device.load('owner-a'))?.snapshot.encounter.encounterId).toBe('unsynced-owner')
      expect(await first.resolveConflict(returned.conflict!.id, choice)).not.toBeNull()
      await first.commit(snapshot('after-choice'))
      await first.commit(snapshot('after-another-action'))
      await device.close()
      const reopenedDevice = new IndexedDbRecovery(name)
      const restarted = lifecycle(reopenedDevice, { status: 'failed' })
      await restarted.identify('owner-a')
      expect((await reopenedDevice.loadPrevious('owner-a'))?.snapshot.encounter.encounterId).toBe(
        'after-choice',
      )
      const download = restarted.recoveryDownload()?.serialized
      expect(download).toContain('unsynced-owner')
      expect(download).toContain('anonymous-board')
      if (cloudState === 'existing') expect(download).toContain('cloud-board')
      else
        expect(JSON.parse(download!).copies.cloud.envelope.payload.encounter.combatants).toEqual([])
      await reopenedDevice.close()
      const onlineDevice = new IndexedDbRecovery(name)
      const onlineReturn = lifecycle(onlineDevice, cloud)
      await onlineReturn.identify('owner-a')
      expect(onlineReturn.recoveryDownload()?.serialized).toContain('unsynced-owner')
      await onlineDevice.close()
    },
  )

  it.each([
    { cloudState: 'empty', choice: 'device' },
    { cloudState: 'empty', choice: 'cloud' },
    { cloudState: 'changed', choice: 'device' },
    { cloudState: 'changed', choice: 'cloud' },
    { cloudState: 'unchanged', choice: 'device' },
    { cloudState: 'unchanged', choice: 'cloud' },
  ] as const)(
    'requires choice on $cloudState online owner renewal, retaining all branches after $choice choice and restart',
    async ({ cloudState, choice }) => {
      const name = `openfray-online-renewal-${crypto.randomUUID()}`
      const device = new IndexedDbRecovery(name)
      const local = snapshot('original-owner-device')
      const originalCloud = snapshot('original-owner-cloud')
      const originalOwner = snapshot('retained-third-owner')
      local.encounter.combatants = [pc({ name: 'Device guard' })]
      originalCloud.encounter.combatants = [pc({ name: 'Original cloud guard' })]
      originalOwner.encounter.combatants = [pc({ name: 'Retained owner guard' })]
      const changedCloud = snapshot('changed-owner-cloud')
      changedCloud.encounter.combatants = [pc({ name: 'Changed cloud guard' })]
      await device.save('owner-a', local, '2026-09-02T10:10:12.000Z')
      const oldCloud = {
        status: 'loaded' as const,
        id: 'cloud-row',
        encounter: originalCloud.encounter,
        revision: 1,
        playerCode: null,
        updatedAt: '2026-09-02T10:11:12.000Z',
      }
      const first = lifecycle(device, oldCloud)
      const firstReturn = await first.identify('owner-a')
      await device.archiveConflict('owner-a', {
        ...firstReturn.conflict!,
        ownerRecovery: {
          snapshot: originalOwner,
          activeAt: '2026-09-02T10:09:12.000Z',
        },
      })
      first.expireIdentity()
      expect(await first.checkpointForSiteNavigation()).toBe(true)
      await device.close()

      let current: Awaited<ReturnType<CloudEncounterAdapter['load']>> =
        cloudState === 'empty'
          ? { status: 'empty' }
          : cloudState === 'unchanged'
            ? oldCloud
            : {
                ...oldCloud,
                encounter: changedCloud.encounter,
                revision: 2,
                updatedAt: '2026-09-02T10:12:12.000Z',
              }
      const publications: Array<{ ownerId: string; encounterId: string }> = []
      const cloud: CloudEncounterAdapter = {
        load: async () => current,
        acquire: async () => ({
          status: 'acquired',
          revision: current.status === 'loaded' ? (current.revision ?? 0) : 0,
          leaseToken: 'writer-a',
        }),
        takeover: async () => ({ status: 'acquired', revision: 2, leaseToken: 'writer-a' }),
        save: async (ownerId, id, revision, writerId, encounter, updatedAt) => {
          publications.push({ ownerId, encounterId: encounter.encounterId })
          current = {
            status: 'loaded',
            id: id ?? 'new-cloud-row',
            revision: revision + 1,
            encounter,
            updatedAt,
            playerCode: null,
          }
          return {
            status: 'saved',
            id: current.id,
            revision: current.revision!,
            leaseToken: writerId,
          }
        },
      }
      const returnedDevice = new IndexedDbRecovery(name)
      const renewed = lifecycle(returnedDevice, current, null, cloud)
      let returned = await renewed.identify('owner-a')
      await renewed.commit(local)
      expect(await renewed.ensureCloudEncounter(local.encounter)).toBeNull()
      expect(await renewed.takeOver()).toBe(false)
      expect(publications).toEqual([])
      expect(renewed.writableEncounter()).toBeNull()
      expect(returned.conflict).toBeDefined()
      const beforeChoice = renewed.recoveryDownload()!.serialized
      expect(beforeChoice).toContain('original-owner-device')
      expect(beforeChoice).toContain('original-owner-cloud')
      expect(beforeChoice).toContain('retained-third-owner')
      if (cloudState === 'changed') expect(beforeChoice).toContain('changed-owner-cloud')
      renewed.expireIdentity()
      expect(await renewed.checkpointForSiteNavigation()).toBe(true)
      returned = await renewed.identify('owner-a')
      expect(await renewed.ensureCloudEncounter(local.encounter)).toBeNull()
      expect(publications).toEqual([])
      expect(renewed.recoveryDownload()!.serialized).toContain('original-owner-cloud')
      const selected = choice === 'device' ? local : returned.conflict!.cloud.snapshot
      expect((await renewed.resolveConflict(returned.conflict!.id, choice))?.snapshot).toEqual(
        selected,
      )
      expect(publications).toHaveLength(choice === 'device' ? 1 : 0)
      if (choice === 'device')
        expect(publications[0]).toEqual({
          ownerId: 'owner-a',
          encounterId: 'original-owner-device',
        })
      expect((await returnedDevice.loadConflict('owner-a'))?.unresolved).toBe(false)
      await renewed.commit(snapshot('after-choice-action'))
      expect(
        await renewed.ensureCloudEncounter(snapshot('after-choice-action').encounter),
      ).not.toBeNull()
      await renewed.commit(snapshot('after-second-action'))
      expect(
        await renewed.ensureCloudEncounter(snapshot('after-second-action').encounter),
      ).not.toBeNull()
      await returnedDevice.close()
      const reopened = new IndexedDbRecovery(name)
      const restarted = lifecycle(reopened, current, null, cloud)
      const restartedReturn = await restarted.identify('owner-a')
      expect(restartedReturn.snapshot?.encounter.encounterId).toBe('after-second-action')
      expect(restartedReturn.conflict).toBeUndefined()
      const afterRestart = restarted.recoveryDownload()!.serialized
      const copies = JSON.parse(afterRestart).copies
      expect(copies.device.envelope.payload.encounter).toEqual(local.encounter)
      expect(copies.retainedCloud.envelope.payload.encounter).toEqual(originalCloud.encounter)
      expect(copies.ownerRecovery.envelope.payload.encounter).toEqual(originalOwner.encounter)
      expect(afterRestart).toContain('original-owner-device')
      expect(afterRestart).toContain('original-owner-cloud')
      expect(afterRestart).toContain('retained-third-owner')
      if (cloudState === 'changed') expect(afterRestart).toContain('changed-owner-cloud')
      await reopened.close()
    },
  )

  it('does not expose another owner’s unresolved board or recovery download on online return', async () => {
    const name = `openfray-wrong-owner-${crypto.randomUUID()}`
    const device = new IndexedDbRecovery(name)
    await device.save('owner-a', snapshot('private-owner-a-device'), '2026-09-02T10:11:12.000Z')
    await device.archiveConflict('owner-a', {
      id: 'owner-a-choice',
      unresolved: true,
      device: {
        snapshot: snapshot('private-owner-a-device'),
        activeAt: '2026-09-02T10:11:12.000Z',
      },
      cloud: {
        snapshot: snapshot('private-owner-a-cloud'),
        activeAt: '2026-09-02T10:11:12.000Z',
        revision: 1,
      },
    })
    await device.close()
    const reopened = new IndexedDbRecovery(name)
    const returnedSession = lifecycle(reopened, { status: 'empty' })
    const returned = await returnedSession.identify('owner-b')
    expect(returned.snapshot).toBeNull()
    expect(returned.conflict).toBeUndefined()
    expect(returnedSession.recoveryDownload()?.serialized ?? '').not.toContain('private-owner-a')
    expect((await reopened.loadConflict('owner-a'))?.unresolved).toBe(true)
    await reopened.close()
  })

  it('reopens unresolved owner copies after an expired-identity checkpoint without cloud access', async () => {
    const name = `openfray-expired-conflict-${crypto.randomUUID()}`
    const device = new IndexedDbRecovery(name)
    await device.save('owner-a', snapshot('unresolved-owner-device'), '2026-09-02T10:10:12.000Z')
    const first = lifecycle(device, {
      status: 'loaded',
      id: 'cloud-row',
      encounter: snapshot('unresolved-owner-cloud').encounter,
      revision: 1,
      playerCode: null,
      updatedAt: '2026-09-02T10:11:12.000Z',
    })
    await first.identify('owner-a')
    first.expireIdentity()
    expect(await first.checkpointForSiteNavigation()).toBe(true)
    expect(first.writableEncounter()).toBeNull()
    expect((await device.loadConflict('owner-a'))?.unresolved).toBe(true)
    await device.close()
    const reopenedDevice = new IndexedDbRecovery(name)
    const restarted = lifecycle(reopenedDevice, { status: 'failed' })
    const returned = await restarted.identify('owner-a')
    expect(returned.conflict?.device.snapshot.encounter.encounterId).toBe('unresolved-owner-device')
    expect(returned.conflict?.cloud.snapshot.encounter.encounterId).toBe('unresolved-owner-cloud')
    expect(restarted.writableEncounter()).toBeNull()
    expect(restarted.recoveryDownload()?.serialized).toContain('unresolved-owner-device')
    expect(restarted.recoveryDownload()?.serialized).toContain('unresolved-owner-cloud')
    await reopenedDevice.close()
  })

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

  it('retains cloud ancestry across local commits and archives both conflict branches', async () => {
    const databaseName = `openfray-lineage-${crypto.randomUUID()}`
    const recovery = new IndexedDbRecovery(databaseName)
    const first = snapshot('first')
    const lineage = {
      cloudEncounterId: 'cloud-row',
      cloudRevision: 7,
      cloudStateHash: 'cloud-hash',
    }

    await recovery.save('owner-a', first, '2026-09-02T10:11:12.000Z')
    await recovery.markSynced('owner-a', first, lineage)
    await recovery.save('owner-a', snapshot('second'), '2026-09-02T10:12:12.000Z')
    await recovery.archiveConflict('owner-a', {
      id: 'conflict-a',
      device: { snapshot: snapshot('second'), activeAt: '2026-09-02T10:12:12.000Z' },
      cloud: {
        snapshot: snapshot('cloud'),
        activeAt: '2026-09-02T10:13:12.000Z',
        revision: 8,
      },
    })

    await expect(recovery.load('owner-a')).resolves.toMatchObject({ lineage })
    await expect(recovery.loadConflict('owner-a')).resolves.toMatchObject({
      device: { snapshot: snapshot('second'), activeAt: '2026-09-02T10:12:12.000Z' },
      cloud: {
        snapshot: snapshot('cloud'),
        activeAt: '2026-09-02T10:13:12.000Z',
        revision: 8,
      },
    })
    await recovery.close()
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName)
      request.addEventListener('success', () => resolve(request.result), { once: true })
      request.addEventListener('error', () => reject(request.error), { once: true })
    })
    const transaction = database.transaction('conflicts', 'readonly')
    const archived = await new Promise<Record<string, string>>((resolve, reject) => {
      const request = transaction.objectStore('conflicts').get('owner-a')
      request.addEventListener('success', () => resolve(request.result), { once: true })
      request.addEventListener('error', () => reject(request.error), { once: true })
    })
    expect(archived.deviceSerialized).toContain('second')
    expect(archived.cloudSerialized).toContain('cloud')
    database.close()
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

it.each(['healthy', 'blocked', 'missing'] as const)(
  'keeps real owner tab mirrors isolated while anonymous reloads survive %s IndexedDB',
  async (availability) => {
    sessionStorage.clear()
    const device = new IndexedDbRecovery(`openfray-mirror-${crypto.randomUUID()}`)
    const privateBoard = snapshot('private-owner-board')
    privateBoard.encounter.combatants = [pc({ name: 'Private guard' })]
    const cloudWrites: SessionSnapshot['encounter'][] = []
    const cloudAdapter: CloudEncounterAdapter = {
      load: async () => ({
        status: 'loaded',
        id: 'owner-row',
        encounter: privateBoard.encounter,
        revision: 1,
        playerCode: null,
        updatedAt: '2026-09-02T10:11:12Z',
      }),
      acquire: async () => ({ status: 'acquired', revision: 1, leaseToken: 'writer-a' }),
      takeover: async () => ({ status: 'failed' }),
      save: async (_owner, id, revision, writerId, encounter) => {
        cloudWrites.push(encounter)
        return { status: 'saved', id: id!, revision: revision + 1, leaseToken: writerId }
      },
    }
    const session = { load: loadSession, loadOwner: loadOwnerSession, save: saveSession }
    try {
      const owner = lifecycle(device, { status: 'failed' }, null, cloudAdapter, session)
      await owner.identify('owner-a')
      await owner.commit(privateBoard)
      expect(await owner.checkpointForSiteNavigation()).toBe(true)
      const before = cloudWrites.length
      if (availability === 'blocked') {
        vi.spyOn(device, 'loadLatest').mockRejectedValue(new Error('blocked'))
        vi.spyOn(device, 'load').mockRejectedValue(new Error('blocked'))
      } else if (availability === 'missing') {
        vi.spyOn(device, 'loadLatest').mockResolvedValue(null)
        vi.spyOn(device, 'load').mockResolvedValue(null)
      }
      const anonymous = lifecycle(device, { status: 'failed' }, null, cloudAdapter, session)
      expect(await anonymous.identify(null)).toMatchObject({
        ownerId: null,
        snapshot: null,
        clearWorkingBoard: true,
      })
      const later = snapshot('real-anonymous-edit')
      later.encounter.combatants = [pc({ name: 'Anonymous guard' })]
      await anonymous.commit(later)
      const restarted = lifecycle(device, { status: 'failed' }, null, cloudAdapter, session)
      expect(await restarted.identify(null)).toMatchObject({ ownerId: null, snapshot: later })
      expect(loadOwnerSession('owner-a')).toMatchObject({
        ownerId: 'owner-a',
        snapshot: privateBoard,
      })
      expect(cloudWrites).toHaveLength(before)
    } finally {
      vi.restoreAllMocks()
      sessionStorage.clear()
      await device.close()
    }
  },
)

it.each([
  ['device', true],
  ['cloud', true],
  ['device', false],
  ['cloud', false],
] as const)(
  'keeps resolved anonymous history inactive after %s choice, owner edits and real-storage restart online=%s',
  async (choice, online) => {
    sessionStorage.clear()
    const name = `openfray-consumed-anonymous-${crypto.randomUUID()}`
    let device = new IndexedDbRecovery(name)
    const anonymous = snapshot('resolved-anonymous')
    anonymous.encounter.combatants = [pc({ name: 'Anonymous guard' })]
    const initialCloud = snapshot('original-cloud')
    initialCloud.encounter.combatants = [pc({ name: 'Cloud guard' })]
    let remote = initialCloud.encounter
    let revision = 1
    let connected = true
    expect(saveSession(snapshot('previous-anonymous')).status).toBe('saved')
    expect(saveSession(anonymous).status).toBe('saved')
    expect(saveAuthRecovery(anonymous).status).toBe('saved')
    const cloud: CloudEncounterAdapter = {
      load: async () =>
        connected
          ? {
              status: 'loaded',
              id: 'cloud-row',
              encounter: remote,
              revision,
              playerCode: null,
              updatedAt: '2026-09-02T10:11:12.000Z',
            }
          : { status: 'failed' },
      acquire: async () => ({ status: 'acquired', revision, leaseToken: 'writer-a' }),
      takeover: async () => ({ status: 'acquired', revision, leaseToken: 'writer-a' }),
      save: async (_owner, _id, _revision, _writer, encounter) => {
        remote = encounter
        return { status: 'saved', id: 'cloud-row', revision: ++revision, leaseToken: 'writer-a' }
      },
    }
    /** Use production session and handoff adapters with actual browser stores. */
    const create = () =>
      new EncounterLifecycle({
        device,
        session: { load: loadSession, save: saveSession, loadOwner: loadOwnerSession },
        authRecovery: {
          load: loadAuthRecovery,
          save: saveAuthRecovery,
          clear: clearAuthRecovery,
          loadConflict: loadAuthRecoveryConflict,
          saveConflict: saveAuthRecoveryConflict,
        },
        cloud,
        clock: { now: () => new Date('2026-09-02T10:11:12.000Z') },
        network: { online: () => connected, subscribe: () => () => undefined },
        scheduler: { after: () => () => undefined },
      })
    const first = create()
    const returned = await first.identify('owner-a')
    expect(returned.conflict?.anonymous).toBe(true)
    expect(await first.resolveConflict(returned.conflict!.id, choice)).not.toBeNull()
    expect(loadSession().status).toBe('empty')
    expect(loadAuthRecovery().status).toBe('empty')
    expect(sessionStorage.getItem('openfray:session:previous')).toBeNull()
    const archived = await device.loadConflict('owner-a')
    expect(archived).toMatchObject({
      unresolved: false,
      device: { snapshot: anonymous },
      cloud: { snapshot: initialCloud },
    })
    connected = online
    const later = snapshot('later-owner-edit')
    later.encounter.combatants = [pc({ name: 'Later owner guard' })]
    const newest = snapshot('newest-owner-edit')
    newest.encounter.combatants = [pc({ name: 'Newest owner guard' })]
    expect(await first.commit(later)).toEqual({ status: 'saved' })
    if (online) expect(await first.ensureCloudEncounter(later.encounter)).toBe('cloud-row')
    expect(await first.commit(newest)).toEqual({ status: 'saved' })
    if (online) expect(await first.ensureCloudEncounter(newest.encounter)).toBe('cloud-row')
    expect(loadOwnerSession('owner-a').snapshot?.encounter.encounterId).toBe('newest-owner-edit')
    await device.close()
    device = new IndexedDbRecovery(name)
    const restarted = create()
    const restored = await restarted.identify('owner-a')
    expect(restored.snapshot?.encounter.encounterId).toBe('newest-owner-edit')
    expect(restored.conflict).toBeUndefined()
    expect(await device.loadConflict('owner-a')).toEqual({ ...archived, id: expect.any(String) })
    expect(restarted.recoveryDownload()?.serialized).toContain('resolved-anonymous')
    await device.close()
    sessionStorage.clear()
  },
)
