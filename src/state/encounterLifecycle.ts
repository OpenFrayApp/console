// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { encodeSession } from '../codecs/session.ts'
import type { Encounter } from '../schema/encounter.ts'
import { loadCloudEncounter, saveCloudEncounter, type LoadedEncounter } from './cloudEncounter.ts'
import { IndexedDbRecovery } from './indexedDbRecovery.ts'
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
}

export interface DeviceRecoveryAdapter {
  loadLatest: () => Promise<DeviceRecovery | null>
  load: (ownerId: string) => Promise<DeviceRecovery | null>
  save: (ownerId: string, snapshot: SessionSnapshot, savedAt: string) => Promise<SessionWriteResult>
}

export interface SessionRecoveryAdapter {
  load: () => SessionLoadResult
  save: (snapshot: SessionSnapshot) => SessionWriteResult
}

export interface CloudEncounterAdapter {
  load: () => Promise<LoadedEncounter>
  save: (id: string | null, encounter: Encounter, updatedAt: string) => Promise<string | null>
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

export interface LifecycleRestore {
  ownerId: string | null
  snapshot: SessionSnapshot | null
  playerCode?: string | null
  clearWorkingBoard?: boolean
}

/** Own recovery ordering, identity changes, and cloud hydration for the working board. */
export class EncounterLifecycle {
  private readonly adapters: EncounterLifecycleAdapters
  private readonly restorePromise: Promise<LifecycleRestore>
  private ownerId: string | null = null
  private cloudId: string | null = null
  private cloudWritable = false
  private cloudQueue: Promise<void> = Promise.resolve()
  private cancelCloudSave: (() => void) | null = null
  private networkUnsubscribe: (() => void) | null = null
  private identityGeneration = 0
  private commitGeneration = 0
  private recoveryQueue: Promise<void> = Promise.resolve()
  private latestSnapshot: SessionSnapshot | null = null
  private status: LifecycleSaveStatus = { kind: 'saving' }
  private readonly statusListeners = new Set<(status: LifecycleSaveStatus) => void>()

  /** Start device recovery immediately and retain the adapters for later identity changes. */
  constructor(adapters: EncounterLifecycleAdapters) {
    this.adapters = adapters
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
    this.cloudWritable = false
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
      device = await this.adapters.device.load(ownerId)
    } catch {
      deviceUnavailable = true
    }
    if (generation !== this.identityGeneration) return startup
    const recovery =
      device?.snapshot ??
      (startup.ownerId === ownerId || deviceUnavailable ? startup.snapshot : null)
    const cloud = await this.adapters.cloud.load()
    if (generation !== this.identityGeneration) {
      return { ownerId, snapshot: recovery }
    }

    if (cloud.status === 'failed') {
      return recovery
        ? { ownerId, snapshot: recovery }
        : { ownerId, snapshot: null, clearWorkingBoard: true }
    }
    this.cloudWritable = true
    if (cloud.status === 'empty') {
      return recovery
        ? { ownerId, snapshot: recovery }
        : { ownerId, snapshot: null, clearWorkingBoard: true }
    }

    this.cloudId = cloud.id
    return {
      ownerId,
      snapshot: recovery
        ? { ...recovery, encounter: cloud.encounter, selectedId: null }
        : {
            encounter: cloud.encounter,
            theme: 'dark',
            view: 'encounter',
            selectedId: null,
          },
      playerCode: cloud.playerCode,
    }
  }

  /** Persist one recovery copy locally and mirror it to cloud when identity is established. */
  async commit(snapshot: SessionSnapshot): Promise<SessionWriteResult> {
    const generation = ++this.commitGeneration
    const ownerId = this.ownerId
    const savedAt = this.adapters.clock.now().toISOString()
    this.latestSnapshot = snapshot
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
    if (!this.ownerId) return { kind: 'sign-in' }
    if (this.adapters.network && !this.adapters.network.online()) return { kind: 'offline' }
    return this.cloudWritable ? { kind: 'saving' } : { kind: 'offline' }
  }

  /** Debounce cloud persistence while immediate recovery continues for every commit. */
  private scheduleCloudSave(
    ownerId: string,
    encounter: Encounter,
    savedAt: string,
    generation: number,
  ): void {
    this.cancelCloudSave?.()
    const save = async () => {
      this.cancelCloudSave = null
      const id = await this.saveCloud(encounter, savedAt)
      if (generation !== this.commitGeneration || ownerId !== this.ownerId) return
      this.publishStatus(id ? { kind: 'saved' } : { kind: 'offline' })
    }
    this.cancelCloudSave = this.adapters.scheduler
      ? this.adapters.scheduler.after(600, save)
      : (() => {
          const handle = setTimeout(save, 600)
          return () => clearTimeout(handle)
        })()
  }

  /** React to connectivity changes without claiming an unverified cloud write succeeded. */
  private networkChanged(): void {
    if (!this.ownerId || this.status.kind === 'failed') return
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
      this.publishStatus(id ? { kind: 'saved' } : { kind: 'offline' })
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

  /** Serialize every cloud write so an older snapshot cannot finish after a newer one. */
  private saveCloud(encounter: Encounter, updatedAt: string): Promise<string | null> {
    let resolveSave: (id: string | null) => void = () => undefined
    const saved = new Promise<string | null>((resolve) => {
      resolveSave = resolve
    })
    this.cloudQueue = this.cloudQueue.then(async () => {
      try {
        const id = await this.adapters.cloud.save(this.cloudId, encounter, updatedAt)
        if (id) this.cloudId = id
        resolveSave(id)
      } catch {
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
