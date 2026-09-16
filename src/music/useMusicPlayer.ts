// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useCallback, useEffect, useRef, useState } from 'react'
import { trackMusicPlayed } from '../lib/analytics.ts'
import { loadSettings, saveSettings } from '../state/settings.ts'
import { musicCatalog } from './catalog.ts'
import {
  createMusicController,
  normalizeMusicVolume,
  type MusicController,
  type MusicPlayerSnapshot,
} from './player.ts'

const INITIAL_STATE: MusicPlayerSnapshot = {
  selectedId: null,
  status: 'idle',
  error: null,
  volume: 0.7,
}

/** Keep the application-level native player alive while console views mount and unmount. */
export function useMusicPlayer() {
  const controller = useRef<MusicController | null>(null)
  const pendingRestore = useRef<string | null | undefined>(undefined)
  const [state, setState] = useState<MusicPlayerSnapshot>(() => ({
    ...INITIAL_STATE,
    volume: loadSettings().musicVolume,
  }))

  useEffect(() => {
    const player = createMusicController({
      audio: new Audio(),
      tracks: musicCatalog,
      initialVolume: loadSettings().musicVolume,
      isOnline: () => navigator.onLine,
      onPlayed: trackMusicPlayed,
    })
    controller.current = player
    if (pendingRestore.current !== undefined) player.restore(pendingRestore.current)
    setState(player.getSnapshot())
    const unsubscribe = player.subscribe(() => setState(player.getSnapshot()))
    return () => {
      unsubscribe()
      player.destroy()
      controller.current = null
    }
  }, [])

  /** Restore a catalog selection without restoring playback. */
  const restore = useCallback((trackId: string | null) => {
    pendingRestore.current = trackId
    controller.current?.restore(trackId)
    return trackId === null || musicCatalog.some((track) => track.id === trackId)
  }, [])
  /** Queue or switch the selected catalog track. */
  const select = useCallback((trackId: string | null) => controller.current?.select(trackId), [])
  /** Ask the browser to play the queued track. */
  const play = useCallback(() => void controller.current?.play(), [])
  /** Pause music without releasing its queued selection. */
  const pause = useCallback(() => controller.current?.pause(), [])
  /** Apply and retain a device-level volume preference. */
  const setVolume = useCallback((volume: number) => {
    const next = normalizeMusicVolume(volume)
    controller.current?.setVolume(next)
    saveSettings({ musicVolume: next })
  }, [])

  return { tracks: musicCatalog, state, restore, select, play, pause, setVolume }
}
