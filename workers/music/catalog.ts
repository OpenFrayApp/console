// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { ANCIENT_GOD_TRACK_ID } from '../../src/music/catalog.ts'

export interface CuratedMusicTrack {
  objectKey: string
  contentType: 'audio/ogg'
  maxBytes: number
  bytes: number
  sha256: string
  rights: {
    consoleUse: boolean
    transcoding: boolean
    browserDelivery: boolean
  }
}

export type CuratedMusicCatalog = Readonly<Record<string, CuratedMusicTrack>>

export const MUSIC_RELEASE_BUDGET_BYTES = 8 * 1024 * 1024

const ancientGodSha256 = 'd4a1d5259ad94cba75522439c454a14e0a1ed298820460f532f0697317ceace5'

export const curatedMusicCatalog = {
  [ANCIENT_GOD_TRACK_ID]: {
    objectKey: `tracks/${ANCIENT_GOD_TRACK_ID}/${ancientGodSha256}.ogg`,
    contentType: 'audio/ogg',
    maxBytes: MUSIC_RELEASE_BUDGET_BYTES,
    bytes: 2314611,
    sha256: ancientGodSha256,
    rights: {
      consoleUse: true,
      transcoding: true,
      browserDelivery: true,
    },
  },
} as const satisfies CuratedMusicCatalog
