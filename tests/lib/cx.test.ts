// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import { cx } from '../../src/lib/cx.ts'

describe('cx', () => {
  it('joins class parts with single spaces', () => {
    expect(cx('rounded', 'border', 'p-2')).toBe('rounded border p-2')
  })

  it('drops false and undefined so conditional classes read cleanly', () => {
    const active = false
    expect(cx('btn', active && 'btn-active', undefined, 'ml-2')).toBe('btn ml-2')
  })

  it('drops empty strings instead of doubling separators', () => {
    expect(cx('a', '', 'b')).toBe('a b')
  })

  it('returns an empty string when nothing survives', () => {
    expect(cx()).toBe('')
    expect(cx(false, undefined)).toBe('')
  })
})
