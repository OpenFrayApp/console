import { describe, expect, it } from 'vitest'

import { inspectMusicRelease } from '../../scripts/lib/musicRelease.ts'
import { musicCatalog } from '../../src/music/catalog.ts'
import { curatedMusicCatalog, type CuratedMusicCatalog } from '../../workers/music/catalog.ts'

const audio = new TextEncoder().encode('OggSapproved audio')
const approvedTrack = {
  id: 'approved-track',
  objectKey: 'tracks/approved-track.ogg',
  contentType: 'audio/ogg',
  maxBytes: 32,
  bytes: 18,
  sha256: 'e97e8ab662b77b38106b55002e1c38be52cff649e65c07306ddb4d2ddfa38417',
  rights: { consoleUse: true, transcoding: true, browserDelivery: true },
} as const
const deploymentCatalog: CuratedMusicCatalog = { 'approved-track': approvedTrack }

describe('music release inspection', () => {
  it('keeps the public and deployment catalogs in parity', () => {
    expect(Object.keys(curatedMusicCatalog)).toEqual(musicCatalog.map((track) => track.id))
  })

  it('accepts an approved OGG encode when catalog, rights, size, and digest agree', async () => {
    const result = await inspectMusicRelease({
      trackId: 'approved-track',
      bytes: audio,
      publicTrackIds: ['approved-track'],
      deploymentCatalog,
    })

    expect(result).toEqual({
      trackId: 'approved-track',
      objectKey: 'tracks/approved-track.ogg',
      bytes: 18,
      sha256: approvedTrack.sha256,
      contentType: 'audio/ogg',
    })
  })

  it('rejects unknown IDs, catalog drift, missing rights, invalid OGG, oversize files, and digest drift', async () => {
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
      inspectMusicRelease({ ...base, bytes: new Uint8Array([1, 2, 3, 4]) }),
    ).rejects.toThrow('Ogg')
    await expect(
      inspectMusicRelease({ ...base, bytes: new Uint8Array(approvedTrack.maxBytes + 1).fill(1) }),
    ).rejects.toThrow('release budget')
    await expect(
      inspectMusicRelease({ ...base, bytes: new TextEncoder().encode('OggSapproved audi0') }),
    ).rejects.toThrow('digest')
  })
})
