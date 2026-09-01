// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { decodeSession, encodeSession } from '../codecs/session.ts'
import type {
  DeviceRecovery,
  DeviceRecoveryAdapter,
  ReconciliationConflict,
} from './encounterLifecycle.ts'
import type { RecoveryLineage } from './reconciliation.ts'
import {
  storageFailureReason,
  type SessionSnapshot,
  type SessionWriteResult,
} from './persistence.ts'

const DATABASE_NAME = 'openfray-encounter-recovery'
const DATABASE_VERSION = 2
const COPIES = 'copies'
const METADATA = 'metadata'
const CONFLICTS = 'conflicts'
const ACTIVE_OWNER = 'active-owner'

interface RecoveryRecord {
  ownerId: string
  savedAt: string
  serialized: string
  previousSerialized?: string
  previousSavedAt?: string
  lineage?: RecoveryLineage
}

interface ConflictRecord {
  ownerId: string
  deviceSerialized: string
  cloudSerialized: string
  deviceActiveAt: string
  cloudActiveAt: string
  cloudRevision: number
}

interface MetadataRecord {
  key: string
  value: string
}

/** Resolve one IndexedDB request as a promise. */
function requested<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result), { once: true })
    request.addEventListener('error', () => reject(request.error), { once: true })
  })
}

/** Resolve when an IndexedDB transaction commits durably. */
function committed(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve(), { once: true })
    transaction.addEventListener('abort', () => reject(transaction.error), { once: true })
    transaction.addEventListener('error', () => reject(transaction.error), { once: true })
  })
}

/** Convert a shared browser-storage failure reason into a write result. */
function storageFailureResult(error: unknown): SessionWriteResult {
  return { status: 'failed', reason: storageFailureReason(error) }
}

/** Persist owner-scoped, versioned recovery copies in restart-safe IndexedDB storage. */
export class IndexedDbRecovery implements DeviceRecoveryAdapter {
  private readonly name: string
  private databasePromise: Promise<IDBDatabase> | null = null

  /** Select the production database or an isolated database for browser verification. */
  constructor(name = DATABASE_NAME) {
    this.name = name
  }

  /** Load the most recently active signed-in owner's validated recovery copy. */
  async loadLatest(): Promise<DeviceRecovery | null> {
    const database = await this.database()
    const transaction = database.transaction(METADATA, 'readonly')
    const metadata = await requested(
      transaction.objectStore(METADATA).get(ACTIVE_OWNER) as IDBRequest<MetadataRecord | undefined>,
    )
    return metadata ? this.load(metadata.value) : null
  }

  /** Load one owner's recovery copy only after validating its versioned envelope. */
  async load(ownerId: string): Promise<DeviceRecovery | null> {
    const database = await this.database()
    const transaction = database.transaction(COPIES, 'readonly')
    const record = await requested(
      transaction.objectStore(COPIES).get(ownerId) as IDBRequest<RecoveryRecord | undefined>,
    )
    if (!record) return null
    const decoded = decodeSession(record.serialized)
    if (decoded.status === 'ok')
      return {
        ownerId,
        snapshot: decoded.snapshot,
        savedAt: record.savedAt,
        ...(record.lineage ? { lineage: record.lineage } : {}),
      }
    if (decoded.status === 'unsupported' || !record.previousSerialized) return null
    const previous = decodeSession(record.previousSerialized)
    return previous.status === 'ok'
      ? { ownerId, snapshot: previous.snapshot, savedAt: record.previousSavedAt ?? '' }
      : null
  }

  /** Load the latest archived divergence only after validating both stored branches. */
  async loadConflict(ownerId: string): Promise<ReconciliationConflict | null> {
    const database = await this.database()
    const transaction = database.transaction(CONFLICTS, 'readonly')
    const record = await requested(
      transaction.objectStore(CONFLICTS).get(ownerId) as IDBRequest<ConflictRecord | undefined>,
    )
    if (!record) return null
    const device = decodeSession(record.deviceSerialized)
    const cloud = decodeSession(record.cloudSerialized)
    if (device.status !== 'ok' || cloud.status !== 'ok') return null
    return {
      id: crypto.randomUUID(),
      device: { snapshot: device.snapshot, activeAt: record.deviceActiveAt },
      cloud: {
        snapshot: cloud.snapshot,
        activeAt: record.cloudActiveAt,
        revision: record.cloudRevision,
      },
    }
  }

  /** Load the validated recovery copy that immediately preceded the current copy. */
  async loadPrevious(ownerId: string): Promise<DeviceRecovery | null> {
    const database = await this.database()
    const transaction = database.transaction(COPIES, 'readonly')
    const record = await requested(
      transaction.objectStore(COPIES).get(ownerId) as IDBRequest<RecoveryRecord | undefined>,
    )
    if (!record?.previousSerialized) return null
    const decoded = decodeSession(record.previousSerialized)
    return decoded.status === 'ok'
      ? { ownerId, snapshot: decoded.snapshot, savedAt: record.previousSavedAt ?? '' }
      : null
  }

  /** Save a canonical owner recovery copy without overwriting unsupported or invalid data. */
  async save(
    ownerId: string,
    snapshot: SessionSnapshot,
    savedAt: string,
  ): Promise<SessionWriteResult> {
    const encoded = encodeSession(snapshot)
    if (encoded.status !== 'ok') {
      return {
        status: 'failed',
        reason: encoded.reason === 'too-large' ? 'too-large' : 'invalid-snapshot',
      }
    }

    try {
      const database = await this.database()
      const transaction = database.transaction([COPIES, METADATA], 'readwrite')
      const copies = transaction.objectStore(COPIES)
      const current = await requested(copies.get(ownerId) as IDBRequest<RecoveryRecord | undefined>)
      let currentCanonical: string | undefined
      if (current) {
        const decoded = decodeSession(current.serialized)
        if (decoded.status === 'unsupported') {
          transaction.abort()
          return { status: 'blocked', reason: 'unsupported' }
        }
        if (decoded.status !== 'ok') {
          transaction.abort()
          return { status: 'blocked', reason: 'invalid' }
        }
        currentCanonical = decoded.canonical
      }
      copies.put({
        ownerId,
        savedAt,
        serialized: encoded.serialized,
        previousSerialized: currentCanonical,
        previousSavedAt: current?.savedAt,
        lineage: current?.lineage,
      } satisfies RecoveryRecord)
      transaction
        .objectStore(METADATA)
        .put({ key: ACTIVE_OWNER, value: ownerId } satisfies MetadataRecord)
      await committed(transaction)
      return { status: 'saved' }
    } catch (error) {
      return storageFailureResult(error)
    }
  }

  /** Attach proven cloud ancestry only when the same recovery snapshot is still current. */
  async markSynced(
    ownerId: string,
    snapshot: SessionSnapshot,
    lineage: RecoveryLineage,
  ): Promise<SessionWriteResult> {
    const encoded = encodeSession(snapshot)
    if (encoded.status !== 'ok') return { status: 'failed', reason: 'invalid-snapshot' }
    try {
      const database = await this.database()
      const transaction = database.transaction(COPIES, 'readwrite')
      const store = transaction.objectStore(COPIES)
      const current = await requested(store.get(ownerId) as IDBRequest<RecoveryRecord | undefined>)
      if (!current || current.serialized !== encoded.serialized) {
        transaction.abort()
        return { status: 'blocked', reason: 'invalid' }
      }
      store.put({ ...current, lineage } satisfies RecoveryRecord)
      await committed(transaction)
      return { status: 'saved' }
    } catch (error) {
      return storageFailureResult(error)
    }
  }

  /** Preserve both divergent branches in a dedicated owner-scoped recovery slot. */
  async archiveConflict(
    ownerId: string,
    conflict: ReconciliationConflict,
  ): Promise<SessionWriteResult> {
    const deviceEncoded = encodeSession(conflict.device.snapshot)
    const cloudEncoded = encodeSession(conflict.cloud.snapshot)
    if (deviceEncoded.status !== 'ok' || cloudEncoded.status !== 'ok') {
      return { status: 'failed', reason: 'invalid-snapshot' }
    }
    try {
      const database = await this.database()
      const transaction = database.transaction(CONFLICTS, 'readwrite')
      transaction.objectStore(CONFLICTS).put({
        ownerId,
        deviceSerialized: deviceEncoded.serialized,
        cloudSerialized: cloudEncoded.serialized,
        deviceActiveAt: conflict.device.activeAt,
        cloudActiveAt: conflict.cloud.activeAt,
        cloudRevision: conflict.cloud.revision,
      } satisfies ConflictRecord)
      await committed(transaction)
      return { status: 'saved' }
    } catch (error) {
      return storageFailureResult(error)
    }
  }

  /** Close this adapter's database connection so a later instance reopens it from disk. */
  async close(): Promise<void> {
    if (!this.databasePromise) return
    const database = await this.databasePromise
    database.close()
    this.databasePromise = null
  }

  /** Open the schema-versioned database and create its stores on first use. */
  private database(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise
    this.databasePromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new DOMException('IndexedDB unavailable', 'NotSupportedError'))
        return
      }
      const request = indexedDB.open(this.name, DATABASE_VERSION)
      request.addEventListener(
        'upgradeneeded',
        () => {
          const database = request.result
          if (!database.objectStoreNames.contains(COPIES)) {
            database.createObjectStore(COPIES, { keyPath: 'ownerId' })
          }
          if (!database.objectStoreNames.contains(METADATA)) {
            database.createObjectStore(METADATA, { keyPath: 'key' })
          }
          if (!database.objectStoreNames.contains(CONFLICTS)) {
            database.createObjectStore(CONFLICTS, { keyPath: 'ownerId' })
          }
        },
        { once: true },
      )
      request.addEventListener('success', () => resolve(request.result), { once: true })
      request.addEventListener('error', () => reject(request.error), { once: true })
      request.addEventListener('blocked', () => reject(new Error('IndexedDB open blocked')), {
        once: true,
      })
    })
    return this.databasePromise
  }
}
