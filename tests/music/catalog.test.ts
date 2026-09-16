import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { MUSIC_ASSET_BUDGET_BYTES, musicCatalog } from '../../src/music/catalog'

const projectRoot = resolve(import.meta.dirname, '../..')

describe('music catalog', () => {
  it('publishes the approved launch track under a stable ID', () => {
    expect(musicCatalog).toEqual([
      {
        id: 'ancient-god',
        title: 'Ancient God',
        src: '/console/music/ancient-god.ogg',
      },
    ])
  })

  it('keeps every deployable encode within the release budget', () => {
    const ids = new Set<string>()

    for (const track of musicCatalog) {
      expect(ids.has(track.id), `duplicate track ID: ${track.id}`).toBe(false)
      ids.add(track.id)

      const assetPath = resolve(projectRoot, 'public', track.src.replace('/console/', ''))
      const bytes = readFileSync(assetPath)

      expect(bytes.subarray(0, 4).toString('ascii')).toBe('OggS')
      expect(statSync(assetPath).size).toBeLessThanOrEqual(MUSIC_ASSET_BUDGET_BYTES)
    }
  })
})
