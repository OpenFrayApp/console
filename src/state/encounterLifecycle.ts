// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

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

export interface EncounterLifecycleAdapters {
  device: DeviceRecoveryAdapter
  session: SessionRecoveryAdapter
  cloud: CloudEncounterAdapter
  clock: LifecycleClock
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
  private cloudInsert: Promise<string | null> | null = null
  private identityGeneration = 0

  /** Start device recovery immediately and retain the adapters for later identity changes. */
  constructor(adapters: EncounterLifecycleAdapters) {
    this.adapters = adapters
    this.restorePromise = this.restoreOnce()
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
    this.cloudInsert = null

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
  async commit(snapshot: SessionSnapshot): Promise<void> {
    const savedAt = this.adapters.clock.now().toISOString()
    this.adapters.session.save(snapshot)
    const ownerId = this.ownerId
    if (!ownerId) return

    await this.adapters.device.save(ownerId, snapshot, savedAt)
    if (!this.cloudWritable || ownerId !== this.ownerId) return
    await this.saveCloud(snapshot.encounter, savedAt)
  }

  /** Ensure the working encounter has a current cloud row and return its owner-scoped id. */
  async ensureCloudEncounter(encounter: Encounter): Promise<string | null> {
    if (!this.ownerId || !this.cloudWritable) return null
    return this.saveCloud(encounter, this.adapters.clock.now().toISOString())
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

  /** Serialize cloud inserts so autosave and explicit publication cannot create two rows. */
  private async saveCloud(encounter: Encounter, updatedAt: string): Promise<string | null> {
    if (this.cloudId) {
      await this.adapters.cloud.save(this.cloudId, encounter, updatedAt)
      return this.cloudId
    }
    if (!this.cloudInsert) {
      this.cloudInsert = this.adapters.cloud.save(null, encounter, updatedAt).then((id) => {
        if (id) this.cloudId = id
        this.cloudInsert = null
        return id
      })
    }
    return this.cloudInsert
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
  })
}
