// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useCallback, useRef, useState } from 'react'
import type { MusicTrack } from '../../music/catalog.ts'
import type { MusicPlayerSnapshot } from '../../music/player.ts'
import { useDismiss } from '../../hooks/useDismiss.ts'
import { IconButton } from '../ui/primitives.tsx'
import { popoverClass } from '../ui/popover.ts'

/** Draw the music note used for the player's one Play/Pause control. */
function MusicNoteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-4 w-4"
    >
      <path d="M9 18V5l10-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="16" cy="16" r="3" />
    </svg>
  )
}

/** Draw the speaker used to open the player's volume control. */
function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-4 w-4"
    >
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      {muted ? <path d="m16 9 5 6m0-6-5 6" /> : <path d="M15 9a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12" />}
    </svg>
  )
}

/** Convert a controller failure into the short recovery line shown beside the controls. */
function statusMessage(state: MusicPlayerSnapshot): string | null {
  if (state.status === 'loading') return 'Loading music…'
  if (state.error === 'offline') return 'Music needs a connection.'
  if (state.error === 'unavailable') {
    return 'That track is unavailable. Choose another track or try again.'
  }
  if (state.error === 'rejected') return 'Playback was blocked. Press Play to try again.'
  return null
}

/** Let the Game Master queue, play, pause, and set the volume of an approved track. */
export function MusicPlayer({
  tracks,
  state,
  onSelect,
  onPlay,
  onPause,
  onVolume,
}: {
  tracks: readonly MusicTrack[]
  state: MusicPlayerSnapshot
  onSelect: (trackId: string | null) => void
  onPlay: () => void
  onPause: () => void
  onVolume: (volume: number) => void
}) {
  const [volumeOpen, setVolumeOpen] = useState(false)
  const volumeRef = useRef<HTMLDivElement>(null)
  const closeVolume = useCallback(() => setVolumeOpen(false), [])
  /** Close the volume popover and return keyboard focus to the button that opened it. */
  const closeVolumeAndRestoreFocus = useCallback(() => {
    setVolumeOpen(false)
    volumeRef.current?.querySelector('button')?.focus()
  }, [])
  useDismiss(volumeRef, volumeOpen, closeVolume)
  const active = state.status === 'loading' || state.status === 'playing'
  const message = statusMessage(state)

  return (
    <div className="flex w-56 max-w-full min-w-0 flex-col items-end gap-1" data-music-player>
      <div
        className="flex w-full min-w-0 items-center gap-1"
        role="group"
        aria-label="Music player"
      >
        <select
          aria-label="Music track"
          value={state.selectedId ?? ''}
          onChange={(event) => onSelect(event.target.value || null)}
          className="tap-y min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="">Choose music</option>
          {tracks.map((track) => (
            <option key={track.id} value={track.id}>
              {track.title}
            </option>
          ))}
        </select>
        <IconButton
          size={8}
          active={active}
          onClick={active ? onPause : onPlay}
          aria-label={active ? 'Pause music' : 'Play music'}
          title={active ? 'Pause music' : 'Play music'}
          aria-pressed={active}
          disabled={!state.selectedId}
        >
          <MusicNoteIcon />
        </IconButton>
        <div className="relative" ref={volumeRef}>
          <IconButton
            size={8}
            onClick={() => setVolumeOpen((open) => !open)}
            aria-label="Music volume"
            title="Music volume"
            aria-expanded={volumeOpen}
          >
            <SpeakerIcon muted={state.volume === 0} />
          </IconButton>
          {volumeOpen && (
            <div
              className={`${popoverClass('roomy:w-20', 'right', 'above')} flex flex-col items-center gap-2 p-3`}
              onKeyDown={(event) => {
                if (event.key !== 'Escape') return
                event.stopPropagation()
                closeVolumeAndRestoreFocus()
              }}
            >
              <label
                htmlFor="music-volume"
                className="text-xs font-medium text-slate-700 dark:text-slate-200"
              >
                Volume
              </label>
              <input
                id="music-volume"
                type="range"
                min={0}
                max={100}
                value={Math.round(state.volume * 100)}
                onChange={(event) => onVolume(Number(event.target.value) / 100)}
                aria-label="Music volume"
                aria-orientation="vertical"
                className="h-24 w-11 cursor-pointer [direction:rtl] [writing-mode:vertical-lr]"
              />
              <output htmlFor="music-volume" className="text-xs text-slate-600 dark:text-slate-300">
                {Math.round(state.volume * 100)}%
              </output>
            </div>
          )}
        </div>
      </div>
      {message && (
        <p className="max-w-72 text-right text-xs text-slate-600 dark:text-slate-300" role="status">
          {message}
        </p>
      )}
    </div>
  )
}
