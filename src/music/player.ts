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
  restore(trackId: string | null): boolean
  select(trackId: string | null): void
  play(): Promise<void>
  pause(): void
  /** Start selected music for a new fight without restarting active playback. */
  startCombat(): void
  /** Pause an active request and remember that combat caused the pause. */
  pauseForCombat(): void
  /** Resume only the request that the current combat pause interrupted. */
  resumeForCombat(): void
  /** Stop and rewind playback while keeping the selected track queued. */
  endCombat(): void
  /** Stop playback and remove the selected track for a cleared board. */
  clearBoard(): void
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
export function normalizeMusicVolume(volume: unknown, fallback = 0.7): number {
  return typeof volume === 'number' && Number.isFinite(volume)
    ? Math.min(1, Math.max(0, volume))
    : fallback
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
    volume: normalizeMusicVolume(initialVolume),
  }
  let wantsPlayback = false
  let pausedByCombat = false
  let pendingPlayedId: string | null = null
  let loadedId: string | null = null
  let playRequestGeneration = 0
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

  /** Cancel the current play request and record whether combat caused it. */
  const cancelPlayback = (causedByCombat = false) => {
    playRequestGeneration += 1
    wantsPlayback = false
    pausedByCombat = causedByCombat
    pendingPlayedId = null
  }

  /** Rewind loaded media without assuming the browser has seekable data. */
  const rewind = () => {
    try {
      audio.currentTime = 0
    } catch {
      // A media element without seekable data is already at its beginning.
    }
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
    pausedByCombat = false
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
    pausedByCombat = false
    if (!track || destroyed) return
    if (wantsPlayback && loadedId === track.id) return
    if (!isOnline()) {
      wantsPlayback = false
      update({ status: 'error', error: 'offline' })
      return
    }

    const thisRequest = ++playRequestGeneration
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
      if (thisRequest !== playRequestGeneration || destroyed) return
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
    /** Restore only a catalog selection, leaving playback stopped at the beginning. */
    restore: (trackId) => {
      const track = tracks.find((candidate) => candidate.id === trackId)
      playRequestGeneration += 1
      wantsPlayback = false
      pausedByCombat = false
      pendingPlayedId = null
      releaseSource()
      if (!track) {
        update({
          selectedId: null,
          status: 'idle',
          error: trackId === null ? null : 'unavailable',
        })
        return trackId === null
      }
      update({ selectedId: track.id, status: 'queued', error: null })
      return true
    },
    /** Queue a stopped selection, or switch immediately when playback is active. */
    select: (trackId) => {
      const track = tracks.find((candidate) => candidate.id === trackId)
      const wasPlaying = wantsPlayback
      pausedByCombat = false
      playRequestGeneration += 1
      pendingPlayedId = null
      if (!track) {
        wantsPlayback = false
        releaseSource()
        update({ selectedId: null, status: 'idle', error: null })
        return
      }

      if (wasPlaying && loadedId !== track.id) audio.pause()
      update({ selectedId: track.id, status: wasPlaying ? 'loading' : 'queued', error: null })
      if (wasPlaying) void play()
    },
    play,
    /** Pause by explicit request and prevent a later media event from resuming the UI state. */
    pause: () => {
      pausedByCombat = false
      if (!snapshot.selectedId || destroyed) return
      cancelPlayback()
      audio.pause()
      update({ status: 'paused', error: null })
    },
    /** Start selected music for a new fight without restarting active playback. */
    startCombat: () => {
      pausedByCombat = false
      void play()
    },
    /** Pause an active request and remember that combat caused the pause. */
    pauseForCombat: () => {
      if (!wantsPlayback || !snapshot.selectedId || destroyed) return
      cancelPlayback(true)
      audio.pause()
      update({ status: 'paused', error: null })
    },
    /** Resume only the request that the current combat pause interrupted. */
    resumeForCombat: () => {
      if (!pausedByCombat || destroyed) return
      pausedByCombat = false
      void play()
    },
    /** Stop and rewind playback while keeping the selected track queued. */
    endCombat: () => {
      if (destroyed) return
      cancelPlayback()
      if (loadedId) audio.pause()
      rewind()
      update({ status: snapshot.selectedId ? 'queued' : 'idle', error: null })
    },
    /** Stop playback and remove the selected track for a cleared board. */
    clearBoard: () => {
      if (destroyed) return
      cancelPlayback()
      rewind()
      releaseSource()
      update({ selectedId: null, status: 'idle', error: null })
    },
    /** Apply volume immediately without touching playback position or intent. */
    setVolume: (volume) => {
      const next = normalizeMusicVolume(volume)
      audio.volume = next
      update({ volume: next })
    },
    /** Release native media and every listener when the application leaves. */
    destroy: () => {
      if (destroyed) return
      destroyed = true
      playRequestGeneration += 1
      wantsPlayback = false
      pausedByCombat = false
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
