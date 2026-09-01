// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { supabase } from '../lib/supabase.ts'
import {
  activateLiveViewAuthority,
  type ActiveLiveView,
  type LiveViewAuthorityState,
} from './playerProtocol.ts'

export const LIVE_VIEW_CAPABILITY_BYTES = 32
const CAPABILITY_PATTERN = /^[A-Za-z0-9_-]{43}$/
const CAPABILITY_HASH_PATTERN = /^[a-f0-9]{64}$/

export type { ActiveLiveView } from './playerProtocol.ts'

export type StartLiveViewResult =
  ActiveLiveView | { status: 'unauthorized' | 'unavailable' | 'failed' }

/** Encode exactly 256 random bits as an unpadded base64url capability. */
export function mintLiveViewCapability(
  bytes: Uint8Array = crypto.getRandomValues(new Uint8Array(LIVE_VIEW_CAPABILITY_BYTES)),
): string {
  if (bytes.byteLength !== LIVE_VIEW_CAPABILITY_BYTES) {
    throw new RangeError(`A live-view capability must contain ${LIVE_VIEW_CAPABILITY_BYTES} bytes.`)
  }
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

/** Return whether an unknown value is one complete 256-bit capability. */
export function isLiveViewCapability(value: unknown): value is string {
  return typeof value === 'string' && CAPABILITY_PATTERN.test(value)
}

/** Render a cryptographic digest as lowercase hexadecimal. */
function digestHex(digest: ArrayBuffer): string {
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Hash a raw capability before it enters a Realtime topic or database call. */
export async function hashLiveViewCapability(capability: string): Promise<string> {
  if (!isLiveViewCapability(capability)) throw new TypeError('The live-view capability is invalid.')
  return digestHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(capability)))
}

/** Build the private lobby and board topics without exposing the raw capability or PIN. */
export async function liveViewTopics(
  capability: string,
  pin: string | null,
): Promise<{ lobby: string; board: string; join: string }> {
  const capabilityHash = await hashLiveViewCapability(capability)
  const lobby = `player:${capabilityHash}:lobby`
  const join = `player:${capabilityHash}:join`
  if (!pin) return { lobby, board: lobby, join }
  if (!/^\d{4}$/.test(pin)) throw new TypeError('The player-view PIN is invalid.')
  const pinDigest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${capability}:${pin}`),
  )
  const pinHash = digestHex(pinDigest)
  return { lobby, board: `player:${capabilityHash}:board:${pinHash}`, join }
}

/** Read a valid capability from the URL fragment without accepting partial values. */
export function liveViewCapabilityFromHash(hash: string): string | null {
  const value = new URLSearchParams(hash.replace(/^#/, '')).get('live')
  return isLiveViewCapability(value) ? value : null
}

/** Ask the database to activate or rotate an owner-bound live-view capability. */
export async function startLiveView(
  encounterId: string,
  code: string,
  randomBytes?: Uint8Array,
  current: LiveViewAuthorityState | null = null,
): Promise<StartLiveViewResult> {
  if (!supabase) return { status: 'unavailable' }
  const { data: auth } = await supabase.auth.getSession()
  if (!auth.session) return { status: 'unauthorized' }
  const capability = mintLiveViewCapability(randomBytes)
  const capabilityHash = await hashLiveViewCapability(capability)
  const { data, error } = await supabase.rpc('start_live_view', {
    want_encounter: encounterId,
    want_code: code,
    want_capability_hash: capabilityHash,
  })
  if (error) return { status: 'failed' }
  const generation = typeof data === 'number' ? data : Number(data)
  if (!Number.isSafeInteger(generation) || generation < 1) return { status: 'failed' }
  try {
    const authority = activateLiveViewAuthority(current, capabilityHash, generation)
    return { status: 'ok', capability, ...authority }
  } catch {
    return { status: 'failed' }
  }
}

/** Revoke the matching capability without letting a delayed stop revoke a rotation. */
export async function stopLiveView(capability: string): Promise<boolean> {
  if (!supabase) return false
  const capabilityHash = await hashLiveViewCapability(capability)
  if (!CAPABILITY_HASH_PATTERN.test(capabilityHash)) return false
  const { data, error } = await supabase.rpc('stop_live_view', {
    want_capability_hash: capabilityHash,
  })
  return !error && data === true
}
