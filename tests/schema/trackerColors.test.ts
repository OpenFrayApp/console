// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { describe, expect, it } from 'vitest'
import * as v from 'valibot'
import { trackerColorsSchema, resolveTrackerColors } from '../../src/schema/trackerColors.ts'
import { playerBoardSchema } from '../../src/schema/playerBoard.ts'

const board = { round: 0, paused: false, activeId: null, rows: [], log: [] }

describe('shared marker colors', () => {
  it('accepts old boards and boards with opaque hex colors', () => {
    expect(v.safeParse(playerBoardSchema, board).success).toBe(true)
    expect(
      v.safeParse(playerBoardSchema, { ...board, colors: { creature: '#AbC123', ally: null } })
        .success,
    ).toBe(true)
  })

  it.each(['red', '#123', '#12345678', 'url(https://example.com)', 'var(--color)', 123])(
    'rejects invalid wire colors %j',
    (creature) => {
      expect(
        v.safeParse(playerBoardSchema, { ...board, colors: { creature, ally: null } }).success,
      ).toBe(false)
    },
  )

  it('rejects extra fields in the colors object', () => {
    expect(
      v.safeParse(trackerColorsSchema, { creature: null, ally: null, secret: 'hidden' }).success,
    ).toBe(false)
  })

  it('keeps a deliberately equal override independent of future tracker changes', () => {
    const overrides = { creature: '#123456', ally: null }
    expect(resolveTrackerColors(overrides, { creature: '#ffffff', ally: '#000000' })).toEqual({
      creature: '#123456',
      ally: '#000000',
    })
  })
})
