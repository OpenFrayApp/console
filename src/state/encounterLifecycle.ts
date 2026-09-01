// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { encodeSession } from '../codecs/session.ts'
import type { Encounter } from '../schema/encounter.ts'
import {
  acquireCloudWriter,
  loadCloudEncounter,
  saveCloudEncounter,
  takeOverCloudWriter,
  type CloudLeaseResult,
  type CloudWriteResult,
  type LoadedEncounter,
} from './cloudEncounter.ts'
import { IndexedDbRecovery } from './indexedDbRecovery.ts'
import { classifyCopies, encounterHash, type RecoveryLineage } from './reconciliation.ts'
import {
  loadSession,
  saveSession,
  type SessionLoadResult,
  type SessionSnapshot,
  type SessionWriteResult,
} from './persistence.ts'

export interface DeviceRecovery {
  ownerId: string
  snapshot: SessionSnapshot
  savedAt: string
  lineage?: RecoveryLineage
}

export interface DeviceRecoveryAdapter {
  loadLatest: () => Promise<DeviceRecovery | null>
  load: (ownerId: string) => Promise<DeviceRecovery | null>
  loadConflict: (ownerId: string) => Promise<ReconciliationConflict | null>
  save: (ownerId: string, snapshot: SessionSnapshot, savedAt: string) => Promise<SessionWriteResult>
  markSynced: (
    ownerId: string,
    snapshot: SessionSnapshot,
    lineage: RecoveryLineage,
  ) => Promise<SessionWriteResult>
  archiveConflict: (
    ownerId: string,
    conflict: ReconciliationConflict,
  ) => Promise<SessionWriteResult>
}

export interface SessionRecoveryAdapter {
  load: () => SessionLoadResult
  save: (snapshot: SessionSnapshot) => SessionWriteResult
}

export interface CloudEncounterAdapter {
  load: () => Promise<LoadedEncounter>
  acquire: (id: string, writerId: string) => Promise<CloudLeaseResult>
  takeover: (id: string, writerId: string) => Promise<CloudLeaseResult>
  save: (
    ownerId: string,
    id: string | null,
    revision: number,
    writerId: string,
    encounter: Encounter,
    updatedAt: string,
  ) => Promise<CloudWriteResult>
}

export interface LifecycleClock {
  now: () => Date
}

export interface LifecycleNetwork {
  online: () => boolean
  subscribe: (listener: () => void) => () => void
}

export interface LifecycleScheduler {
  after: (delay: number, task: () => void | Promise<void>) => () => void
}

export type LifecycleSaveStatus =
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'offline' }
  | { kind: 'sign-in' }
  | { kind: 'read-only' }
  | { kind: 'conflict' }
  | {
      kind: 'failed'
      reason: 'unavailable' | 'quota' | 'invalid-snapshot' | 'too-large' | 'invalid' | 'unsupported'
    }

export interface RecoveryDownload {
  filename: string
  serialized: string
}

/** Whether navigation risks leaving the latest committed action without recovery. */
export function requiresNavigationWarning(status: LifecycleSaveStatus): boolean {
  return status.kind === 'saving' || status.kind === 'failed'
}

/** Warn on browser navigation until the returned cleanup removes the protection. */
export function installNavigationWarning(): () => void {
  /** Mark an unsafe navigation so the browser presents its standard confirmation. */
  const warn = (event: BeforeUnloadEvent) => {
    event.preventDefault()
    event.returnValue = ''
  }
  window.addEventListener('beforeunload', warn)
  return () => window.removeEventListener('beforeunload', warn)
}

export interface EncounterLifecycleAdapters {
  device: DeviceRecoveryAdapter
  session: SessionRecoveryAdapter
  cloud: CloudEncounterAdapter
  clock: LifecycleClock
  network?: LifecycleNetwork
  scheduler?: LifecycleScheduler
}

export type CopyChoice = 'device' | 'cloud'

export interface ReconciliationConflict {
  id: string
  device: { snapshot: SessionSnapshot; activeAt: string }
  cloud: { snapshot: SessionSnapshot; activeAt: string; revision: number }
}

export interface LifecycleRestore {
  ownerId: string | null
  snapshot: SessionSnapshot | null
  savedAt?: string
  playerCode?: string | null
  clearWorkingBoard?: boolean
  conflict?: ReconciliationConflict
}

/** Own recovery ordering, identity changes, and cloud hydration for the working board. */
export class EncounterLifecycle {
  private readonly adapters: EncounterLifecycleAdapters
  private readonly restorePromise: Promise<LifecycleRestore>
  private ownerId: string | null = null
  private cloudId: string | null = null
  private cloudRevision = 0
  private cloudWriterId: string | null = null
  private readonly clientId: string
  private cloudWritable = false
  private cloudIdentityExpired = false
  private cloudQueue: Promise<void> = Promise.resolve()
  private cancelCloudSave: (() => void) | null = null
  private networkUnsubscribe: (() => void) | null = null
  private identityGeneration = 0
  private commitGeneration = 0
  private recoveryQueue: Promise<void> = Promise.resolve()
  private latestSnapshot: SessionSnapshot | null = null
  private pendingConflict: ReconciliationConflict | null = null
  private archivedConflict: ReconciliationConflict | null = null
  private status: LifecycleSaveStatus = { kind: 'saving' }
  private readonly statusListeners = new Set<(status: LifecycleSaveStatus) => void>()

  /** Start device recovery immediately and retain the adapters for later identity changes. */
  constructor(adapters: EncounterLifecycleAdapters, clientId: string = crypto.randomUUID()) {
    this.adapters = adapters
    this.clientId = clientId
    this.restorePromise = this.restoreOnce()
  }

  /** Return the current durability state shown by the console. */
  saveStatus(): LifecycleSaveStatus {
    return this.status
  }

  /** Observe durability changes without exposing storage or cloud adapters. */
  subscribe(listener: (status: LifecycleSaveStatus) => void): () => void {
    this.statusListeners.add(listener)
    if (!this.networkUnsubscribe && this.adapters.network) {
      this.networkUnsubscribe = this.adapters.network.subscribe(() => this.networkChanged())
    }
    return () => {
      this.statusListeners.delete(listener)
      if (this.statusListeners.size === 0) {
        this.networkUnsubscribe?.()
        this.networkUnsubscribe = null
      }
    }
  }

  /** Encode the latest working board for a local recovery download. */
  recoveryDownload(): RecoveryDownload | null {
    const recoverableConflict = this.pendingConflict ?? this.archivedConflict
    if (recoverableConflict) {
      const device = encodeSession(recoverableConflict.device.snapshot)
      const cloud = encodeSession(recoverableConflict.cloud.snapshot)
      if (device.status !== 'ok' || cloud.status !== 'ok') return null
      return {
        filename: 'openfray-recovery-conflict.json',
        serialized: JSON.stringify({
          kind: 'reconciliation-recovery',
          schemaVersion: 1,
          copies: {
            device: {
              activeAt: recoverableConflict.device.activeAt,
              envelope: JSON.parse(device.serialized),
            },
            cloud: {
              activeAt: recoverableConflict.cloud.activeAt,
              revision: recoverableConflict.cloud.revision,
              envelope: JSON.parse(cloud.serialized),
            },
          },
        }),
      }
    }
    if (!this.latestSnapshot) return null
    const encoded = encodeSession(this.latestSnapshot)
    return encoded.status === 'ok'
      ? { filename: 'openfray-recovery.json', serialized: encoded.serialized }
      : null
  }

  /** Retry the most recent committed action after recovery storage failed. */
  retry(): Promise<SessionWriteResult> {
    return this.latestSnapshot
      ? this.commit(this.latestSnapshot)
      : Promise.resolve({ status: 'failed', reason: 'invalid-snapshot' })
  }

  /** Return restart-safe recovery that began before identity or cloud reconciliation. */
  restore(): Promise<LifecycleRestore> {
    return this.restorePromise
  }

  /** Resolve the active identity, then reconcile its recovery copy with the cloud copy. */
  async identify(ownerId: string | null): Promise<LifecycleRestore> {
    const generation = ++this.identityGeneration
    const startup = await this.restore()
    if (generation !== this.identityGeneration) return startup

    const previousOwnerId = this.ownerId
    this.ownerId = ownerId
    this.cloudId = null
    this.cloudRevision = 0
    this.cloudWriterId = null
    this.cloudWritable = false
    this.cloudIdentityExpired = false
    this.pendingConflict = null
    this.archivedConflict = null
    this.cancelCloudSave?.()
    this.cancelCloudSave = null

    if (!ownerId) {
      if (previousOwnerId) {
        return startup.ownerId === null
          ? startup
          : { ownerId: null, snapshot: null, clearWorkingBoard: true }
      }
      return startup.ownerId === null ? startup : this.anonymousRestore()
    }

    let device: DeviceRecovery | null = null
    let deviceUnavailable = false
    try {
      ;[device, this.archivedConflict] = await Promise.all([
        this.adapters.device.load(ownerId),
        this.adapters.device.loadConflict(ownerId),
      ])
    } catch {
      deviceUnavailable = true
    }
    if (generation !== this.identityGeneration) return startup
    const recovery =
      device?.snapshot ??
      (startup.ownerId === ownerId || deviceUnavailable ? startup.snapshot : null)
    const recoverySavedAt =
      device?.savedAt ?? (startup.ownerId === ownerId ? startup.savedAt : undefined)
    const cloud = await this.adapters.cloud.load()
    if (generation !== this.identityGeneration) {
      return { ownerId, snapshot: recovery }
    }

    if (cloud.status === 'failed') {
      return recovery
        ? { ownerId, snapshot: recovery }
        : { ownerId, snapshot: null, clearWorkingBoard: true }
    }
    if (cloud.status === 'empty') {
      this.cloudWritable = true
      this.cloudWriterId = this.clientId
      return recovery
        ? { ownerId, snapshot: recovery }
        : { ownerId, snapshot: null, clearWorkingBoard: true }
    }

    this.cloudId = cloud.id
    const cloudSnapshot: SessionSnapshot = recovery
      ? { ...recovery, encounter: cloud.encounter, selectedId: null }
      : { encounter: cloud.encounter, theme: 'dark', view: 'encounter', selectedId: null }
    let selected = cloudSnapshot
    let selectedAt = cloud.updatedAt
    if (recovery) {
      const relationship =
        cloud.revision === null
          ? (await encounterHash(recovery.encounter)) === (await encounterHash(cloud.encounter))
            ? 'same'
            : 'divergent'
          : await classifyCopies(
              recovery.encounter,
              cloud.encounter,
              cloud.revision,
              device?.lineage,
              cloud.id,
            )
      if (generation !== this.identityGeneration) return { ownerId, snapshot: recovery }
      if (relationship === 'divergent') {
        const conflict: ReconciliationConflict = {
          id: crypto.randomUUID(),
          device: { snapshot: recovery, activeAt: recoverySavedAt ?? cloud.updatedAt },
          cloud: {
            snapshot: cloudSnapshot,
            activeAt: cloud.updatedAt,
            revision: cloud.revision ?? 0,
          },
        }
        this.pendingConflict = conflict
        this.latestSnapshot = recovery
        this.publishStatus({ kind: 'conflict' })
        return {
          ownerId,
          snapshot: recovery,
          savedAt: recoverySavedAt,
          playerCode: cloud.playerCode,
          conflict,
        }
      }
      if (relationship === 'device-descendant') {
        selected = recovery
        selectedAt = recoverySavedAt ?? cloud.updatedAt
      }
    }
    if (cloud.revision !== null) await this.acquireWriter(cloud.id, generation)
    else this.publishStatus({ kind: 'offline' })
    return {
      ownerId,
      snapshot: selected,
      savedAt: selectedAt,
      playerCode: cloud.playerCode,
    }
  }

  /** Fence cloud work after authentication expires while retaining the board and recovery owner. */
  expireIdentity(): void {
    this.identityGeneration += 1
    this.cloudWritable = false
    this.cloudIdentityExpired = true
    this.cloudWriterId = null
    this.cancelCloudSave?.()
    this.cancelCloudSave = null
    this.publishStatus({ kind: 'sign-in' })
  }

  /** Return the latest unresolved conflict branch after local board commits. */
  conflict(): ReconciliationConflict | null {
    return this.pendingConflict
  }

  /** Resolve a displayed divergence only if the cloud revision has not changed meanwhile. */
  async resolveConflict(conflictId: string, choice: CopyChoice): Promise<LifecycleRestore | null> {
    const conflict = this.pendingConflict
    const ownerId = this.ownerId
    if (!conflict || conflict.id !== conflictId || !ownerId || !this.cloudId) return null
    const current = await this.adapters.cloud.load()
    if (
      current.status !== 'loaded' ||
      current.id !== this.cloudId ||
      current.revision !== conflict.cloud.revision
    ) {
      return this.identify(ownerId)
    }
    const archived = await this.adapters.device.archiveConflict(ownerId, conflict)
    if (archived.status !== 'saved') {
      this.publishDeviceFailure(archived)
      return null
    }

    this.pendingConflict = null
    this.archivedConflict = conflict
    const snapshot = choice === 'device' ? conflict.device.snapshot : conflict.cloud.snapshot
    this.latestSnapshot = snapshot
    const generation = this.identityGeneration
    await this.acquireWriter(this.cloudId, generation)
    if (ownerId !== this.ownerId) return null
    if (choice === 'device' && this.cloudWritable) {
      await this.saveCloud(snapshot.encounter, conflict.device.activeAt)
    } else if (choice === 'cloud') {
      const savedAt = this.adapters.clock.now().toISOString()
      const saved = await this.adapters.device.save(ownerId, snapshot, savedAt)
      if (saved.status !== 'saved') {
        this.publishDeviceFailure(saved)
        return null
      }
      await this.adapters.device.markSynced(ownerId, snapshot, {
        cloudEncounterId: this.cloudId,
        cloudRevision: conflict.cloud.revision,
        cloudStateHash: await encounterHash(snapshot.encounter),
      })
      if (this.cloudWritable) this.publishStatus({ kind: 'saved' })
    }
    return {
      ownerId,
      snapshot,
      savedAt: choice === 'device' ? conflict.device.activeAt : conflict.cloud.activeAt,
      playerCode: current.playerCode,
    }
  }

  /** Surface one failed device operation through the shared durability status. */
  private publishDeviceFailure(result: SessionWriteResult): void {
    this.publishStatus({
      kind: 'failed',
      reason: 'reason' in result ? result.reason : 'unavailable',
    })
  }

  /** Acquire cloud authority after reconciliation has selected one working branch. */
  private async acquireWriter(id: string, generation: number): Promise<void> {
    const lease = await this.adapters.cloud.acquire(id, this.clientId)
    if (generation !== this.identityGeneration) return
    if (lease.status === 'acquired') {
      this.cloudWritable = true
      this.cloudRevision = lease.revision
      this.cloudWriterId = lease.leaseToken
    } else if (lease.status === 'read-only') {
      this.cloudRevision = lease.revision
      this.publishStatus({ kind: 'read-only' })
    } else if (lease.status === 'identity-expired') {
      this.expireIdentity()
    } else {
      this.publishStatus({ kind: 'offline' })
    }
  }

  /** Persist one recovery copy locally and mirror it to cloud when identity is established. */
  async commit(snapshot: SessionSnapshot): Promise<SessionWriteResult> {
    const generation = ++this.commitGeneration
    const ownerId = this.ownerId
    const savedAt = this.adapters.clock.now().toISOString()
    this.latestSnapshot = snapshot
    if (this.pendingConflict && ownerId === this.ownerId) {
      this.pendingConflict = {
        ...this.pendingConflict,
        device: { snapshot, activeAt: savedAt },
      }
    }
    this.publishStatus({ kind: 'saving' })

    let resolveWrite: (result: SessionWriteResult) => void = () => undefined
    const recovery = new Promise<SessionWriteResult>((resolve) => {
      resolveWrite = resolve
    })
    this.recoveryQueue = this.recoveryQueue.then(async () => {
      try {
        const sessionResult = this.adapters.session.save(snapshot)
        const result = ownerId
          ? await this.adapters.device.save(ownerId, snapshot, savedAt)
          : sessionResult
        resolveWrite(result)
      } catch {
        resolveWrite({ status: 'failed', reason: 'unavailable' })
      }
    })

    const result = await recovery
    if (generation !== this.commitGeneration) return result

    this.publishStatus(this.statusAfterRecovery(result))
    if (
      result.status === 'saved' &&
      ownerId &&
      this.cloudWritable &&
      ownerId === this.ownerId &&
      (!this.adapters.network || this.adapters.network.online())
    ) {
      this.scheduleCloudSave(ownerId, snapshot.encounter, savedAt, generation)
    }
    return result
  }

  /** Publish one durability state to every mounted status control. */
  private publishStatus(status: LifecycleSaveStatus): void {
    this.status = status
    for (const listener of this.statusListeners) listener(status)
  }

  /** Derive the visible state after recovery, before any deferred cloud write settles. */
  private statusAfterRecovery(result: SessionWriteResult): LifecycleSaveStatus {
    if (result.status !== 'saved') {
      return {
        kind: 'failed',
        reason: 'reason' in result ? result.reason : 'unavailable',
      }
    }
    if (this.pendingConflict) return { kind: 'conflict' }
    if (!this.ownerId) return { kind: 'sign-in' }
    if (this.adapters.network && !this.adapters.network.online()) return { kind: 'offline' }
    if (!this.cloudWritable) {
      if (this.cloudIdentityExpired) return { kind: 'sign-in' }
      return this.status.kind === 'read-only' || this.status.kind === 'sign-in'
        ? this.status
        : { kind: 'offline' }
    }
    return { kind: 'saving' }
  }

  /** Debounce cloud persistence while immediate recovery continues for every commit. */
  private scheduleCloudSave(
    ownerId: string,
    encounter: Encounter,
    savedAt: string,
    generation: number,
  ): void {
    const identityGeneration = this.identityGeneration
    this.cancelCloudSave?.()
    const save = async () => {
      this.cancelCloudSave = null
      if (identityGeneration !== this.identityGeneration || ownerId !== this.ownerId) return
      const id = await this.saveCloud(encounter, savedAt)
      if (generation !== this.commitGeneration || ownerId !== this.ownerId) return
      this.publishStatus(id ? { kind: 'saved' } : this.status)
    }
    this.cancelCloudSave = this.adapters.scheduler
      ? this.adapters.scheduler.after(600, save)
      : (() => {
          const handle = setTimeout(save, 600)
          return () => clearTimeout(handle)
        })()
  }

  /** Checkpoint the cloud copy, replace its writer, and save the current working board. */
  async takeOver(): Promise<boolean> {
    if (!this.ownerId || !this.cloudId || !this.latestSnapshot) return false
    const ownerId = this.ownerId
    const identityGeneration = this.identityGeneration
    const lease = await this.adapters.cloud.takeover(this.cloudId, this.clientId)
    if (identityGeneration !== this.identityGeneration || ownerId !== this.ownerId) return false
    if (lease.status !== 'acquired') {
      this.publishStatus(
        lease.status === 'identity-expired' ? { kind: 'sign-in' } : { kind: 'offline' },
      )
      return false
    }
    this.cloudWritable = true
    this.cloudRevision = lease.revision
    this.cloudWriterId = lease.leaseToken
    this.publishStatus({ kind: 'saving' })
    const id = await this.saveCloud(
      this.latestSnapshot.encounter,
      this.adapters.clock.now().toISOString(),
    )
    this.publishStatus(id ? { kind: 'saved' } : this.status)
    return id !== null
  }

  /** React to connectivity changes without claiming an unverified cloud write succeeded. */
  private networkChanged(): void {
    if (!this.ownerId || this.status.kind === 'failed' || this.status.kind === 'read-only') return
    if (!this.adapters.network?.online()) {
      this.cancelCloudSave?.()
      this.cancelCloudSave = null
      this.publishStatus({ kind: 'offline' })
      return
    }
    if (!this.cloudWritable || !this.latestSnapshot) {
      this.publishStatus({ kind: 'offline' })
      return
    }
    this.publishStatus({ kind: 'saving' })
    this.scheduleCloudSave(
      this.ownerId,
      this.latestSnapshot.encounter,
      this.adapters.clock.now().toISOString(),
      this.commitGeneration,
    )
  }

  /** Ensure the working encounter has a current cloud row and return its owner-scoped id. */
  async ensureCloudEncounter(encounter: Encounter): Promise<string | null> {
    if (!this.ownerId || !this.cloudWritable) return null
    const generation = this.commitGeneration
    this.cancelCloudSave?.()
    this.cancelCloudSave = null
    this.publishStatus({ kind: 'saving' })
    const id = await this.saveCloud(encounter, this.adapters.clock.now().toISOString())
    if (generation === this.commitGeneration) {
      this.publishStatus(id ? { kind: 'saved' } : this.status)
    }
    return id
  }

  /** Restore the device adapter first and retain the session adapter as the rollback path. */
  private async restoreOnce(): Promise<LifecycleRestore> {
    try {
      const device = await this.adapters.device.loadLatest()
      if (device) return device
    } catch {
      // The versioned session copy remains readable when IndexedDB initialization fails.
    }
    return this.anonymousRestore()
  }

  /** Load the tab-scoped session copy without making it durable. */
  private anonymousRestore(): LifecycleRestore {
    const loaded = this.adapters.session.load()
    return { ownerId: null, snapshot: loaded.snapshot }
  }

  /** Serialize cloud writes while the database fences every revision across clients. */
  private saveCloud(encounter: Encounter, updatedAt: string): Promise<string | null> {
    const identityGeneration = this.identityGeneration
    const ownerId = this.ownerId
    let resolveSave: (id: string | null) => void = () => undefined
    const saved = new Promise<string | null>((resolve) => {
      resolveSave = resolve
    })
    this.cloudQueue = this.cloudQueue.then(async () => {
      if (identityGeneration !== this.identityGeneration || ownerId !== this.ownerId) {
        resolveSave(null)
        return
      }
      if (!ownerId || !this.cloudWriterId) {
        this.publishStatus({ kind: 'offline' })
        resolveSave(null)
        return
      }
      try {
        const result = await this.adapters.cloud.save(
          ownerId,
          this.cloudId,
          this.cloudRevision,
          this.cloudWriterId,
          encounter,
          updatedAt,
        )
        if (identityGeneration !== this.identityGeneration || ownerId !== this.ownerId) {
          resolveSave(null)
          return
        }
        if (result.status === 'saved') {
          this.cloudId = result.id
          this.cloudRevision = result.revision
          this.cloudWriterId = result.leaseToken
          const latest = this.latestSnapshot
          if (
            latest &&
            (await encounterHash(latest.encounter)) === (await encounterHash(encounter))
          ) {
            await this.adapters.device.markSynced(ownerId, latest, {
              cloudEncounterId: result.id,
              cloudRevision: result.revision,
              cloudStateHash: await encounterHash(encounter),
            })
          }
          resolveSave(result.id)
          return
        }
        this.cloudWritable = false
        if (result.status === 'stale' || result.status === 'lease-lost') {
          this.cloudRevision = result.revision
          this.publishStatus({ kind: 'read-only' })
        } else if (result.status === 'identity-expired') {
          this.expireIdentity()
        } else {
          this.publishStatus({ kind: 'offline' })
        }
        resolveSave(null)
      } catch {
        if (identityGeneration === this.identityGeneration && ownerId === this.ownerId) {
          this.cloudWritable = false
          this.publishStatus({ kind: 'offline' })
        }
        resolveSave(null)
      }
    })
    return saved
  }
}

/** Create the browser lifecycle with IndexedDB, session, Supabase, and system-clock adapters. */
export function createBrowserEncounterLifecycle(): EncounterLifecycle {
  const device = new IndexedDbRecovery()
  return new EncounterLifecycle({
    device,
    session: { load: loadSession, save: saveSession },
    cloud: {
      load: loadCloudEncounter,
      acquire: acquireCloudWriter,
      takeover: takeOverCloudWriter,
      save: saveCloudEncounter,
    },
    clock: { now: () => new Date() },
    network: {
      online: () => navigator.onLine,
      /** Observe browser connectivity while a lifecycle status consumer is mounted. */
      subscribe(listener) {
        window.addEventListener('online', listener)
        window.addEventListener('offline', listener)
        return () => {
          window.removeEventListener('online', listener)
          window.removeEventListener('offline', listener)
        }
      },
    },
    scheduler: {
      /** Schedule one deferred cloud write and return its cancellation handle. */
      after(delay, task) {
        const handle = window.setTimeout(task, delay)
        return () => window.clearTimeout(handle)
      },
    },
  })
}
