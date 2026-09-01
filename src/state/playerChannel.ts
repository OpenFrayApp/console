// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase.ts'
import { uid } from '../lib/uid.ts'
import type { Encounter } from '../schema/encounter.ts'
import type { PlayerViewSettings } from './settings.ts'
import { playerBoard, type PlayerBoard, type PlayerRecap } from '../combat/playerView.ts'
import {
  INITIAL_PLAYER_PROTOCOL_STATE,
  receivePlayerMessage,
  sendGameMasterMessage,
  type GameMasterMessage,
  type PlayerProtocolState,
} from './playerProtocol.ts'
import { liveViewTopics, type ActiveLiveView } from './liveViewAuthority.ts'

const EVENT = 'player-view-protocol'
const HELLO_TIMEOUT_MS = 4000
const PIN_TRY_TIMEOUT_MS = 2000
const SEND_DEBOUNCE_MS = 250

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
  const sending = useRef<PlayerProtocolState>({ ...INITIAL_PLAYER_PROTOCOL_STATE })
  const senderId = useRef(uid())

  useEffect(() => {
    if (!supabase || !session) return
    const client = supabase
    let cancelled = false
    let responseTimer: ReturnType<typeof setTimeout> | undefined
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

      const joins = client.channel(topics.join, privateChannelConfig('gm-joins'))
      open.push(joins)
      joins.on('presence', { event: 'join' }, queueResponse)
      joins.subscribe()
    })

    return () => {
      cancelled = true
      clearTimeout(responseTimer)
      for (const target of publicationChannels) {
        sending.current = sendGameMasterTraffic(target, sending.current, senderId.current, {
          type: 'closed',
        })
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
  'unavailable' | 'connecting' | 'waiting' | 'locked' | 'live' | 'ended'

/** Return whether presence contains the authenticated Game Master marker. */
function gameMasterPresent(channel: RealtimeChannel): boolean {
  return Object.values(channel.presenceState()).some((entries) =>
    entries.some((entry) => (entry as { role?: unknown }).role === 'gm'),
  )
}

/** Return whether Realtime denied or ended a private subscription. */
function subscriptionEnded(status: string): boolean {
  return status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED'
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
} {
  const [status, setStatus] = useState<PlayerLinkStatus>(
    !playerViewAvailable() ? 'unavailable' : capability ? 'connecting' : 'ended',
  )
  const [board, setBoard] = useState<PlayerBoard | null>(null)
  const [pinRejected, setPinRejected] = useState(false)
  const receiving = useRef<PlayerProtocolState>({ ...INITIAL_PLAYER_PROTOCOL_STATE })
  const senderId = useRef(uid())

  useEffect(() => {
    receiving.current = { ...INITIAL_PLAYER_PROTOCOL_STATE }
    senderId.current = uid()
    setBoard(null)
    setStatus(!playerViewAvailable() ? 'unavailable' : capability ? 'connecting' : 'ended')
  }, [code, capability])

  useEffect(() => {
    if (!supabase || !capability) return
    const client = supabase
    let cancelled = false
    const targets: RealtimeChannel[] = []
    let waiting: ReturnType<typeof setTimeout> | undefined

    /** Remove stale content as soon as presence or lifecycle traffic ends access. */
    const stepAway = () => {
      setStatus('waiting')
      setBoard(null)
    }

    /** Apply one validated owner message to viewer state. */
    const applyMessage = (message: GameMasterMessage) => {
      switch (message.type) {
        case 'board':
          clearTimeout(waiting)
          setBoard(message.board)
          setStatus('live')
          break
        case 'locked':
          clearTimeout(waiting)
          setStatus((value) => (value === 'live' ? value : 'locked'))
          break
        case 'closed':
          stepAway()
          break
      }
    }

    void liveViewTopics(capability, null).then(({ lobby, join }) => {
      if (cancelled) return
      const joined = client.channel(lobby, privateChannelConfig(senderId.current))
      targets.push(joined)
      joined.on('broadcast', { event: EVENT }, ({ payload }) => {
        const received = receivePlayerMessage(receiving.current, 'viewer', payload)
        if (received.status !== 'accepted' || received.message.type === 'hello') return
        receiving.current = received.state
        applyMessage(received.message)
      })
      joined.on('presence', { event: 'sync' }, () => {
        if (!gameMasterPresent(joined)) stepAway()
      })
      joined.subscribe((state) => {
        if (subscriptionEnded(state)) {
          setBoard(null)
          setStatus('ended')
          return
        }
        if (state !== 'SUBSCRIBED') return
        waiting = setTimeout(
          () => setStatus((value) => (value === 'connecting' ? 'waiting' : value)),
          HELLO_TIMEOUT_MS,
        )
      })

      const arrivals = client.channel(join, privateChannelConfig(senderId.current))
      targets.push(arrivals)
      arrivals.subscribe((state) => {
        if (subscriptionEnded(state)) {
          setBoard(null)
          setStatus('ended')
        } else if (state === 'SUBSCRIBED') {
          void arrivals.track({ role: 'viewer' })
        }
      })
    })

    return () => {
      cancelled = true
      clearTimeout(waiting)
      for (const target of targets) void client.removeChannel(target)
    }
  }, [code, capability])

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
        const received = receivePlayerMessage(receiving.current, 'viewer', payload)
        if (received.status !== 'accepted' || received.message.type === 'hello') return
        receiving.current = received.state
        if (received.message.type === 'board') {
          answered = true
          clearTimeout(waiting)
          setPinRejected(false)
          setBoard(received.message.board)
          setStatus('live')
        } else if (received.message.type === 'closed') {
          setBoard(null)
          setStatus('connecting')
        }
      })
      joined.subscribe((state) => {
        if (subscriptionEnded(state)) {
          setBoard(null)
          setStatus('ended')
          return
        }
        if (state !== 'SUBSCRIBED') return
        waiting = setTimeout(() => {
          if (!answered) setPinRejected(true)
        }, PIN_TRY_TIMEOUT_MS)
      })
    })

    return () => {
      cancelled = true
      clearTimeout(waiting)
      if (target) void client.removeChannel(target)
    }
  }, [code, capability, pin])

  return { status, board, pinRejected }
}
