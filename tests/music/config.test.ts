// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

/** Parse the comment-free Wrangler JSONC used by this repository. */
function parseWranglerConfig(source: string): Record<string, unknown> {
  return JSON.parse(source.replace(/,\s*([}\]])/g, '$1')) as Record<string, unknown>
}

const config = parseWranglerConfig(
  readFileSync(resolve(import.meta.dirname, '../../wrangler.music.jsonc'), 'utf8'),
)

describe('music Worker deployment', () => {
  it('uses only the OpenFray route with private R2 and rate-limit bindings', () => {
    expect(config.workers_dev).toBe(false)
    expect(config.routes).toEqual([
      { pattern: 'openfray.app/console/music/*', zone_name: 'openfray.app' },
    ])
    expect(config.r2_buckets).toEqual([{ binding: 'MUSIC_BUCKET', bucket_name: 'openfray-music' }])
    expect(config.ratelimits).toEqual([
      {
        name: 'MUSIC_RATE_LIMITER',
        namespace_id: '1001',
        simple: { limit: 120, period: 60 },
      },
    ])
  })
})
