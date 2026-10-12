// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { emptyEncounter } from './encounter.ts'
import {
  loadAuthRecovery,
  saveAuthRecovery,
  clearAuthRecovery,
  loadAuthRecoveryConflict,
  saveAuthRecoveryConflict,
} from './authRecovery.ts'
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
import { browserWriterIdentity } from './writerIdentity.ts'
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
  authRecovery: SessionRecoveryAdapter & {
    clear: () => SessionWriteResult
    loadConflict: (ownerId: string) => ReconciliationConflict | null
    saveConflict: (ownerId: string, conflict: ReconciliationConflict) => SessionWriteResult
  }
  cloud: CloudEncounterAdapter
  clock: LifecycleClock
  network?: LifecycleNetwork
  scheduler?: LifecycleScheduler
}

export type CopyChoice = 'device' | 'cloud'

export interface ReconciliationConflict {
  id: string
  anonymous?: boolean
  unresolved?: boolean
  cloudEmpty?: boolean
  ownerRecovery?: { snapshot: SessionSnapshot; activeAt: string }
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
  private readonly clientId: Promise<string>
  private cloudWritable = false
  private cloudIdentityExpired = false
  private cloudQueue: Promise<void> = Promise.resolve()
  private cancelCloudSave: (() => void) | null = null
  private networkUnsubscribe: (() => void) | null = null
  private identityGeneration = 0
  private commitGeneration = 0
  private recoveryQueue: Promise<void> = Promise.resolve()
  private latestSnapshot: SessionSnapshot | null = null
  private anonymousSnapshot: SessionSnapshot | null = null
  private pendingConflict: ReconciliationConflict | null = null
  private archivedConflict: ReconciliationConflict | null = null
  private status: LifecycleSaveStatus = { kind: 'saving' }
  private readonly statusListeners = new Set<(status: LifecycleSaveStatus) => void>()

  /** Start device recovery immediately and retain the adapters for later identity changes. */
  constructor(
    adapters: EncounterLifecycleAdapters,
    clientId: string | Promise<string> = crypto.randomUUID(),
  ) {
    this.adapters = adapters
    this.clientId = Promise.resolve(clientId)
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
      const ownerRecovery =
        recoverableConflict.ownerRecovery &&
        encodeSession(recoverableConflict.ownerRecovery.snapshot)
      if (ownerRecovery && ownerRecovery.status !== 'ok') return null
      if (device.status !== 'ok' || cloud.status !== 'ok') return null
      return {
        filename: 'openfray-recovery-conflict.json',
        serialized: JSON.stringify({
          kind: 'reconciliation-recovery',
          schemaVersion: 1,
          copies: {
            ...(ownerRecovery?.status === 'ok'
              ? {
                  ownerRecovery: {
                    activeAt: recoverableConflict.ownerRecovery!.activeAt,
                    envelope: JSON.parse(ownerRecovery.serialized),
                  },
                }
              : {}),
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

  /** Write and read back the latest board before permitting an application reload. */
  async checkpointForUpdate(): Promise<boolean> {
    if (!this.latestSnapshot || this.pendingConflict) return false
    const snapshot = this.latestSnapshot
    const ownerId = this.ownerId
    const identityGeneration = this.identityGeneration
    const expected = encodeSession(snapshot)
    if (expected.status !== 'ok') return false
    const write = this.commit(snapshot)
    const generation = this.commitGeneration
    try {
      if ((await write).status !== 'saved') return false
      const recovered = ownerId
        ? (await this.adapters.device.load(ownerId))?.snapshot
        : this.adapters.session.load().snapshot
      if (!recovered) return false
      const actual = encodeSession(recovered)
      return (
        generation === this.commitGeneration &&
        identityGeneration === this.identityGeneration &&
        !this.pendingConflict &&
        actual.status === 'ok' &&
        actual.serialized === expected.serialized
      )
    } catch {
      return false
    }
  }

  /** Checkpoint recovery and drain writable cloud work before same-tab site sign-in. */
  async checkpointForSignIn(): Promise<boolean> {
    if (!this.latestSnapshot) return false
    if (this.pendingConflict) return this.checkpointExpiredConflict()
    const ownerId = this.ownerId
    const identityGeneration = this.identityGeneration
    if (ownerId) {
      const drainCloud = this.cloudWritable && !this.cloudIdentityExpired
      if (!(await this.checkpointForUpdate())) return false
      const generation = this.commitGeneration
      this.cancelCloudSave?.()
      this.cancelCloudSave = null
      await this.cloudQueue
      if (identityGeneration !== this.identityGeneration || generation !== this.commitGeneration)
        return false
      if (drainCloud) {
        if (
          !this.cloudWritable ||
          !(await this.ensureCloudEncounter(this.latestSnapshot.encounter))
        )
          return false
      }
      return identityGeneration === this.identityGeneration && generation === this.commitGeneration
    }
    const snapshot = this.latestSnapshot
    const write = this.commit(snapshot)
    const generation = this.commitGeneration
    if ((await write).status !== 'saved') return false
    const result = this.adapters.authRecovery.save(snapshot)
    if (result.status !== 'saved') {
      this.publishDeviceFailure(result)
      return false
    }
    const recovered = this.adapters.authRecovery.load().snapshot
    const expected = encodeSession(snapshot)
    const actual = recovered && encodeSession(recovered)
    return (
      generation === this.commitGeneration &&
      identityGeneration === this.identityGeneration &&
      expected.status === 'ok' &&
      actual?.status === 'ok' &&
      expected.serialized === actual.serialized
    )
  }

  /** Verify unresolved copies before renewal without cloud reads or expired write authority. */
  private async checkpointExpiredConflict(): Promise<boolean> {
    const ownerId = this.ownerId
    if (!ownerId || !this.cloudIdentityExpired || !this.pendingConflict || !this.latestSnapshot)
      return false
    const identityGeneration = this.identityGeneration
    const write = this.commit(this.latestSnapshot)
    const commitGeneration = this.commitGeneration
    try {
      if ((await write).status !== 'saved') return false
      const conflict = this.pendingConflict
      if (
        !conflict ||
        identityGeneration !== this.identityGeneration ||
        commitGeneration !== this.commitGeneration
      )
        return false
      const unresolved = { ...conflict, unresolved: true }
      const saved = conflict.anonymous
        ? this.adapters.authRecovery.saveConflict(ownerId, unresolved)
        : await this.adapters.device.archiveConflict(ownerId, unresolved)
      if (
        identityGeneration !== this.identityGeneration ||
        commitGeneration !== this.commitGeneration
      )
        return false
      if (saved.status !== 'saved') {
        this.publishDeviceFailure(saved)
        return false
      }
      const recovered = conflict.anonymous
        ? this.adapters.authRecovery.loadConflict(ownerId)
        : await this.adapters.device.loadConflict(ownerId)
      if (
        identityGeneration !== this.identityGeneration ||
        commitGeneration !== this.commitGeneration
      )
        return false
      if (!recovered?.unresolved) {
        this.publishStatus({ kind: 'failed', reason: 'unavailable' })
        return false
      }
      const preserved = (['device', 'cloud', 'ownerRecovery'] as const).every((key) => {
        const expected = conflict[key]
        if (!expected) return true
        const actual = recovered[key]
        if (!actual || expected.activeAt !== actual.activeAt) return false
        const before = encodeSession(expected.snapshot)
        const after = encodeSession(actual.snapshot)
        return (
          before.status === 'ok' && after.status === 'ok' && before.serialized === after.serialized
        )
      })
      if (
        !preserved ||
        Boolean(conflict.anonymous) !== Boolean(recovered.anonymous) ||
        Boolean(conflict.cloudEmpty) !== Boolean(recovered.cloudEmpty) ||
        conflict.cloud.revision !== recovered.cloud.revision
      ) {
        this.publishStatus({ kind: 'failed', reason: 'unavailable' })
        return false
      }
      this.publishStatus({ kind: 'sign-in' })
      return true
    } catch {
      this.publishStatus({ kind: 'failed', reason: 'unavailable' })
      return false
    }
  }

  /** Return restart-safe recovery that began before identity or cloud reconciliation. */
  restore(): Promise<LifecycleRestore> {
    return this.restorePromise
  }

  /** Resume device recovery during an outage without treating its owner as authenticated. */
  async resumeOffline(): Promise<LifecycleRestore> {
    const generation = this.identityGeneration
    const startup = await this.restore()
    if (generation !== this.identityGeneration) {
      return {
        ownerId: this.ownerId,
        snapshot: this.cloudIdentityExpired ? this.latestSnapshot : null,
      }
    }
    if (!this.latestSnapshot) {
      this.ownerId = startup.ownerId
      this.latestSnapshot = startup.snapshot
    }
    this.expireIdentity()
    return { ownerId: this.ownerId, snapshot: this.latestSnapshot }
  }

  /** Resolve the active identity, then reconcile its recovery copy with the cloud copy. */
  async identify(ownerId: string | null): Promise<LifecycleRestore> {
    const generation = ++this.identityGeneration
    const [startup, clientId] = await Promise.all([this.restore(), this.clientId])
    if (generation !== this.identityGeneration) return startup

    const previousOwnerId = this.ownerId
    const anonymous = !previousOwnerId
      ? (this.latestSnapshot ??
        this.adapters.authRecovery.load().snapshot ??
        (startup.ownerId === null ? startup.snapshot : null))
      : this.anonymousSnapshot
    this.anonymousSnapshot =
      ownerId &&
      anonymous &&
      (anonymous.encounter.combatants.length > 0 ||
        anonymous.encounter.log.length > 0 ||
        anonymous.encounter.round > 0)
        ? anonymous
        : null
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
      this.anonymousSnapshot ??
      device?.snapshot ??
      (startup.ownerId === ownerId || (deviceUnavailable && startup.ownerId === null)
        ? startup.snapshot
        : null)
    const retainedConflict = this.anonymousSnapshot
      ? this.adapters.authRecovery.loadConflict(ownerId)
      : this.archivedConflict?.unresolved
        ? this.archivedConflict
        : null
    const ownerRecovery =
      retainedConflict?.ownerRecovery ??
      (this.anonymousSnapshot && device
        ? { snapshot: device.snapshot, activeAt: device.savedAt }
        : this.archivedConflict?.ownerRecovery)
    const recoverySavedAt =
      device?.savedAt ?? (startup.ownerId === ownerId ? startup.savedAt : undefined)
    const cloud =
      this.adapters.network && !this.adapters.network.online()
        ? { status: 'failed' as const }
        : await this.adapters.cloud.load()
    if (generation !== this.identityGeneration) {
      return { ownerId, snapshot: recovery }
    }

    if (cloud.status === 'failed') {
      if (retainedConflict) {
        this.pendingConflict = retainedConflict
        this.latestSnapshot = retainedConflict.device.snapshot
        this.publishStatus({ kind: 'conflict' })
        return { ownerId, snapshot: retainedConflict.device.snapshot, conflict: retainedConflict }
      }
      if (recovery) this.latestSnapshot = recovery
      return recovery
        ? { ownerId, snapshot: recovery }
        : { ownerId, snapshot: null, clearWorkingBoard: true }
    }
    if (cloud.status === 'empty' && this.anonymousSnapshot) {
      const activeAt = this.adapters.clock.now().toISOString()
      const conflict: ReconciliationConflict = {
        id: crypto.randomUUID(),
        anonymous: true,
        cloudEmpty: true,
        ...(ownerRecovery ? { ownerRecovery } : {}),
        device: { snapshot: this.anonymousSnapshot, activeAt },
        cloud: {
          snapshot: { ...this.anonymousSnapshot, encounter: emptyEncounter(), selectedId: null },
          activeAt,
          revision: 0,
        },
      }
      this.pendingConflict = conflict
      this.latestSnapshot = this.anonymousSnapshot
      this.publishStatus({ kind: 'conflict' })
      return { ownerId, snapshot: this.anonymousSnapshot, conflict }
    }
    if (cloud.status === 'empty') {
      this.cloudWritable = true
      this.cloudWriterId = clientId
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
      const relationship = this.anonymousSnapshot
        ? 'divergent'
        : cloud.revision === null
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
          anonymous: Boolean(this.anonymousSnapshot),
          ...(ownerRecovery ? { ownerRecovery } : {}),
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
    if (!conflict || conflict.id !== conflictId || !ownerId || this.cloudIdentityExpired)
      return null
    const generation = this.identityGeneration
    const current = await this.adapters.cloud.load()
    if (generation !== this.identityGeneration) return null
    if (
      conflict.cloudEmpty
        ? current.status !== 'empty'
        : current.status !== 'loaded' ||
          current.id !== this.cloudId ||
          current.revision !== conflict.cloud.revision
    ) {
      return this.identify(ownerId)
    }
    if (this.cloudId && current.status === 'loaded' && current.revision !== null) {
      await this.acquireWriter(this.cloudId, generation)
      if (generation !== this.identityGeneration) return null
      if (this.cloudWritable && this.cloudRevision !== conflict.cloud.revision)
        return this.identify(ownerId)
    }
    const resolvedConflict = { ...conflict, unresolved: false }
    const archived = await this.adapters.device.archiveConflict(ownerId, resolvedConflict)
    if (generation !== this.identityGeneration) return null
    if (archived.status !== 'saved') {
      this.publishDeviceFailure(archived)
      return null
    }

    const snapshot = choice === 'device' ? conflict.device.snapshot : conflict.cloud.snapshot
    const savedAt = this.adapters.clock.now().toISOString()
    const saved = await this.adapters.device.save(ownerId, snapshot, savedAt)
    if (generation !== this.identityGeneration) return null
    if (saved.status !== 'saved') {
      this.publishDeviceFailure(saved)
      return null
    }
    if (conflict.anonymous) {
      const cleared = this.adapters.authRecovery.clear()
      if (cleared.status !== 'deleted') {
        this.publishDeviceFailure(cleared)
        return null
      }
    }
    this.pendingConflict = null
    this.anonymousSnapshot = null
    this.archivedConflict = resolvedConflict
    this.latestSnapshot = snapshot
    if (!this.cloudId) {
      this.cloudWritable = true
      this.cloudWriterId = await this.clientId
    }
    if (generation !== this.identityGeneration) return null
    if (choice === 'device' && this.cloudWritable) {
      await this.saveCloud(snapshot.encounter, conflict.device.activeAt)
    } else if (choice === 'cloud' && this.cloudId) {
      await this.adapters.device.markSynced(ownerId, snapshot, {
        cloudEncounterId: this.cloudId,
        cloudRevision: conflict.cloud.revision,
        cloudStateHash: await encounterHash(snapshot.encounter),
      })
    }
    if (generation !== this.identityGeneration) return null
    if (this.cloudWritable) this.publishStatus({ kind: 'saved' })
    return {
      ownerId,
      snapshot,
      savedAt,
      playerCode: current.status === 'loaded' ? current.playerCode : null,
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
    const clientId = await this.clientId
    if (generation !== this.identityGeneration) return
    const lease = await this.adapters.cloud.acquire(id, clientId)
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
    const anonymousRecovery =
      Boolean(this.anonymousSnapshot) ||
      (!ownerId && this.adapters.authRecovery.load().snapshot !== null)
    const savedAt = this.adapters.clock.now().toISOString()
    this.latestSnapshot = snapshot
    if (this.anonymousSnapshot) this.anonymousSnapshot = snapshot
    if (this.pendingConflict && ownerId === this.ownerId) {
      this.pendingConflict = {
        ...this.pendingConflict,
        device: { snapshot, activeAt: savedAt },
      }
    }
    // A device checkpoint must keep the cloud writer's takeover control available.
    if (this.status.kind !== 'read-only') this.publishStatus({ kind: 'saving' })

    let resolveWrite: (result: SessionWriteResult) => void = () => undefined
    const recovery = new Promise<SessionWriteResult>((resolve) => {
      resolveWrite = resolve
    })
    this.recoveryQueue = this.recoveryQueue.then(async () => {
      try {
        const sessionResult = this.adapters.session.save(snapshot)
        const result = anonymousRecovery
          ? this.adapters.authRecovery.save(snapshot)
          : ownerId
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
      !this.pendingConflict &&
      !this.anonymousSnapshot &&
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
    if (this.cloudIdentityExpired) return { kind: 'sign-in' }
    if (this.pendingConflict) return { kind: 'conflict' }
    if (!this.ownerId) return { kind: 'sign-in' }
    if (this.anonymousSnapshot) return { kind: 'offline' }
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
    if (
      !this.ownerId ||
      !this.cloudId ||
      !this.latestSnapshot ||
      this.pendingConflict ||
      this.anonymousSnapshot
    )
      return false
    const ownerId = this.ownerId
    const identityGeneration = this.identityGeneration
    const clientId = await this.clientId
    if (identityGeneration !== this.identityGeneration || ownerId !== this.ownerId) return false
    const lease = await this.adapters.cloud.takeover(this.cloudId, clientId)
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
    if (
      !this.ownerId ||
      this.pendingConflict ||
      this.anonymousSnapshot ||
      this.status.kind === 'failed' ||
      this.status.kind === 'read-only'
    )
      return
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

  /** Identify the reconciled cloud encounter only while this tab holds its write authority. */
  writableEncounter(): { ownerId: string; id: string } | null {
    if (
      !this.ownerId ||
      !this.cloudId ||
      !this.cloudWritable ||
      this.cloudIdentityExpired ||
      this.pendingConflict
    )
      return null
    return { ownerId: this.ownerId, id: this.cloudId }
  }

  /** Ensure the working encounter has a current cloud row and return its owner-scoped id. */
  async ensureCloudEncounter(encounter: Encounter): Promise<string | null> {
    if (!this.ownerId || !this.cloudWritable || this.pendingConflict || this.anonymousSnapshot)
      return null
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
    const handoff = this.adapters.authRecovery.load()
    if (handoff.snapshot) return { ownerId: null, snapshot: handoff.snapshot }
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
    const handoff = this.adapters.authRecovery.load()
    const loaded = handoff.snapshot ? handoff : this.adapters.session.load()
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
  return new EncounterLifecycle(
    {
      device,
      session: { load: loadSession, save: saveSession },
      authRecovery: {
        load: loadAuthRecovery,
        save: saveAuthRecovery,
        clear: clearAuthRecovery,
        loadConflict: loadAuthRecoveryConflict,
        saveConflict: saveAuthRecoveryConflict,
      },
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
    },
    browserWriterIdentity(),
  )
}
