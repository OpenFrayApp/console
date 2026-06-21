// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Encounter } from '../schema/encounter.ts'
import type { RollEntry } from '../components/RollLog.tsx'

/**
 * Anonymous-tier persistence: the live session is mirrored to `sessionStorage`
 * so an accidental reload or crash doesn't wipe the board mid-fight. This is the
 * ephemeral tier from the storage spec — tab-scoped, cleared on tab close, and it
 * **never** touches the database. `localStorage` is deliberately not used: it would
 * reintroduce the durable anonymous state the two-tier model exists to avoid.
 * Durable, cross-device persistence arrives with sign-up (Supabase + RLS) later.
 */

export type Theme = 'dark' | 'light'
export type View = 'encounter' | 'compendium'

/** Everything worth restoring to land the DM back where they left off. */
export interface SessionSnapshot {
  encounter: Encounter
  rollLog: RollEntry[]
  theme: Theme
  view: View
  /** Which combatant's stat block was open; dropped if it no longer exists. */
  selectedId: string | null
}

const KEY = 'openfray:session'
// Bump when the snapshot shape changes incompatibly — a mismatch is discarded
// rather than half-read into a stale shape.
const VERSION = 1

interface Envelope {
  version: number
  snapshot: SessionSnapshot
}

/** `sessionStorage` is absent under the node test environment and during SSR. */
function storage(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    // Access can throw in locked-down/private-mode contexts.
    return null
  }
}

/**
 * Read the persisted session, or `null` when there's nothing valid to restore.
 * Any parse error or version mismatch is treated as "no saved session" — a
 * corrupt blob must never crash startup.
 */
export function loadSession(): SessionSnapshot | null {
  const store = storage()
  if (!store) return null
  const raw = store.getItem(KEY)
  if (!raw) return null
  try {
    const envelope = JSON.parse(raw) as Envelope
    if (envelope?.version !== VERSION || !envelope.snapshot?.encounter) return null
    const snapshot = envelope.snapshot
    // Drop a dangling selection so the UI never points at a removed combatant.
    if (
      snapshot.selectedId &&
      !snapshot.encounter.combatants.some((c) => c.combatantId === snapshot.selectedId)
    ) {
      snapshot.selectedId = null
    }
    return snapshot
  } catch {
    return null
  }
}

/** Mirror the session to `sessionStorage`. Failures (quota, private mode) are silent. */
export function saveSession(snapshot: SessionSnapshot): void {
  const store = storage()
  if (!store) return
  try {
    const envelope: Envelope = { version: VERSION, snapshot }
    store.setItem(KEY, JSON.stringify(envelope))
  } catch {
    // Persistence is a best-effort background effect, never a gatekeeper.
  }
}

/** Drop the persisted session (e.g. a future "clear / new encounter" action). */
export function clearSession(): void {
  storage()?.removeItem(KEY)
}
