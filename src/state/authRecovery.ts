// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import * as v from 'valibot'
import { decodeSession, encodeSession, MAX_SESSION_BYTES } from '../codecs/session.ts'
import type { ReconciliationConflict } from './encounterLifecycle.ts'
import {
  storageFailureReason,
  type SessionLoadResult,
  type SessionSnapshot,
  type SessionWriteResult,
} from './persistence.ts'

const KEY = 'openfray:auth-recovery'
const branch = v.strictObject({ envelope: v.unknown(), activeAt: v.string() })
const conflictEnvelope = v.strictObject({
  kind: v.literal('auth-recovery'),
  schemaVersion: v.literal(1),
  ownerId: v.pipe(v.string(), v.minLength(1)),
  conflict: v.strictObject({
    id: v.string(),
    anonymous: v.literal(true),
    unresolved: v.literal(true),
    cloudEmpty: v.optional(v.boolean()),
    device: branch,
    cloud: v.strictObject({
      envelope: v.unknown(),
      activeAt: v.string(),
      revision: v.pipe(v.number(), v.integer(), v.minValue(0)),
    }),
    ownerRecovery: v.optional(branch),
  }),
})

type AuthRecoveryRead = {
  result: SessionLoadResult
  conflict?: { ownerId: string; value: ReconciliationConflict }
}

/** Validate a versioned conflict envelope while retaining legacy session-only handoffs. */
function readRecovery(raw: string | null): AuthRecoveryRead {
  if (!raw) return { result: { status: 'empty', snapshot: null } }
  const input: unknown = JSON.parse(raw)
  if (
    typeof input === 'object' &&
    input !== null &&
    'kind' in input &&
    input.kind === 'auth-recovery'
  ) {
    if (!('schemaVersion' in input) || input.schemaVersion !== 1)
      return { result: { status: 'blocked', snapshot: null, blockedBy: 'unsupported' } }
    if (new TextEncoder().encode(raw).byteLength > MAX_SESSION_BYTES * 3 + 8192)
      return { result: { status: 'blocked', snapshot: null, blockedBy: 'invalid' } }
    const parsed = v.safeParse(conflictEnvelope, input)
    if (!parsed.success)
      return { result: { status: 'blocked', snapshot: null, blockedBy: 'invalid' } }
    const stored = parsed.output.conflict
    const device = decodeSession(JSON.stringify(stored.device.envelope))
    const cloud = decodeSession(JSON.stringify(stored.cloud.envelope))
    const ownerRecovery =
      stored.ownerRecovery && decodeSession(JSON.stringify(stored.ownerRecovery.envelope))
    if (
      device.status !== 'ok' ||
      cloud.status !== 'ok' ||
      (ownerRecovery && ownerRecovery.status !== 'ok')
    )
      return { result: { status: 'blocked', snapshot: null, blockedBy: 'invalid' } }
    return {
      result: { status: 'loaded', snapshot: device.snapshot },
      conflict: {
        ownerId: parsed.output.ownerId,
        value: {
          id: stored.id,
          anonymous: true,
          unresolved: true,
          ...(stored.cloudEmpty !== undefined ? { cloudEmpty: stored.cloudEmpty } : {}),
          device: { snapshot: device.snapshot, activeAt: stored.device.activeAt },
          cloud: {
            snapshot: cloud.snapshot,
            activeAt: stored.cloud.activeAt,
            revision: stored.cloud.revision,
          },
          ...(ownerRecovery?.status === 'ok'
            ? {
                ownerRecovery: {
                  snapshot: ownerRecovery.snapshot,
                  activeAt: stored.ownerRecovery!.activeAt,
                },
              }
            : {}),
        },
      },
    }
  }
  const decoded = decodeSession(raw)
  return {
    result:
      decoded.status === 'ok'
        ? { status: 'loaded', snapshot: decoded.snapshot }
        : {
            status: 'blocked',
            snapshot: null,
            blockedBy: decoded.status === 'unsupported' ? 'unsupported' : 'invalid',
          },
  }
}

/** Read the anonymous board retained separately across a same-tab authentication trip. */
export function loadAuthRecovery(): SessionLoadResult {
  try {
    return readRecovery(sessionStorage.getItem(KEY)).result
  } catch {
    return { status: 'blocked', snapshot: null, blockedBy: 'unavailable' }
  }
}

/** Expose owner-origin conflict branches only after the returning identity matches. */
export function loadAuthRecoveryConflict(ownerId: string): ReconciliationConflict | null {
  try {
    const stored = readRecovery(sessionStorage.getItem(KEY)).conflict
    return stored?.ownerId === ownerId ? stored.value : null
  } catch {
    return null
  }
}

/** Write and read back one tab-scoped recovery envelope. */
function writeRecovery(serialized: string): SessionWriteResult {
  try {
    sessionStorage.setItem(KEY, serialized)
    return sessionStorage.getItem(KEY) === serialized
      ? { status: 'saved' }
      : { status: 'failed', reason: 'unavailable' }
  } catch (error) {
    return { status: 'failed', reason: storageFailureReason(error) }
  }
}

/** Preserve unresolved anonymous copies without adopting them into durable account recovery. */
export function saveAuthRecoveryConflict(
  ownerId: string,
  conflict: ReconciliationConflict,
): SessionWriteResult {
  const device = encodeSession(conflict.device.snapshot)
  const cloud = encodeSession(conflict.cloud.snapshot)
  const ownerRecovery = conflict.ownerRecovery && encodeSession(conflict.ownerRecovery.snapshot)
  if (
    device.status !== 'ok' ||
    cloud.status !== 'ok' ||
    (ownerRecovery && ownerRecovery.status !== 'ok') ||
    !conflict.anonymous
  )
    return { status: 'failed', reason: 'invalid-snapshot' }
  const serialized = JSON.stringify({
    kind: 'auth-recovery',
    schemaVersion: 1,
    ownerId,
    conflict: {
      id: conflict.id,
      anonymous: true,
      unresolved: true,
      ...(conflict.cloudEmpty !== undefined ? { cloudEmpty: conflict.cloudEmpty } : {}),
      device: { envelope: JSON.parse(device.serialized), activeAt: conflict.device.activeAt },
      cloud: {
        envelope: JSON.parse(cloud.serialized),
        activeAt: conflict.cloud.activeAt,
        revision: conflict.cloud.revision,
      },
      ...(ownerRecovery?.status === 'ok'
        ? {
            ownerRecovery: {
              envelope: JSON.parse(ownerRecovery.serialized),
              activeAt: conflict.ownerRecovery!.activeAt,
            },
          }
        : {}),
    },
  })
  if (readRecovery(serialized).result.status !== 'loaded')
    return { status: 'failed', reason: 'invalid-snapshot' }
  return writeRecovery(serialized)
}

/** Verify a tab-scoped checkpoint without discarding unresolved branches or owner association. */
export function saveAuthRecovery(snapshot: SessionSnapshot): SessionWriteResult {
  const encoded = encodeSession(snapshot)
  if (encoded.status !== 'ok') return { status: 'failed', reason: 'invalid-snapshot' }
  try {
    const stored = readRecovery(sessionStorage.getItem(KEY))
    if (stored.result.status === 'blocked')
      return {
        status: 'blocked',
        reason: stored.result.blockedBy === 'unsupported' ? 'unsupported' : 'invalid',
      }
    if (stored.conflict)
      return saveAuthRecoveryConflict(stored.conflict.ownerId, {
        ...stored.conflict.value,
        device: { ...stored.conflict.value.device, snapshot },
      })
    return writeRecovery(encoded.serialized)
  } catch (error) {
    return { status: 'failed', reason: storageFailureReason(error) }
  }
}

/** Remove the handoff only after an explicit choice has been archived in owner recovery. */
export function clearAuthRecovery(): SessionWriteResult {
  try {
    sessionStorage.removeItem(KEY)
    return { status: 'deleted' }
  } catch (error) {
    return { status: 'failed', reason: storageFailureReason(error) }
  }
}
