// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase.ts'
import type { Encounter } from '../schema/encounter.ts'
import type { PlayerViewSettings } from './settings.ts'
import { playerBoard, type PlayerBoard, type PlayerRecap } from '../combat/playerView.ts'

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
const EVENT = { board: 'board', hello: 'hello', closed: 'closed' } as const

/** Realtime needs a configured project; without one the player view can't work at all. */
export function playerViewAvailable(): boolean {
  return supabase !== null
}

/** The channel for a share code. One channel per code, so two tables never mix. */
const channelName = (code: string): string => `player:${code}`

/** How long a player waits for the first board before saying the GM isn't there yet. */
const HELLO_TIMEOUT_MS = 4000

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
): void {
  const channel = useRef<RealtimeChannel | null>(null)
  const latest = useRef<PlayerBoard | null>(null)

  useEffect(() => {
    if (!supabase || !code) return
    const client = supabase
    const ch = client.channel(channelName(code), { config: { presence: { key: 'gm' } } })
    channel.current = ch
    // A player joining has no history to read, so answer their hello with the board.
    ch.on('broadcast', { event: EVENT.hello }, () => {
      if (latest.current)
        ch.send({ type: 'broadcast', event: EVENT.board, payload: latest.current })
    })
    ch.subscribe((status) => {
      if (status !== 'SUBSCRIBED') return
      void ch.track({ role: 'gm' })
      if (latest.current)
        ch.send({ type: 'broadcast', event: EVENT.board, payload: latest.current })
    })
    return () => {
      // Tell the players this was deliberate before the socket drops, so they read
      // "the Game Master stopped sharing" rather than an unexplained silence.
      ch.send({ type: 'broadcast', event: EVENT.closed, payload: {} })
      void client.removeChannel(ch)
      channel.current = null
    }
  }, [code])

  useEffect(() => {
    if (!code) {
      latest.current = null
      return
    }
    const board = playerBoard(encounter, settings, recap)
    latest.current = board
    const handle = setTimeout(() => {
      channel.current?.send({ type: 'broadcast', event: EVENT.board, payload: board })
    }, SEND_DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [code, encounter, settings, recap])
}

/**
 * What a player's screen is doing. `waiting` covers both halves of the same story —
 * the GM hasn't started sharing yet, or they have stopped — because from the table's
 * side the answer is the same: ask the Game Master.
 */
export type PlayerLinkStatus = 'unavailable' | 'connecting' | 'waiting' | 'live'

/** Subscribe to a shared board and follow it. Read-only: this side never sends a board. */
export function usePlayerBoard(code: string): {
  status: PlayerLinkStatus
  board: PlayerBoard | null
} {
  const [status, setStatus] = useState<PlayerLinkStatus>(
    playerViewAvailable() ? 'connecting' : 'unavailable',
  )
  const [board, setBoard] = useState<PlayerBoard | null>(null)

  useEffect(() => {
    if (!supabase) return
    const client = supabase
    const ch = client.channel(channelName(code))
    let waiting: ReturnType<typeof setTimeout> | undefined

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

    ch.on('broadcast', { event: EVENT.board }, ({ payload }) => {
      clearTimeout(waiting)
      setBoard(payload as PlayerBoard)
      setStatus('live')
    })
    ch.on('broadcast', { event: EVENT.closed }, stepAway)
    // A GM who closed the tab sends nothing, so presence is what catches them leaving.
    ch.on('presence', { event: 'sync' }, () => {
      if (!gmPresent()) stepAway()
    })
    ch.on('presence', { event: 'join' }, () => {
      ch.send({ type: 'broadcast', event: EVENT.hello, payload: {} })
    })

    ch.subscribe((state) => {
      if (state !== 'SUBSCRIBED') return
      ch.send({ type: 'broadcast', event: EVENT.hello, payload: {} })
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

  return { status, board }
}
