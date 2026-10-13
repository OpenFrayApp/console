// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { Encounter } from '../schema/encounter.ts'
import { decodeSession, encodeSession } from '../codecs/session.ts'

/**
 * Browser recovery is tab-scoped and never written to the database. Anonymous
 * snapshots and explicitly owner-tagged rollback mirrors use separate slots.
 * The codec validates the aggregate before this adapter exposes a recovery copy.
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
  owner: 'openfray:session:owner',
  ownerPrevious: 'openfray:session:owner:previous',
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
  | { status: 'loaded'; snapshot: SessionSnapshot; ownerId?: string }
  | {
      status: 'recovered'
      ownerId?: string
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
export function storageFailureReason(error: unknown): 'quota' | 'unavailable' {
  return error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    ? 'quota'
    : 'unavailable'
}

/** Preserve invalid input once without replacing an earlier quarantined value. */
function quarantine(store: Storage, raw: string): void {
  try {
    if (store.getItem(KEYS.quarantine) === null) store.setItem(KEYS.quarantine, raw)
  } catch {
    // The current raw value remains untouched when quarantine storage is unavailable.
  }
}

/** Decode browser recovery only when its explicit provenance matches the storage slot. */
function browserRecovery(
  raw: string,
  ownerMirror: boolean,
): { snapshot: SessionSnapshot; ownerId?: string } | null {
  const decoded = decodeSession(raw)
  if (decoded.status !== 'ok') return null
  if (ownerMirror ? typeof decoded.recoveryOwnerId !== 'string' : decoded.recoveryOwnerId !== null)
    return null
  return {
    snapshot: decoded.snapshot,
    ...(ownerMirror ? { ownerId: decoded.recoveryOwnerId as string } : {}),
  }
}

/** Load provenance-validated browser recovery without assigning ownership to legacy bytes. */
function loadRecovery(ownerMirror: boolean): SessionLoadResult {
  const store = storage()
  if (!store) return { status: 'blocked', snapshot: null, blockedBy: 'unavailable' }
  try {
    const raw = store.getItem(ownerMirror ? KEYS.owner : KEYS.current)
    if (!raw) return { status: 'empty', snapshot: null }
    const recovered = browserRecovery(raw, ownerMirror)
    if (recovered) return { status: 'loaded', ...recovered }
    const decoded = decodeSession(raw)
    const blockedBy = decoded.status === 'unsupported' ? 'unsupported' : 'invalid'
    if (blockedBy === 'invalid') quarantine(store, raw)
    const previousRaw = store.getItem(ownerMirror ? KEYS.ownerPrevious : KEYS.previous)
    const previous = previousRaw && browserRecovery(previousRaw, ownerMirror)
    return previous
      ? { status: 'recovered', ...previous, blockedBy }
      : { status: 'blocked', snapshot: null, blockedBy }
  } catch {
    return { status: 'blocked', snapshot: null, blockedBy: 'unavailable' }
  }
}

/** Load only explicitly anonymous tab recovery. */
export function loadSession(): SessionLoadResult {
  return loadRecovery(false)
}

/** Load the separate owner-tagged tab rollback mirror without granting identity authority. */
export function loadOwnerSession(ownerId?: string): SessionLoadResult {
  const loaded = loadRecovery(true)
  if (ownerId === undefined || (loaded.snapshot && loaded.ownerId === ownerId)) return loaded
  try {
    const previousRaw = storage()?.getItem(KEYS.ownerPrevious)
    const previous = previousRaw && browserRecovery(previousRaw, true)
    return previous && previous.ownerId === ownerId
      ? { status: 'loaded', ...previous }
      : { status: 'empty', snapshot: null }
  } catch {
    return { status: 'blocked', snapshot: null, blockedBy: 'unavailable' }
  }
}

/** Convert codec failures into the browser-storage result vocabulary. */
function encodeForStorage(
  snapshot: SessionSnapshot,
  ownerId: string | null,
): { status: 'ok'; serialized: string } | { status: 'failed'; result: SessionWriteResult } {
  const encoded = encodeSession(snapshot, ownerId)
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
export function saveSession(
  snapshot: SessionSnapshot,
  ownerId: string | null = null,
): SessionWriteResult {
  const encoded = encodeForStorage(snapshot, ownerId)
  if (encoded.status === 'failed') return encoded.result
  const store = storage()
  if (!store) return { status: 'failed', reason: 'unavailable' }
  const currentKey = ownerId === null ? KEYS.current : KEYS.owner
  const previousKey = ownerId === null ? KEYS.previous : KEYS.ownerPrevious
  try {
    const current = store.getItem(currentKey)
    if (current === null) {
      store.setItem(currentKey, encoded.serialized)
      if (store.getItem(currentKey) !== encoded.serialized)
        return { status: 'failed', reason: 'unavailable' }
      return { status: 'saved' }
    }

    const decoded = decodeSession(current)
    if (decoded.status === 'unsupported') return { status: 'blocked', reason: 'unsupported' }
    if (decoded.status !== 'ok' || !browserRecovery(current, ownerId !== null))
      return { status: 'blocked', reason: 'invalid' }
    const previous = store.getItem(previousKey)
    if (previous !== null && !browserRecovery(previous, ownerId !== null)) {
      quarantine(store, previous)
      if (store.getItem(KEYS.quarantine) !== previous)
        return { status: 'blocked', reason: 'invalid' }
    }
    store.setItem(previousKey, decoded.canonical)
    try {
      store.setItem(currentKey, encoded.serialized)
      if (store.getItem(currentKey) !== encoded.serialized)
        throw new Error('Recovery readback failed')
      return { status: 'saved' }
    } catch (error) {
      try {
        if (store.getItem(currentKey) !== current) store.setItem(currentKey, current)
      } catch {
        // A denied current rollback must not prevent rollback of the previous copy.
      }
      try {
        if (previous === null) store.removeItem(previousKey)
        else store.setItem(previousKey, previous)
      } catch {
        // The original or partial current value remains available for recovery export.
      }
      return { status: 'failed', reason: storageFailureReason(error) }
    }
  } catch (error) {
    return { status: 'failed', reason: storageFailureReason(error) }
  }
}

/** Consume verified anonymous aliases and the archived handoff as one readback-checked operation. */
export function consumeAnonymousSession(
  clearHandoff: () => SessionWriteResult,
): SessionWriteResult {
  const store = storage()
  if (!store) return { status: 'failed', reason: 'unavailable' }
  const copies: Array<{ key: string; raw: string }> = []
  /** Restore only removed aliases, without overwriting newly retained or unknown bytes. */
  const rollback = () => {
    for (const { key, raw } of copies) {
      try {
        if (store.getItem(key) === null) store.setItem(key, raw)
      } catch {
        // Durable archived branches and the handoff remain recoverable if rollback is denied.
      }
    }
  }
  try {
    for (const key of [KEYS.current, KEYS.previous]) {
      const raw = store.getItem(key)
      if (raw !== null && browserRecovery(raw, false)) copies.push({ key, raw })
    }
    for (const { key, raw } of copies) {
      if (store.getItem(key) !== raw) throw new Error('Recovery changed before consumption')
      store.removeItem(key)
      if (store.getItem(key) !== null) throw new Error('Recovery removal readback failed')
    }
    const result = clearHandoff()
    if (result.status !== 'deleted') rollback()
    return result
  } catch (error) {
    rollback()
    return { status: 'failed', reason: storageFailureReason(error) }
  }
}

/** Explicitly replace a blocked or valid current copy with a validated snapshot. */
export function replaceSession(snapshot: SessionSnapshot): SessionWriteResult {
  const encoded = encodeForStorage(snapshot, null)
  if (encoded.status === 'failed') return encoded.result
  const store = storage()
  if (!store) return { status: 'failed', reason: 'unavailable' }
  try {
    store.setItem(KEYS.current, encoded.serialized)
    return store.getItem(KEYS.current) === encoded.serialized
      ? { status: 'saved' }
      : { status: 'failed', reason: 'unavailable' }
  } catch (error) {
    return { status: 'failed', reason: storageFailureReason(error) }
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

/** Export unverified retained browser bytes without restoring them onto any working board. */
export function exportRetainedSession(): RecoveryExport | null {
  for (const slot of ['current', 'previous', 'quarantine'] as const) {
    const copy = exportRecoveryCopy(slot)
    if (!copy) continue
    const decoded = decodeSession(copy.serialized)
    if (decoded.status !== 'ok' || decoded.recoveryOwnerId === undefined) return copy
  }
  return null
}

/** Delete one recovery value only after an explicit request. */
export function deleteRecoveryCopy(slot: RecoverySlot): SessionWriteResult {
  const store = storage()
  if (!store) return { status: 'failed', reason: 'unavailable' }
  try {
    store.removeItem(KEYS[slot])
    return { status: 'deleted' }
  } catch (error) {
    return { status: 'failed', reason: storageFailureReason(error) }
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
    return { status: 'failed', reason: storageFailureReason(error) }
  }
}
