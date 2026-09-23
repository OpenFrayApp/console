// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import * as v from 'valibot'
import type { ActiveLiveView } from './liveViewAuthority.ts'

const KEY = 'openfray:live-view'
const recordSchema = v.strictObject({
  ownerId: v.string(),
  encounterId: v.string(),
  code: v.string(),
  active: v.strictObject({
    status: v.literal('ok'),
    capability: v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]{43}$/)),
    capabilityHash: v.pipe(v.string(), v.regex(/^[a-f0-9]{64}$/)),
    generation: v.pipe(v.number(), v.safeInteger(), v.minValue(1)),
  }),
})

/** Retain an owner session in this tab without adding capabilities to encounter recovery. */
export function rememberLiveView(
  ownerId: string,
  encounterId: string,
  code: string,
  active: ActiveLiveView,
): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ownerId, encounterId, code, active }))
  } catch {
    // Sharing still works when the browser disallows recovery across reloads.
  }
}

/** Read only a complete tab session matching the restored owner's writable encounter. */
export function loadLiveView(
  ownerId: string,
  encounterId: string,
  code: string,
): ActiveLiveView | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw || raw.length > 2048) return null
    const parsed = v.safeParse(recordSchema, JSON.parse(raw))
    if (!parsed.success) return null
    const record = parsed.output
    return record.ownerId === ownerId && record.encounterId === encounterId && record.code === code
      ? record.active
      : null
  } catch {
    return null
  }
}

/** Remove this tab's resumption record when the owner ends sharing or changes identity. */
export function forgetLiveView(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Server revocation remains authoritative when browser storage is unavailable.
  }
}
