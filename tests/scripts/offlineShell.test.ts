import { describe, expect, it } from 'vitest'

import { isRequiredOfflineAsset } from '../../scripts/offlineShell'
import { musicCatalog } from '../../src/music/catalog'

describe('offline shell inventory', () => {
  it('leaves every lazy catalog track outside the required shell', () => {
    for (const track of musicCatalog) {
      expect(isRequiredOfflineAsset(track.src.replace('/console/', ''))).toBe(false)
    }
    expect(isRequiredOfflineAsset('music/nested/future-track.ogg')).toBe(false)
    expect(isRequiredOfflineAsset('musical-notes.svg')).toBe(true)
    expect(isRequiredOfflineAsset('assets/index.js')).toBe(true)
    expect(isRequiredOfflineAsset('compendium/index.json')).toBe(true)
  })
})
