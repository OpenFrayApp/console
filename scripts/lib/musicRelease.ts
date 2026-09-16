// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { createHash } from 'node:crypto'

import type { CuratedMusicCatalog } from '../../workers/music/catalog.ts'

interface MusicReleaseInput {
  trackId: string
  bytes: Uint8Array
  publicTrackIds: readonly string[]
  deploymentCatalog: CuratedMusicCatalog
}

export interface MusicReleaseInspection {
  trackId: string
  objectKey: string
  bytes: number
  sha256: string
  contentType: 'audio/ogg'
}

/** Verify an audio encode and every catalog constraint before an R2 write. */
export async function inspectMusicRelease({
  trackId,
  bytes,
  publicTrackIds,
  deploymentCatalog,
}: MusicReleaseInput): Promise<MusicReleaseInspection> {
  const track = deploymentCatalog[trackId]
  if (!track || track.id !== trackId) {
    throw new Error(`Track ${trackId} is absent from the approved deployment catalog.`)
  }

  const publicIds = [...new Set(publicTrackIds)].sort()
  const deploymentIds = Object.keys(deploymentCatalog).sort()
  if (JSON.stringify(publicIds) !== JSON.stringify(deploymentIds)) {
    throw new Error('Music catalog parity failed between the console and deployment catalog.')
  }
  if (!track.rights.consoleUse || !track.rights.transcoding || !track.rights.browserDelivery) {
    throw new Error(`Track ${trackId} does not have every required recorded rights grant.`)
  }
  if (bytes.byteLength > track.maxBytes) {
    throw new Error(`Track ${trackId} exceeds its ${track.maxBytes}-byte release budget.`)
  }
  if (new TextDecoder('ascii').decode(bytes.subarray(0, 4)) !== 'OggS') {
    throw new Error(`Track ${trackId} is not an Ogg encode.`)
  }

  const sha256 = createHash('sha256').update(bytes).digest('hex')
  if (bytes.byteLength !== track.bytes) {
    throw new Error(`Track ${trackId} has ${bytes.byteLength} bytes; expected ${track.bytes}.`)
  }
  if (sha256 !== track.sha256) {
    throw new Error(`Track ${trackId} digest does not match the approved encode.`)
  }

  return {
    trackId,
    objectKey: track.objectKey,
    bytes: bytes.byteLength,
    sha256,
    contentType: track.contentType,
  }
}
