// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

export const MUSIC_PATH_PREFIX = '/console/music/'
export const ANCIENT_GOD_TRACK_ID = 'ancient-god'

/** Build the public Worker route for one stable catalog ID. */
export function musicTrackPath(trackId: string): string {
  return `${MUSIC_PATH_PREFIX}${trackId}`
}

/** Read a valid stable catalog ID from an exact music Worker route. */
export function musicTrackIdFromPath(path: string): string | null {
  if (!path.startsWith(MUSIC_PATH_PREFIX)) return null
  const trackId = path.slice(MUSIC_PATH_PREFIX.length)
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trackId) ? trackId : null
}

export interface MusicTrack {
  id: string
  title: string
  src: string
}

export const musicCatalog = [
  {
    id: ANCIENT_GOD_TRACK_ID,
    title: 'Ancient God',
    src: musicTrackPath(ANCIENT_GOD_TRACK_ID),
  },
] as const satisfies readonly MusicTrack[]
