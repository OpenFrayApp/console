// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

export interface CuratedMusicTrack {
  id: string
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

export const curatedMusicCatalog = {
  'ancient-god': {
    id: 'ancient-god',
    objectKey: 'tracks/ancient-god.ogg',
    contentType: 'audio/ogg',
    maxBytes: 8 * 1024 * 1024,
    bytes: 2314611,
    sha256: 'd4a1d5259ad94cba75522439c454a14e0a1ed298820460f532f0697317ceace5',
    rights: {
      consoleUse: true,
      transcoding: true,
      browserDelivery: true,
    },
  },
} as const satisfies CuratedMusicCatalog
