// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { version } from '../../package.json'
import { supabase } from '../lib/supabase.ts'

const MAX_EVENTS = 300
const EVENTS = [
  'capture-started',
  'visibility-change',
  'online-change',
  'publisher-open',
  'publisher-close',
  'heartbeat-tick',
  'send-attempt',
  'send-result',
  'send-blocked',
  'receive-accepted',
  'receive-rejected',
  'freshness-change',
  'channel-status',
  'presence-sync',
  'presence-track-result',
  'subscription-open',
  'subscription-close',
] as const
const STATUSES = new Set([
  'ok',
  'timed out',
  'error',
  'rejected',
  'validation-or-budget',
  'SUBSCRIBED',
  'TIMED_OUT',
  'CLOSED',
  'CHANNEL_ERROR',
  'connecting',
  'live',
  'reconnecting',
  'connection-lost',
  'access-ended',
  'too-large',
  'malformed',
  'unsupported-version',
  'role',
  'duplicate',
  'reordered',
  'too-many-senders',
])
const ROLES = new Set(['gm', 'player'])
const CHANNELS = new Set(['board', 'lobby', 'join', 'pin'])
const MESSAGES = new Set(['board', 'locked', 'closed', 'hello'])
const SOCKET_STATES = new Set(['connecting', 'open', 'closing', 'closed'])

export interface SharingDiagnosticInput {
  event: (typeof EVENTS)[number]
  role: 'gm' | 'player'
  channel?: 'board' | 'lobby' | 'join' | 'pin'
  status?: string
  messageType?: string
  sequence?: number
  ageMs?: number
  ownerPresent?: boolean
  authorizationFailed?: boolean
}

interface SharingDiagnosticEntry extends SharingDiagnosticInput {
  atMs: number
  visibility: DocumentVisibilityState
  online: boolean
  socket: string
  gapMs?: number
}

let startedAt: number | null = null
let droppedEvents = 0
const events: SharingDiagnosticEntry[] = []
const lastEvents = new Map<string, number>()

/** Restrict temporary capture to staging or a local development build. */
export function sharingDiagnosticsAllowed(
  hostname: string,
  development = import.meta.env.DEV,
): boolean {
  return (
    hostname === 'develop.openfray.pages.dev' ||
    (development && (hostname === 'localhost' || hostname === '127.0.0.1'))
  )
}

/** Enable capture only when the current staging page explicitly opts in. */
export function sharingDiagnosticsEnabled(): boolean {
  return (
    typeof window !== 'undefined' &&
    sharingDiagnosticsAllowed(window.location.hostname) &&
    new URLSearchParams(window.location.search).get('sharingDiagnostics') === '1'
  )
}

/** Sample transport readiness without recording socket URLs, keys, or messages. */
function socketState(): string {
  try {
    const state = supabase?.realtime?.connectionState?.()
    return state && SOCKET_STATES.has(state) ? state : 'unavailable'
  } catch {
    return 'unavailable'
  }
}

/** Retain only allowlisted timing and status metadata in a bounded in-memory report. */
export function recordSharingDiagnostic(input: SharingDiagnosticInput): void {
  if (!sharingDiagnosticsEnabled() || !EVENTS.includes(input.event) || !ROLES.has(input.role))
    return
  const now = performance.now()
  startedAt ??= now
  const entry: SharingDiagnosticEntry = {
    event: input.event,
    role: input.role,
    atMs: Math.round(now - startedAt),
    visibility: document.visibilityState,
    online: navigator.onLine,
    socket: socketState(),
  }
  if (input.channel && CHANNELS.has(input.channel)) entry.channel = input.channel
  if (input.status && STATUSES.has(input.status)) entry.status = input.status
  if (input.messageType && MESSAGES.has(input.messageType)) entry.messageType = input.messageType
  if (
    typeof input.sequence === 'number' &&
    Number.isSafeInteger(input.sequence) &&
    input.sequence >= 0
  ) {
    entry.sequence = input.sequence
  }
  if (typeof input.ageMs === 'number' && Number.isFinite(input.ageMs))
    entry.ageMs = Math.max(0, Math.round(input.ageMs))
  if (typeof input.ownerPresent === 'boolean') entry.ownerPresent = input.ownerPresent
  if (typeof input.authorizationFailed === 'boolean')
    entry.authorizationFailed = input.authorizationFailed
  if (
    input.event === 'heartbeat-tick' ||
    input.event === 'send-attempt' ||
    (input.event === 'receive-accepted' && input.messageType === 'board')
  ) {
    const key = `${input.role}:${input.event}`
    const last = lastEvents.get(key)
    if (last !== undefined) entry.gapMs = Math.round(now - last)
    lastEvents.set(key, now)
  }
  events.push(entry)
  if (events.length > MAX_EVENTS) {
    events.shift()
    droppedEvents += 1
  }
}

/** Observe a transport result without waiting, retrying, or retaining error details. */
export function recordSharingResult(result: Promise<unknown>, input: SharingDiagnosticInput): void {
  if (!sharingDiagnosticsEnabled()) return
  void result.then(
    (status) =>
      recordSharingDiagnostic({
        ...input,
        status: status === 'ok' || status === 'timed out' ? status : 'error',
      }),
    () => recordSharingDiagnostic({ ...input, status: 'rejected' }),
  )
}

/** Export a metadata-only snapshot without persistent storage or network uploads. */
export function sharingDiagnosticsReport(): string {
  if (!sharingDiagnosticsEnabled()) return ''
  return JSON.stringify(
    {
      diagnosticVersion: 1,
      consoleVersion: version,
      elapsedMs: startedAt === null ? 0 : Math.round(performance.now() - startedAt),
      visibility: document.visibilityState,
      online: navigator.onLine,
      socket: socketState(),
      clockOverrideMs: Math.round(Date.now() - new Date().getTime()),
      droppedEvents,
      events,
    },
    null,
    2,
  )
}

/** Discard the temporary report and its timing anchors without touching encounter state. */
export function clearSharingDiagnostics(): void {
  events.length = 0
  lastEvents.clear()
  startedAt = null
  droppedEvents = 0
}
