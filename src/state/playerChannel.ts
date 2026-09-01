// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase.ts'
import { uid } from '../lib/uid.ts'
import type { Encounter } from '../schema/encounter.ts'
import type { PlayerViewSettings } from './settings.ts'
import { playerBoard, type PlayerBoard, type PlayerRecap } from '../combat/playerView.ts'
import {
  INITIAL_PLAYER_FRESHNESS_STATE,
  INITIAL_PLAYER_PROTOCOL_STATE,
  applyPlayerFreshnessMessage,
  endPlayerAccess,
  markPlayerConnectionLost,
  playerUpdateAgeSeconds,
  receivePlayerMessage,
  refreshPlayerFreshness,
  sendGameMasterMessage,
  type GameMasterMessage,
  type PlayerFreshnessState,
  type PlayerProtocolState,
} from './playerProtocol.ts'
import { liveViewTopics, type ActiveLiveView } from './liveViewAuthority.ts'

const EVENT = 'player-view-protocol'
const HELLO_TIMEOUT_MS = 4000
const PIN_TRY_TIMEOUT_MS = 2000
const SEND_DEBOUNCE_MS = 250
const BOARD_HEARTBEAT_MS = 10_000
const FRESHNESS_TICK_MS = 1_000

/** Send one bounded Game Master message on an owner-authorized private channel. */
function sendGameMasterTraffic(
  channel: RealtimeChannel,
  state: PlayerProtocolState,
  senderId: string,
  message: GameMasterMessage,
): PlayerProtocolState {
  try {
    const sent = sendGameMasterMessage(state, senderId, message, Date.now())
    void channel.send({ type: 'broadcast', event: EVENT, payload: sent.envelope })
    return sent.state
  } catch (error) {
    if (error instanceof TypeError || error instanceof RangeError) return state
    throw error
  }
}

/** Return whether this build has a Realtime project configured. */
export function playerViewAvailable(): boolean {
  return supabase !== null
}

/** Return the private board topic derived from a capability and PIN. */
export async function lockedChannelName(capability: string, pin: string): Promise<string> {
  return (await liveViewTopics(capability, pin)).board
}

/** Return the private channel options shared by publisher and viewer adapters. */
function privateChannelConfig(presenceKey: string) {
  return {
    config: {
      private: true,
      broadcast: { ack: true },
      presence: { key: presenceKey },
    },
  }
}

/** Broadcast a filtered board while an owner-authorized live session is active. */
export function useBoardBroadcast(
  session: ActiveLiveView | null,
  encounter: Encounter,
  settings: PlayerViewSettings,
  recap: PlayerRecap | null = null,
  campaign?: string,
  gm?: string,
  pin: string | null = null,
  background?: string,
): void {
  const channel = useRef<RealtimeChannel | null>(null)
  const latest = useRef<PlayerBoard | null>(null)
  const activeSession = useRef(session)
  activeSession.current = session
  const sending = useRef<PlayerProtocolState>({ ...INITIAL_PLAYER_PROTOCOL_STATE })
  const senderId = useRef(uid())

  useEffect(() => {
    if (!supabase || !session) return
    const client = supabase
    let cancelled = false
    let responseTimer: ReturnType<typeof setTimeout> | undefined
    let heartbeatTimer: ReturnType<typeof setInterval> | undefined
    const open: RealtimeChannel[] = []
    const publicationChannels: RealtimeChannel[] = []
    sending.current = { ...INITIAL_PLAYER_PROTOCOL_STATE }
    senderId.current = uid()

    /** Send the latest board once, if its validated projection fits the protocol budget. */
    const sendBoard = (target: RealtimeChannel) => {
      if (!latest.current) return
      sending.current = sendGameMasterTraffic(target, sending.current, senderId.current, {
        type: 'board',
        board: latest.current,
      })
    }

    void liveViewTopics(session.capability, pin).then((topics) => {
      if (cancelled) return
      let lobby: RealtimeChannel | null = null
      const boardTarget = client.channel(topics.board, privateChannelConfig('gm'))
      open.push(boardTarget)
      publicationChannels.push(boardTarget)
      channel.current = boardTarget

      /** Send the locked lifecycle marker without putting the board in the lobby. */
      const sendLocked = () => {
        if (!lobby) return
        sending.current = sendGameMasterTraffic(lobby, sending.current, senderId.current, {
          type: 'locked',
        })
      }

      /** Coalesce join churn into one response across the lobby and board topics. */
      const queueResponse = () => {
        if (responseTimer) return
        responseTimer = setTimeout(() => {
          responseTimer = undefined
          if (pin) sendLocked()
          sendBoard(boardTarget)
        }, SEND_DEBOUNCE_MS)
      }

      if (pin) {
        lobby = client.channel(topics.lobby, privateChannelConfig('gm'))
        open.push(lobby)
        publicationChannels.push(lobby)
        lobby.subscribe((status) => {
          if (status !== 'SUBSCRIBED') return
          void lobby?.track({ role: 'gm' })
          sendLocked()
        })
      }
      boardTarget.subscribe((status) => {
        if (status !== 'SUBSCRIBED') return
        void boardTarget.track({ role: 'gm' })
        sendBoard(boardTarget)
      })
      heartbeatTimer = setInterval(() => sendBoard(boardTarget), BOARD_HEARTBEAT_MS)

      const joins = client.channel(topics.join, privateChannelConfig('gm-joins'))
      open.push(joins)
      joins.on('presence', { event: 'join' }, queueResponse)
      joins.subscribe()
    })

    return () => {
      cancelled = true
      clearTimeout(responseTimer)
      clearInterval(heartbeatTimer)
      if (activeSession.current?.capability !== session.capability) {
        for (const target of publicationChannels) {
          sending.current = sendGameMasterTraffic(target, sending.current, senderId.current, {
            type: 'closed',
          })
        }
      }
      for (const target of open) void client.removeChannel(target)
      channel.current = null
    }
  }, [session, pin])

  useEffect(() => {
    if (!session) {
      latest.current = null
      return
    }
    const board = playerBoard(encounter, settings, recap, { campaign, gm, background })
    latest.current = board
    const handle = setTimeout(() => {
      if (!channel.current) return
      sending.current = sendGameMasterTraffic(channel.current, sending.current, senderId.current, {
        type: 'board',
        board,
      })
    }, SEND_DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [session, encounter, settings, recap, campaign, gm, background])
}

export type PlayerLinkStatus =
  | 'unavailable'
  | 'connecting'
  | 'waiting'
  | 'locked'
  | 'live'
  | 'reconnecting'
  | 'connection-lost'
  | 'ended'

/** Return whether presence contains the authenticated Game Master marker. */
function gameMasterPresent(channel: RealtimeChannel): boolean {
  return Object.values(channel.presenceState()).some((entries) =>
    entries.some((entry) => (entry as { role?: unknown }).role === 'gm'),
  )
}

/** Return whether structured Realtime error data confirms an authorization failure. */
function authorizationFailed(value: unknown, depth = 0): boolean {
  if (!value || typeof value !== 'object' || depth > 4) return false
  const error = value as Record<string, unknown>
  if (error.status === 401 || error.status === 403 || error.code === 401 || error.code === 403) {
    return true
  }
  if (
    typeof error.reason === 'string' &&
    ['unauthorized', 'forbidden', 'permission denied', 'invalid jwt', 'token expired'].includes(
      error.reason.toLowerCase(),
    )
  ) {
    return true
  }
  return authorizationFailed(error.cause, depth + 1)
}

/** Translate the pure protocol state into the player hook's public status names. */
function playerLinkStatus(state: PlayerFreshnessState): PlayerLinkStatus {
  return state.status === 'access-ended' ? 'ended' : state.status
}

/** Subscribe read-only to a capability-authorized player board. */
export function usePlayerBoard(
  code: string,
  capability: string | null,
  pin: string | null = null,
): {
  status: PlayerLinkStatus
  board: PlayerBoard | null
  pinRejected: boolean
  lastUpdateAgeSeconds: number | null
} {
  const initialFreshness = capability ? INITIAL_PLAYER_FRESHNESS_STATE : endPlayerAccess()
  const [freshness, setFreshness] = useState<PlayerFreshnessState>(initialFreshness)
  const freshnessRef = useRef<PlayerFreshnessState>(initialFreshness)
  const [standby, setStandby] = useState<'unavailable' | 'waiting' | 'locked' | null>(
    !playerViewAvailable() ? 'unavailable' : null,
  )
  const [pinRejected, setPinRejected] = useState(false)
  const [observedAt, setObservedAt] = useState(Date.now())
  const receiving = useRef<PlayerProtocolState>({ ...INITIAL_PLAYER_PROTOCOL_STATE })
  const senderId = useRef(uid())

  /** Keep event callbacks and rendered freshness on the same pure state transition. */
  const updateFreshness = useCallback((next: PlayerFreshnessState) => {
    freshnessRef.current = next
    setFreshness(next)
  }, [])

  /** Apply one untrusted owner payload only after protocol and freshness validation. */
  const applyPayload = useCallback(
    (payload: unknown) => {
      const received = receivePlayerMessage(receiving.current, 'viewer', payload)
      if (received.status !== 'accepted' || received.message.type === 'hello') return
      receiving.current = received.state
      const now = Date.now()
      const next = applyPlayerFreshnessMessage(freshnessRef.current, received, now)
      if (received.message.type === 'locked') {
        setStandby('locked')
        if (next !== freshnessRef.current) updateFreshness(next)
        return
      }
      if (next === freshnessRef.current) return
      if (next.status === 'live') {
        setObservedAt(now)
        setStandby(null)
        setPinRejected(false)
      } else if (next.status === 'access-ended') {
        setStandby(null)
      }
      updateFreshness(next)
    },
    [updateFreshness],
  )

  useEffect(() => {
    receiving.current = { ...INITIAL_PLAYER_PROTOCOL_STATE }
    senderId.current = uid()
    const next = capability ? INITIAL_PLAYER_FRESHNESS_STATE : endPlayerAccess()
    updateFreshness(next)
    setStandby(!playerViewAvailable() ? 'unavailable' : null)
  }, [code, capability, updateFreshness])

  useEffect(() => {
    if (!supabase || !capability) return
    const timer = setInterval(() => {
      const now = Date.now()
      setObservedAt(now)
      updateFreshness(refreshPlayerFreshness(freshnessRef.current, now))
    }, FRESHNESS_TICK_MS)
    return () => clearInterval(timer)
  }, [code, capability, updateFreshness])

  useEffect(() => {
    if (!supabase || !capability) return
    const client = supabase
    let cancelled = false
    const targets: RealtimeChannel[] = []
    let waiting: ReturnType<typeof setTimeout> | undefined

    /** Keep a recent board during transport recovery and cover one that cannot be trusted. */
    const reconnect = () => {
      clearTimeout(waiting)
      setStandby(null)
      updateFreshness(markPlayerConnectionLost(freshnessRef.current, Date.now()))
    }

    /** End this capability immediately after confirmed closure or authorization failure. */
    const endAccess = () => {
      clearTimeout(waiting)
      setStandby(null)
      updateFreshness(endPlayerAccess())
    }

    /** Apply one subscription status without treating a transient timeout as revocation. */
    const applySubscription = (state: string, error?: Error) => {
      if (state === 'CLOSED' || authorizationFailed(error)) {
        endAccess()
      } else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT') {
        reconnect()
      }
    }

    void liveViewTopics(capability, null).then(({ lobby, join }) => {
      if (cancelled) return
      const joined = client.channel(lobby, privateChannelConfig(senderId.current))
      targets.push(joined)
      joined.on('broadcast', { event: EVENT }, ({ payload }) => {
        if (!cancelled) applyPayload(payload)
      })
      joined.on('presence', { event: 'sync' }, () => {
        if (cancelled || gameMasterPresent(joined)) return
        if (freshnessRef.current.board) reconnect()
        else setStandby('waiting')
      })
      joined.subscribe((state, error) => {
        if (cancelled) return
        applySubscription(state, error)
        if (state !== 'SUBSCRIBED') return
        waiting = setTimeout(() => {
          if (freshnessRef.current.status === 'connecting') setStandby('waiting')
        }, HELLO_TIMEOUT_MS)
      })

      const arrivals = client.channel(join, privateChannelConfig(senderId.current))
      targets.push(arrivals)
      arrivals.subscribe((state, error) => {
        if (cancelled) return
        applySubscription(state, error)
        if (state === 'SUBSCRIBED') void arrivals.track({ role: 'viewer' })
      })
    })

    return () => {
      cancelled = true
      clearTimeout(waiting)
      for (const target of targets) void client.removeChannel(target)
    }
  }, [code, capability, applyPayload, updateFreshness])

  useEffect(() => {
    setPinRejected(false)
    if (!supabase || !capability || !pin) return
    const client = supabase
    let cancelled = false
    let target: RealtimeChannel | null = null
    let waiting: ReturnType<typeof setTimeout> | undefined
    let answered = false

    void liveViewTopics(capability, pin).then(({ board: boardTopic }) => {
      if (cancelled) return
      const joined = client.channel(boardTopic, privateChannelConfig(senderId.current))
      target = joined
      joined.on('broadcast', { event: EVENT }, ({ payload }) => {
        if (cancelled) return
        const before = freshnessRef.current
        applyPayload(payload)
        if (freshnessRef.current.status === 'live' && freshnessRef.current !== before) {
          answered = true
          clearTimeout(waiting)
        }
      })
      joined.subscribe((state) => {
        if (cancelled) return
        if (state === 'CLOSED') {
          updateFreshness(endPlayerAccess())
          setStandby(null)
          return
        }
        if (state === 'CHANNEL_ERROR') {
          setPinRejected(true)
          setStandby('locked')
          return
        }
        if (state !== 'SUBSCRIBED') return
        waiting = setTimeout(() => {
          if (!answered) {
            setPinRejected(true)
            setStandby('locked')
          }
        }, PIN_TRY_TIMEOUT_MS)
      })
    })

    return () => {
      cancelled = true
      clearTimeout(waiting)
      if (target) void client.removeChannel(target)
    }
  }, [code, capability, pin, applyPayload, updateFreshness])

  const status = standby ?? playerLinkStatus(freshness)
  return {
    status,
    board: freshness.board,
    pinRejected,
    lastUpdateAgeSeconds: playerUpdateAgeSeconds(freshness, observedAt),
  }
}
