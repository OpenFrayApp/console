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
  receiveLegacyPlayerMessage,
  receivePlayerMessage,
  sendGameMasterMessage,
  sendViewerMessage,
  type GameMasterMessage,
  type PlayerProtocolState,
} from './playerProtocol.ts'

/**
 * The wire for the shared player view: a Supabase realtime **broadcast** channel,
 * which relays and stores nothing. That is what lets an anonymous GM share a fight
 * without a single row reaching the database — the two-tier identity model holds,
 * and a fight that ends leaves nothing behind to clean up.
 *
 * Because there is no stored history, a player who arrives late says `hello` and the
 * GM answers with the board as it stands. Presence carries the rest: when the GM's
 * tab goes away the players are told, instead of watching a board quietly go stale.
 */

/** Only the GM's own machine ever builds a board, so `board` only ever flows outward. */
const EVENT = {
  protocol: 'player-view-protocol',
  board: 'board',
  hello: 'hello',
  closed: 'closed',
  locked: 'locked',
} as const

/** Send one Game Master message over the current and rollback paths. */
function sendGameMasterTraffic(
  channel: RealtimeChannel,
  state: PlayerProtocolState,
  senderId: string,
  message: GameMasterMessage,
): PlayerProtocolState {
  try {
    const sent = sendGameMasterMessage(state, senderId, message, Date.now())
    void channel.send({ type: 'broadcast', event: EVENT.protocol, payload: sent.envelope })
    void channel.send({
      type: 'broadcast',
      event: sent.legacy.messageType,
      payload: sent.legacy.payload,
    })
    return sent.state
  } catch (error) {
    if (error instanceof TypeError || error instanceof RangeError) return state
    throw error
  }
}

/** Send one viewer hello over the current and rollback paths. */
function sendViewerHello(
  channel: RealtimeChannel,
  state: PlayerProtocolState,
  senderId: string,
): PlayerProtocolState {
  const sent = sendViewerMessage(state, senderId, { type: 'hello' }, Date.now())
  void channel.send({ type: 'broadcast', event: EVENT.protocol, payload: sent.envelope })
  void channel.send({
    type: 'broadcast',
    event: sent.legacy.messageType,
    payload: sent.legacy.payload,
  })
  return sent.state
}

/** Realtime needs a configured project; without one the player view can't work at all. */
export function playerViewAvailable(): boolean {
  return supabase !== null
}

/** The channel for a share code. One channel per code, so two tables never mix. */
const channelName = (code: string): string => `player:${code}`

/**
 * The channel a PIN-locked board flows on. The name is derived from the code and the
 * PIN, so a client that doesn't know the PIN cannot subscribe to where the board is —
 * the plain channel becomes a lobby that answers hellos with `locked` and carries
 * nothing else. A four-digit PIN is a latch against lurkers who were handed the link,
 * not a vault: the space is small, and the board's own boundary is still `playerBoard`.
 */
export async function lockedChannelName(code: string, pin: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${code}:${pin}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `player:${code}:${hex.slice(0, 16)}`
}

/** How long a player waits for the first board before saying the GM isn't there yet. */
const HELLO_TIMEOUT_MS = 4000

/**
 * How long a PIN try listens before calling itself wrong. A wrong PIN derives a channel
 * nobody sends on, so silence is the only verdict there is — kept short because the
 * right PIN is answered in one round trip, and a late board still clears the call.
 */
const PIN_TRY_TIMEOUT_MS = 2000

/** Match the encounter autosave's debounce: fast enough to feel live, slow enough to coalesce. */
const SEND_DEBOUNCE_MS = 250

/**
 * Broadcast the board while `code` is set, and stop when it clears. The GM's own
 * screen is never gated on this — it is a background effect like the autosave, so a
 * flaky connection slows the players' view and nothing else.
 */
export function useBoardBroadcast(
  code: string | null,
  encounter: Encounter,
  settings: PlayerViewSettings,
  /** The summary of the fight just ended, while the GM has it on screen. */
  recap: PlayerRecap | null = null,
  /** The campaign's name, when a signed-in GM has one selected (the setting gates it). */
  campaign?: string,
  /** The GM's profile name, when signed in (the setting gates it). */
  gm?: string,
  /** The four-digit PIN locking the view, or null for an open link. */
  pin: string | null = null,
  /** The active campaign's bundled backdrop id, when it has one. */
  background?: string,
): void {
  const channel = useRef<RealtimeChannel | null>(null)
  const latest = useRef<PlayerBoard | null>(null)
  const sending = useRef<PlayerProtocolState>({ ...INITIAL_PLAYER_PROTOCOL_STATE })
  const receiving = useRef<PlayerProtocolState>({ ...INITIAL_PLAYER_PROTOCOL_STATE })
  const senderId = useRef(uid())

  useEffect(() => {
    if (!supabase || !code) return
    const client = supabase
    let cancelled = false
    const open: RealtimeChannel[] = []
    sending.current = { ...INITIAL_PLAYER_PROTOCOL_STATE }
    receiving.current = { ...INITIAL_PLAYER_PROTOCOL_STATE }
    senderId.current = uid()

    /** Send the current board over both the versioned and rollback paths. */
    const sendBoard = (ch: RealtimeChannel) => {
      if (!latest.current) return
      sending.current = sendGameMasterTraffic(ch, sending.current, senderId.current, {
        type: 'board',
        board: latest.current,
      })
    }

    /** Open the channel the board flows on, with the hello → board handshake. */
    const openBoard = (name: string) => {
      const ch = client.channel(name, { config: { presence: { key: 'gm' } } })
      open.push(ch)
      channel.current = ch
      // A player joining has no history to read, so answer their hello with the board.
      ch.on('broadcast', { event: EVENT.protocol }, ({ payload }) => {
        const received = receivePlayerMessage(receiving.current, 'gm', payload)
        if (received.status !== 'accepted') return
        receiving.current = received.state
        if (received.message.type === 'hello') sendBoard(ch)
      })
      ch.on('broadcast', { event: EVENT.hello }, ({ payload }) => {
        const received = receiveLegacyPlayerMessage(receiving.current, 'gm', 'hello', payload)
        if (received.status !== 'accepted') return
        receiving.current = received.state
        sendBoard(ch)
      })
      ch.subscribe((status) => {
        if (status !== 'SUBSCRIBED') return
        void ch.track({ role: 'gm' })
        sendBoard(ch)
      })
    }

    if (pin) {
      // The lobby holds the door: it answers hellos with `locked` and nothing else, and
      // its presence is what lets a waiting player see the GM is actually there.
      const lobby = client.channel(channelName(code), { config: { presence: { key: 'gm' } } })
      open.push(lobby)
      /** Tell a viewer that the board needs its PIN over both protocol paths. */
      const sendLocked = () => {
        sending.current = sendGameMasterTraffic(lobby, sending.current, senderId.current, {
          type: 'locked',
        })
      }
      lobby.on('broadcast', { event: EVENT.protocol }, ({ payload }) => {
        const received = receivePlayerMessage(receiving.current, 'gm', payload)
        if (received.status !== 'accepted') return
        receiving.current = received.state
        if (received.message.type === 'hello') sendLocked()
      })
      lobby.on('broadcast', { event: EVENT.hello }, ({ payload }) => {
        const received = receiveLegacyPlayerMessage(receiving.current, 'gm', 'hello', payload)
        if (received.status !== 'accepted') return
        receiving.current = received.state
        sendLocked()
      })
      lobby.subscribe((status) => {
        if (status !== 'SUBSCRIBED') return
        void lobby.track({ role: 'gm' })
        sendLocked()
      })
      void lockedChannelName(code, pin).then((name) => {
        if (!cancelled) openBoard(name)
      })
    } else {
      openBoard(channelName(code))
    }

    return () => {
      cancelled = true
      for (const ch of open) {
        // Tell the players this was deliberate before the socket drops, so they read
        // "the Game Master stopped sharing" rather than an unexplained silence.
        sending.current = sendGameMasterTraffic(ch, sending.current, senderId.current, {
          type: 'closed',
        })
        void client.removeChannel(ch)
      }
      channel.current = null
    }
  }, [code, pin])

  useEffect(() => {
    if (!code) {
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
  }, [code, encounter, settings, recap, campaign, gm, background])
}

/**
 * What a player's screen is doing. `waiting` covers both halves of the same story —
 * the GM hasn't started sharing yet, or they have stopped — because from the table's
 * side the answer is the same: ask the Game Master.
 */
export type PlayerLinkStatus = 'unavailable' | 'connecting' | 'waiting' | 'locked' | 'live'

/**
 * Subscribe to a shared board and follow it. Read-only: this side never sends a board.
 * `pin` is the viewer's four-digit try at a locked link; the board channel it derives
 * either answers with the board or stays silent, which is what `pinRejected` reports.
 */
export function usePlayerBoard(
  code: string,
  pin: string | null = null,
): {
  status: PlayerLinkStatus
  board: PlayerBoard | null
  /** A four-digit try that went unanswered — almost surely the wrong PIN. */
  pinRejected: boolean
} {
  const [status, setStatus] = useState<PlayerLinkStatus>(
    playerViewAvailable() ? 'connecting' : 'unavailable',
  )
  const [board, setBoard] = useState<PlayerBoard | null>(null)
  const [pinRejected, setPinRejected] = useState(false)
  const sending = useRef<PlayerProtocolState>({ ...INITIAL_PLAYER_PROTOCOL_STATE })
  const receiving = useRef<PlayerProtocolState>({ ...INITIAL_PLAYER_PROTOCOL_STATE })
  const senderId = useRef(uid())

  useEffect(() => {
    sending.current = { ...INITIAL_PLAYER_PROTOCOL_STATE }
    receiving.current = { ...INITIAL_PLAYER_PROTOCOL_STATE }
    senderId.current = uid()
  }, [code])

  useEffect(() => {
    if (!supabase) return
    const client = supabase
    const ch = client.channel(channelName(code))
    let waiting: ReturnType<typeof setTimeout> | undefined

    /** Apply one validated Game Master message to the viewer screen. */
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

    /** Whether a Game Master is currently tracked on this channel. */
    const gmPresent = () => Object.keys(ch.presenceState()).length > 0

    /**
     * The Game Master is gone — deliberately, or because the tab closed. Drop the
     * board with the status: a frozen tracker looks like a live one, and a table
     * reading stale hit points is worse off than a table told to ask the GM.
     */
    const stepAway = () => {
      setStatus('waiting')
      setBoard(null)
    }

    ch.on('broadcast', { event: EVENT.protocol }, ({ payload }) => {
      const received = receivePlayerMessage(receiving.current, 'viewer', payload)
      if (received.status !== 'accepted') return
      receiving.current = received.state
      if (received.message.type !== 'hello') applyMessage(received.message)
    })
    ch.on('broadcast', { event: EVENT.board }, ({ payload }) => {
      const received = receiveLegacyPlayerMessage(receiving.current, 'viewer', 'board', payload)
      if (received.status !== 'accepted' || received.message.type === 'hello') return
      receiving.current = received.state
      applyMessage(received.message)
    })
    // The GM is here but the board is behind a PIN; live via the locked channel wins.
    ch.on('broadcast', { event: EVENT.locked }, ({ payload }) => {
      const received = receiveLegacyPlayerMessage(receiving.current, 'viewer', 'locked', payload)
      if (received.status !== 'accepted' || received.message.type === 'hello') return
      receiving.current = received.state
      applyMessage(received.message)
    })
    ch.on('broadcast', { event: EVENT.closed }, ({ payload }) => {
      const received = receiveLegacyPlayerMessage(receiving.current, 'viewer', 'closed', payload)
      if (received.status !== 'accepted' || received.message.type === 'hello') return
      receiving.current = received.state
      applyMessage(received.message)
    })
    // A GM who closed the tab sends nothing, so presence is what catches them leaving.
    ch.on('presence', { event: 'sync' }, () => {
      if (!gmPresent()) stepAway()
    })
    /** Ask for the current board over both the versioned and rollback paths. */
    const sendHello = () => {
      sending.current = sendViewerHello(ch, sending.current, senderId.current)
    }

    ch.on('presence', { event: 'join' }, sendHello)

    ch.subscribe((state) => {
      if (state !== 'SUBSCRIBED') return
      sendHello()
      waiting = setTimeout(
        () => setStatus((s) => (s === 'connecting' ? 'waiting' : s)),
        HELLO_TIMEOUT_MS,
      )
    })

    return () => {
      clearTimeout(waiting)
      void client.removeChannel(ch)
    }
  }, [code])

  // The viewer's try at a locked link: subscribe where that PIN says the board is.
  // The wrong PIN derives a channel nobody sends on, so silence is the verdict.
  useEffect(() => {
    setPinRejected(false)
    if (!supabase || !pin) return
    const client = supabase
    let cancelled = false
    let ch: RealtimeChannel | null = null
    let waiting: ReturnType<typeof setTimeout> | undefined
    let answered = false

    void lockedChannelName(code, pin).then((name) => {
      if (cancelled) return
      const c = client.channel(name)
      ch = c
      /** Apply one validated message from the PIN-derived board channel. */
      const applyMessage = (message: GameMasterMessage) => {
        if (message.type === 'board') {
          answered = true
          clearTimeout(waiting)
          setPinRejected(false)
          setBoard(message.board)
          setStatus('live')
        } else if (message.type === 'closed') {
          setBoard(null)
          setStatus((value) => (value === 'live' ? 'connecting' : value))
        }
      }
      c.on('broadcast', { event: EVENT.protocol }, ({ payload }) => {
        const received = receivePlayerMessage(receiving.current, 'viewer', payload)
        if (received.status !== 'accepted') return
        receiving.current = received.state
        if (received.message.type !== 'hello') applyMessage(received.message)
      })
      c.on('broadcast', { event: EVENT.board }, ({ payload }) => {
        const received = receiveLegacyPlayerMessage(receiving.current, 'viewer', 'board', payload)
        if (received.status !== 'accepted' || received.message.type === 'hello') return
        receiving.current = received.state
        applyMessage(received.message)
      })
      // The GM re-keyed or stopped sharing; the lobby's own events say which.
      c.on('broadcast', { event: EVENT.closed }, ({ payload }) => {
        const received = receiveLegacyPlayerMessage(receiving.current, 'viewer', 'closed', payload)
        if (received.status !== 'accepted' || received.message.type === 'hello') return
        receiving.current = received.state
        applyMessage(received.message)
      })
      /** Ask for the PIN-protected board over both compatible paths. */
      const sendHello = () => {
        sending.current = sendViewerHello(c, sending.current, senderId.current)
      }
      c.on('presence', { event: 'join' }, sendHello)
      c.subscribe((state) => {
        if (state !== 'SUBSCRIBED') return
        sendHello()
        waiting = setTimeout(() => {
          if (!answered) setPinRejected(true)
        }, PIN_TRY_TIMEOUT_MS)
      })
    })

    return () => {
      cancelled = true
      clearTimeout(waiting)
      if (ch) void client.removeChannel(ch)
    }
  }, [code, pin])

  return { status, board, pinRejected }
}
