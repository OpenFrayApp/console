import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { musicCatalog } from '../../src/music/catalog'

const projectRoot = resolve(import.meta.dirname, '../..')

describe('music catalog', () => {
  it('publishes the approved launch track through its stable Worker route', () => {
    expect(musicCatalog).toEqual([
      {
        id: 'ancient-god',
        title: 'Ancient God',
        src: '/console/music/ancient-god',
      },
    ])
  })

  it('keeps audio bytes outside the Pages source tree', () => {
    expect(existsSync(resolve(projectRoot, 'public/music'))).toBe(false)
  })
})
