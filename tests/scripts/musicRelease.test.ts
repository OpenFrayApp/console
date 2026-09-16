// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { inspectMusicRelease } from '../../scripts/lib/musicRelease.ts'
import { musicCatalog } from '../../src/music/catalog.ts'
import { curatedMusicCatalog, type CuratedMusicCatalog } from '../../workers/music/catalog.ts'

/** Calculate the Ogg page checksum independently for the test fixture. */
function oggChecksum(bytes: Uint8Array): number {
  let checksum = 0
  for (const byte of bytes) {
    checksum ^= byte << 24
    for (let bit = 0; bit < 8; bit += 1) {
      checksum = (checksum & 0x80000000 ? (checksum << 1) ^ 0x04c11db7 : checksum << 1) >>> 0
    }
  }
  return checksum
}

/** Build a minimal checksummed Ogg stream with Vorbis headers and one audio packet. */
function oggVorbisFixture(codec = 'vorbis', audioByte = 0): Uint8Array {
  const encoder = new TextEncoder()
  const signature = encoder.encode(codec)
  const identification = new Uint8Array(30)
  identification[0] = 1
  identification.set(signature, 1)
  identification[11] = 2
  new DataView(identification.buffer).setUint32(12, 44100, true)
  identification[29] = 1
  const packets = [
    identification,
    new Uint8Array([3, ...encoder.encode('vorbis'), 1]),
    new Uint8Array([5, ...encoder.encode('vorbis'), 1]),
    new Uint8Array([audioByte]),
  ]
  const bodyLength = packets.reduce((total, packet) => total + packet.byteLength, 0)
  const page = new Uint8Array(27 + packets.length + bodyLength)
  page.set(encoder.encode('OggS'))
  page[5] = 0x06
  new DataView(page.buffer).setUint32(14, 1, true)
  page[26] = packets.length
  let bodyOffset = 27 + packets.length
  packets.forEach((packet, index) => {
    page[27 + index] = packet.byteLength
    page.set(packet, bodyOffset)
    bodyOffset += packet.byteLength
  })
  new DataView(page.buffer).setUint32(22, oggChecksum(page), true)
  return page
}

const audio = oggVorbisFixture()
const approvedTrack = {
  objectKey: 'tracks/approved-track/version.ogg',
  contentType: 'audio/ogg',
  maxBytes: 1024,
  bytes: audio.byteLength,
  sha256: createHash('sha256').update(audio).digest('hex'),
  rights: { consoleUse: true, transcoding: true, browserDelivery: true },
} as const
const deploymentCatalog: CuratedMusicCatalog = { 'approved-track': approvedTrack }

describe('music release inspection', () => {
  it('keeps the public and deployment catalogs in parity', () => {
    expect(Object.keys(curatedMusicCatalog)).toEqual(musicCatalog.map((track) => track.id))
  })

  it('accepts an approved Ogg Vorbis encode when catalog and rights agree', async () => {
    const result = await inspectMusicRelease({
      trackId: 'approved-track',
      bytes: audio,
      publicTrackIds: ['approved-track'],
      deploymentCatalog,
    })

    expect(result).toEqual({
      trackId: 'approved-track',
      objectKey: 'tracks/approved-track/version.ogg',
      bytes: audio.byteLength,
      sha256: approvedTrack.sha256,
      contentType: 'audio/ogg',
    })
  })

  it('rejects unknown IDs, catalog drift, missing rights, invalid audio, oversize files, and digest drift', async () => {
    const base = {
      trackId: 'approved-track',
      bytes: audio,
      publicTrackIds: ['approved-track'],
      deploymentCatalog,
    } as const

    await expect(inspectMusicRelease({ ...base, trackId: '../secret' })).rejects.toThrow(
      'approved deployment catalog',
    )
    await expect(inspectMusicRelease({ ...base, publicTrackIds: [] })).rejects.toThrow(
      'catalog parity',
    )
    await expect(
      inspectMusicRelease({
        ...base,
        deploymentCatalog: {
          'approved-track': {
            ...approvedTrack,
            rights: { ...approvedTrack.rights, browserDelivery: false },
          },
        },
      }),
    ).rejects.toThrow('recorded rights')
    await expect(
      inspectMusicRelease({ ...base, bytes: new TextEncoder().encode('OggSplain text') }),
    ).rejects.toThrow('Ogg Vorbis')
    await expect(
      inspectMusicRelease({ ...base, bytes: oggVorbisFixture('notvor') }),
    ).rejects.toThrow('Ogg Vorbis')
    const corrupt = audio.slice()
    corrupt[corrupt.length - 1] ^= 1
    await expect(inspectMusicRelease({ ...base, bytes: corrupt })).rejects.toThrow('checksum')
    await expect(
      inspectMusicRelease({ ...base, bytes: new Uint8Array(approvedTrack.maxBytes + 1).fill(1) }),
    ).rejects.toThrow('release budget')
    await expect(
      inspectMusicRelease({ ...base, bytes: oggVorbisFixture('vorbis', 2) }),
    ).rejects.toThrow('digest')
  })
})
