// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { MusicTrack } from './catalog.ts'

export type MusicPlayerStatus = 'idle' | 'queued' | 'loading' | 'playing' | 'paused' | 'error'
export type MusicPlayerError = 'offline' | 'unavailable' | 'rejected'

export interface MusicPlayerSnapshot {
  selectedId: string | null
  status: MusicPlayerStatus
  error: MusicPlayerError | null
  volume: number
}

/** The native media surface the controller owns, narrowed so it can be tested without a browser. */
export interface MusicAudio {
  src: string
  loop: boolean
  preload: string
  volume: number
  currentTime: number
  play(): Promise<void>
  pause(): void
  load(): void
  removeAttribute(name: string): void
  addEventListener(name: string, listener: () => void): void
  removeEventListener(name: string, listener: () => void): void
}

export interface MusicController {
  getSnapshot(): MusicPlayerSnapshot
  subscribe(listener: () => void): () => void
  select(trackId: string | null): void
  play(): Promise<void>
  pause(): void
  setVolume(volume: number): void
  destroy(): void
}

interface MusicControllerOptions {
  audio: MusicAudio
  tracks: readonly MusicTrack[]
  initialVolume: number
  isOnline: () => boolean
  onPlayed: (trackId: string) => void
}

/** Keep a numeric volume inside the native media element's accepted range. */
function clampVolume(volume: number): number {
  return Math.min(1, Math.max(0, volume))
}

/** Own one native audio element and expose its durable UI state to React. */
export function createMusicController({
  audio,
  tracks,
  initialVolume,
  isOnline,
  onPlayed,
}: MusicControllerOptions): MusicController {
  const listeners = new Set<() => void>()
  let snapshot: MusicPlayerSnapshot = {
    selectedId: null,
    status: 'idle',
    error: null,
    volume: clampVolume(initialVolume),
  }
  let wantsPlayback = false
  let pendingPlayedId: string | null = null
  let loadedId: string | null = null
  let request = 0
  let destroyed = false

  audio.loop = true
  audio.preload = 'none'
  audio.volume = snapshot.volume

  /** Publish a new immutable snapshot to every subscriber. */
  const update = (patch: Partial<MusicPlayerSnapshot>) => {
    snapshot = { ...snapshot, ...patch }
    for (const listener of listeners) listener()
  }

  /** Return the currently selected approved catalog entry. */
  const selectedTrack = (): MusicTrack | undefined =>
    tracks.find((track) => track.id === snapshot.selectedId)

  /** Release a loaded source while leaving an untouched queued player alone. */
  const releaseSource = () => {
    if (!loadedId) return
    loadedId = null
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
  }

  /** Mark native playback as started and emit analytics once for this play request. */
  const onPlaying = () => {
    if (!wantsPlayback || destroyed) return
    update({ status: 'playing', error: null })
    if (pendingPlayedId) {
      onPlayed(pendingPlayedId)
      pendingPlayedId = null
    }
  }

  /** Keep the visible state honest while the browser buffers a requested track. */
  const onWaiting = () => {
    if (wantsPlayback && !destroyed) update({ status: 'loading', error: null })
  }

  /** Translate a media request failure into an actionable player-only state. */
  const onError = () => {
    if (destroyed) return
    wantsPlayback = false
    pendingPlayedId = null
    loadedId = null
    update({ status: 'error', error: isOnline() ? 'unavailable' : 'offline' })
  }

  audio.addEventListener('playing', onPlaying)
  audio.addEventListener('waiting', onWaiting)
  audio.addEventListener('loadstart', onWaiting)
  audio.addEventListener('error', onError)

  /** Request playback of the current selection without throwing into a combat action. */
  const play = async (): Promise<void> => {
    const track = selectedTrack()
    if (!track || destroyed) return
    if (!isOnline()) {
      wantsPlayback = false
      update({ status: 'error', error: 'offline' })
      return
    }

    const thisRequest = ++request
    wantsPlayback = true
    pendingPlayedId = track.id
    if (loadedId !== track.id) {
      audio.src = track.src
      loadedId = track.id
    }
    update({ status: 'loading', error: null })
    try {
      await audio.play()
    } catch {
      if (thisRequest !== request || destroyed) return
      wantsPlayback = false
      pendingPlayedId = null
      update({ status: 'error', error: 'rejected' })
    }
  }

  return {
    /** Read the referentially stable snapshot used by `useSyncExternalStore`. */
    getSnapshot: () => snapshot,
    /** Re-render a consumer whenever media state changes. */
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    /** Queue a stopped selection, or switch immediately when playback is active. */
    select: (trackId) => {
      const track = tracks.find((candidate) => candidate.id === trackId)
      const wasPlaying = wantsPlayback
      request += 1
      pendingPlayedId = null
      if (!track) {
        wantsPlayback = false
        releaseSource()
        update({ selectedId: null, status: 'idle', error: null })
        return
      }

      update({ selectedId: track.id, status: wasPlaying ? 'loading' : 'queued', error: null })
      if (wasPlaying) void play()
    },
    play,
    /** Pause by explicit request and prevent a later media event from resuming the UI state. */
    pause: () => {
      if (!snapshot.selectedId || destroyed) return
      request += 1
      wantsPlayback = false
      pendingPlayedId = null
      audio.pause()
      update({ status: 'paused', error: null })
    },
    /** Apply volume immediately without touching playback position or intent. */
    setVolume: (volume) => {
      const next = clampVolume(volume)
      audio.volume = next
      update({ volume: next })
    },
    /** Release native media and every listener when the application leaves. */
    destroy: () => {
      if (destroyed) return
      destroyed = true
      request += 1
      wantsPlayback = false
      pendingPlayedId = null
      audio.removeEventListener('playing', onPlaying)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('loadstart', onWaiting)
      audio.removeEventListener('error', onError)
      releaseSource()
      snapshot = {
        ...snapshot,
        status: snapshot.selectedId ? 'queued' : 'idle',
        error: null,
      }
      listeners.clear()
    },
  }
}
