// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

export const MUSIC_ASSET_BUDGET_BYTES = 8 * 1024 * 1024
export const MUSIC_PATH_PREFIX = '/console/music/'

export interface MusicTrack {
  id: string
  title: string
  src: string
}

export const musicCatalog = [
  {
    id: 'ancient-god',
    title: 'Ancient God',
    src: '/console/music/ancient-god.ogg',
  },
] as const satisfies readonly MusicTrack[]
