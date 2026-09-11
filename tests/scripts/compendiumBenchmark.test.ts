// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { describe, expect, it } from 'vitest'
import {
  contentType,
  meetsThresholds,
  percentile,
  summarize,
} from '../../scripts/lib/compendiumBenchmark.mjs'

describe('compendium benchmark report helpers', () => {
  it('labels browser assets with the response types the benchmark serves', () => {
    expect(contentType('index.html')).toBe('text/html; charset=utf-8')
    expect(contentType('assets/app.js')).toBe('text/javascript; charset=utf-8')
    expect(contentType('compendium/srd-creatures.json')).toBe('application/json; charset=utf-8')
    expect(contentType('og-image.png')).toBe('image/png')
    expect(contentType('unknown.bin')).toBe('application/octet-stream')
  })

  it('uses nearest-rank percentiles without changing the sample order', () => {
    const samples = [40, 10, 30, 20]
    expect(percentile(samples, 0.5)).toBe(20)
    expect(percentile(samples, 0.9)).toBe(40)
    expect(samples).toEqual([40, 10, 30, 20])
  })

  it('records rounded samples, median, p90, and maximum', () => {
    expect(summarize([10.04, 20.06, 30.08, 40.02])).toEqual({
      samplesMs: [10, 20.1, 30.1, 40],
      medianMs: 20.1,
      p90Ms: 40,
      maxMs: 40,
    })
  })

  it('requires the cold target, cold ceiling, and warm limit together', () => {
    expect(meetsThresholds({ coldTarget: true, coldLimit: true, warmLimit: true })).toBe(true)
    expect(meetsThresholds({ coldTarget: false, coldLimit: true, warmLimit: true })).toBe(false)
    expect(meetsThresholds({ coldTarget: true, coldLimit: false, warmLimit: true })).toBe(false)
    expect(meetsThresholds({ coldTarget: true, coldLimit: true, warmLimit: false })).toBe(false)
  })
})
