// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { decodeSession, encodeSession } from '../codecs/session.ts'
import {
  storageFailureReason,
  type SessionLoadResult,
  type SessionSnapshot,
  type SessionWriteResult,
} from './persistence.ts'

const KEY = 'openfray:auth-recovery'

/** Read the anonymous board retained separately across a same-tab authentication trip. */
export function loadAuthRecovery(): SessionLoadResult {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return { status: 'empty', snapshot: null }
    const decoded = decodeSession(raw)
    return decoded.status === 'ok'
      ? { status: 'loaded', snapshot: decoded.snapshot }
      : {
          status: 'blocked',
          snapshot: null,
          blockedBy: decoded.status === 'unsupported' ? 'unsupported' : 'invalid',
        }
  } catch {
    return { status: 'blocked', snapshot: null, blockedBy: 'unavailable' }
  }
}

/** Verify a tab-scoped checkpoint without touching any owner's recovery or cloud copy. */
export function saveAuthRecovery(snapshot: SessionSnapshot): SessionWriteResult {
  const encoded = encodeSession(snapshot)
  if (encoded.status !== 'ok') return { status: 'failed', reason: 'invalid-snapshot' }
  try {
    sessionStorage.setItem(KEY, encoded.serialized)
    return sessionStorage.getItem(KEY) === encoded.serialized
      ? { status: 'saved' }
      : { status: 'failed', reason: 'unavailable' }
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
