// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { Encounter } from '../schema/encounter.ts'
import { decodeSession, encodeSession } from '../codecs/session.ts'

/**
 * Anonymous recovery is mirrored to `sessionStorage`: tab-scoped, cleared on tab
 * close, and never written to the database. The codec validates the whole aggregate
 * before this adapter makes it available to the working board.
 */

export type Theme = 'dark' | 'light'
export type View = 'encounter' | 'compendium'

/** Everything worth restoring to land the GM back where they left off. */
export interface SessionSnapshot {
  encounter: Encounter
  theme: Theme
  view: View
  /** Which combatant's stat block was open; repaired when it no longer exists. */
  selectedId: string | null
  /** The active campaign driving house rules (signed-in only); absent in old blobs. */
  activeCampaignId?: string | null
  /** Whether the shared player board should resume after a reload. */
  sharing?: boolean
}

const KEYS = {
  current: 'openfray:session',
  previous: 'openfray:session:previous',
  quarantine: 'openfray:session:quarantine',
  migrated: 'openfray:session:migrated',
} as const

export type RecoverySlot = keyof typeof KEYS
export interface RecoveryCopy {
  slot: RecoverySlot
  bytes: number
  status: 'valid' | 'invalid' | 'unsupported'
}
export interface RecoveryExport {
  slot: RecoverySlot
  filename: string
  serialized: string
}

export type SessionLoadResult =
  | { status: 'empty'; snapshot: null }
  | { status: 'loaded'; snapshot: SessionSnapshot }
  | {
      status: 'recovered'
      snapshot: SessionSnapshot
      blockedBy: 'invalid' | 'unsupported'
    }
  | {
      status: 'blocked'
      snapshot: null
      blockedBy: 'invalid' | 'unsupported' | 'unavailable'
    }

export type SessionWriteResult =
  | { status: 'saved' }
  | { status: 'deleted' }
  | { status: 'blocked'; reason: 'invalid' | 'unsupported' }
  | { status: 'failed'; reason: 'unavailable' | 'quota' | 'invalid-snapshot' | 'too-large' }

/** Return session storage when the browser allows access. */
function storage(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}

/** Classify a browser storage exception without exposing its message or stored data. */
function storageFailure(error: unknown): 'quota' | 'unavailable' {
  return error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    ? 'quota'
    : 'unavailable'
}

/** Load a validated previous recovery copy, if one exists. */
function previousSnapshot(store: Storage): SessionSnapshot | null {
  const raw = store.getItem(KEYS.previous)
  if (!raw) return null
  const decoded = decodeSession(raw)
  return decoded.status === 'ok' ? decoded.snapshot : null
}

/** Preserve invalid input once without replacing an earlier quarantined value. */
function quarantine(store: Storage, raw: string): void {
  try {
    if (store.getItem(KEYS.quarantine) === null) store.setItem(KEYS.quarantine, raw)
  } catch {
    // The current raw value remains untouched when quarantine storage is unavailable.
  }
}

/** Load only a completely validated snapshot and preserve every rejected current value. */
export function loadSession(): SessionLoadResult {
  const store = storage()
  if (!store) return { status: 'blocked', snapshot: null, blockedBy: 'unavailable' }
  try {
    const raw = store.getItem(KEYS.current)
    if (!raw) return { status: 'empty', snapshot: null }
    const decoded = decodeSession(raw)
    if (decoded.status === 'ok') {
      if (decoded.migratedFrom !== undefined) {
        try {
          if (store.getItem(KEYS.migrated) === null) {
            store.setItem(KEYS.migrated, raw)
            store.setItem(KEYS.current, decoded.canonical)
          }
        } catch {
          // Restore in memory while keeping the original stored value recoverable.
        }
      }
      return { status: 'loaded', snapshot: decoded.snapshot }
    }

    const previous = previousSnapshot(store)
    if (decoded.status === 'unsupported') {
      return previous
        ? { status: 'recovered', snapshot: previous, blockedBy: 'unsupported' }
        : { status: 'blocked', snapshot: null, blockedBy: 'unsupported' }
    }
    quarantine(store, raw)
    return previous
      ? { status: 'recovered', snapshot: previous, blockedBy: 'invalid' }
      : { status: 'blocked', snapshot: null, blockedBy: 'invalid' }
  } catch {
    return { status: 'blocked', snapshot: null, blockedBy: 'unavailable' }
  }
}

/** Convert codec failures into the browser-storage result vocabulary. */
function encodeForStorage(
  snapshot: SessionSnapshot,
): { status: 'ok'; serialized: string } | { status: 'failed'; result: SessionWriteResult } {
  const encoded = encodeSession(snapshot)
  return encoded.status === 'ok'
    ? encoded
    : {
        status: 'failed',
        result: {
          status: 'failed',
          reason: encoded.reason === 'too-large' ? 'too-large' : 'invalid-snapshot',
        },
      }
}

/** Save a canonical snapshot while retaining the previous validated current copy. */
export function saveSession(snapshot: SessionSnapshot): SessionWriteResult {
  const encoded = encodeForStorage(snapshot)
  if (encoded.status === 'failed') return encoded.result
  const store = storage()
  if (!store) return { status: 'failed', reason: 'unavailable' }
  try {
    const current = store.getItem(KEYS.current)
    if (current === null) {
      store.setItem(KEYS.current, encoded.serialized)
      return { status: 'saved' }
    }

    const decoded = decodeSession(current)
    if (decoded.status === 'unsupported') return { status: 'blocked', reason: 'unsupported' }
    if (decoded.status !== 'ok') return { status: 'blocked', reason: 'invalid' }
    const previous = store.getItem(KEYS.previous)
    store.setItem(KEYS.previous, decoded.canonical)
    try {
      store.setItem(KEYS.current, encoded.serialized)
      return { status: 'saved' }
    } catch (error) {
      try {
        if (previous === null) store.removeItem(KEYS.previous)
        else store.setItem(KEYS.previous, previous)
      } catch {
        // The validated current copy still remains when rollback storage also fails.
      }
      return { status: 'failed', reason: storageFailure(error) }
    }
  } catch (error) {
    return { status: 'failed', reason: storageFailure(error) }
  }
}

/** Explicitly replace a blocked or valid current copy with a validated snapshot. */
export function replaceSession(snapshot: SessionSnapshot): SessionWriteResult {
  const encoded = encodeForStorage(snapshot)
  if (encoded.status === 'failed') return encoded.result
  const store = storage()
  if (!store) return { status: 'failed', reason: 'unavailable' }
  try {
    store.setItem(KEYS.current, encoded.serialized)
    return { status: 'saved' }
  } catch (error) {
    return { status: 'failed', reason: storageFailure(error) }
  }
}

/** List bounded recovery metadata without exposing authored values. */
export function listRecoveryCopies(): RecoveryCopy[] {
  const store = storage()
  if (!store) return []
  const copies: RecoveryCopy[] = []
  try {
    for (const slot of Object.keys(KEYS) as RecoverySlot[]) {
      const raw = store.getItem(KEYS[slot])
      if (raw === null) continue
      const decoded = decodeSession(raw)
      copies.push({
        slot,
        bytes: new TextEncoder().encode(raw).byteLength,
        status:
          decoded.status === 'ok'
            ? 'valid'
            : decoded.status === 'unsupported'
              ? 'unsupported'
              : 'invalid',
      })
    }
  } catch {
    return []
  }
  return copies
}

/** Export an exact stored recovery value for a local download. */
export function exportRecoveryCopy(slot: RecoverySlot): RecoveryExport | null {
  const store = storage()
  if (!store) return null
  try {
    const serialized = store.getItem(KEYS[slot])
    return serialized === null
      ? null
      : { slot, filename: `openfray-session-${slot}.json`, serialized }
  } catch {
    return null
  }
}

/** Delete one recovery value only after an explicit request. */
export function deleteRecoveryCopy(slot: RecoverySlot): SessionWriteResult {
  const store = storage()
  if (!store) return { status: 'failed', reason: 'unavailable' }
  try {
    store.removeItem(KEYS[slot])
    return { status: 'deleted' }
  } catch (error) {
    return { status: 'failed', reason: storageFailure(error) }
  }
}

/** Drop all tab-scoped recovery copies. */
export function clearSession(): SessionWriteResult {
  const store = storage()
  if (!store) return { status: 'failed', reason: 'unavailable' }
  try {
    for (const key of Object.values(KEYS)) store.removeItem(key)
    return { status: 'deleted' }
  } catch (error) {
    return { status: 'failed', reason: storageFailure(error) }
  }
}
