// @vitest-environment jsdom
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { describe, expect, it } from 'vitest'
import { normalizePublication } from '../../src/publication/index.ts'

/** A canonical browser-side publication input. */
const input = {
  kind: 'encounter',
  data: {
    v: 1,
    name: 'Browser fixture',
    entries: [{ quick: { name: 'Scout', maxHp: 8, ac: 12 }, count: 1, side: 'friend' }],
  },
}

describe('publication contract in a browser environment', () => {
  it('normalizes without Node or server adapters', () => {
    expect(window.document).toBe(document)
    expect(normalizePublication(input).status).toBe('ok')
  })
})
