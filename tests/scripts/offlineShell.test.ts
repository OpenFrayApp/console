import { describe, expect, it } from 'vitest'

import { isRequiredOfflineAsset } from '../../scripts/offlineShell'

describe('offline shell inventory', () => {
  it('leaves the lazy music catalog outside the required shell', () => {
    expect(isRequiredOfflineAsset('music/ancient-god.ogg')).toBe(false)
    expect(isRequiredOfflineAsset('assets/index.js')).toBe(true)
    expect(isRequiredOfflineAsset('compendium/index.json')).toBe(true)
  })
})
