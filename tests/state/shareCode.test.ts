// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { describe, expect, it } from 'vitest'
import {
  isShareCode,
  randomShareCode,
  shareCodeFromPath,
} from '../../src/state/shareCode.ts'

/**
 * The code is the only thing standing between a stranger and a published encounter, and it
 * is also the only thing a stranger hands us on that path — so both halves are pinned here:
 * what a drawn code looks like, and what the reader will accept off a URL.
 */

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

describe('randomShareCode', () => {
  it('draws ten characters that can be read off one screen and typed into another', () => {
    for (let i = 0; i < 200; i++) {
      const code = randomShareCode()
      expect(code).toHaveLength(10)
      // No 0/o or 1/l/i: a code gets read aloud and retyped.
      for (const ch of code) expect(ALPHABET).toContain(ch)
      expect(code).not.toMatch(/[01oli]/)
    }
  })

  it('never counts — a thousand draws collide with nothing and look nothing like a sequence', () => {
    const drawn = new Set(Array.from({ length: 1000 }, randomShareCode))
    expect(drawn.size).toBe(1000)
    // A counter would leave most of the alphabet unused in the leading position.
    const leads = new Set([...drawn].map((code) => code[0]))
    expect(leads.size).toBeGreaterThan(20)
  })
})

describe('isShareCode', () => {
  it('accepts what the app draws and refuses what it never would', () => {
    expect(isShareCode(randomShareCode())).toBe(true)
    for (const bad of [
      '',
      'abc',
      'a'.repeat(33),
      'has space',
      '../../etc',
      'CAPS',
      'zero0',
      'one1',
    ]) {
      expect(isShareCode(bad), bad).toBe(false)
    }
  })
})

describe('shareCodeFromPath', () => {
  const base = '/console/'

  it('reads the short link a share is pasted as', () => {
    expect(shareCodeFromPath('/s/k7mqx3rt9p', base)).toBe('k7mqx3rt9p')
    expect(shareCodeFromPath('/s/k7mqx3rt9p/', base)).toBe('k7mqx3rt9p')
    expect(shareCodeFromPath('/s/K7MQX3RT9P', base)).toBe('k7mqx3rt9p')
  })

  // The form the existing /console/* fallback already serves, which is what makes the whole
  // flow testable before the routing rule ships.
  it('reads the same code under the app’s own base path', () => {
    expect(shareCodeFromPath('/console/s/k7mqx3rt9p', base)).toBe('k7mqx3rt9p')
  })

  it('reads nothing out of a path that isn’t a share', () => {
    for (const path of [
      '/console/',
      '/console/play/tuesday-game',
      '/s/',
      '/s/../../etc/passwd',
      '/s/not a code',
      '/spells/fireball',
      '/',
    ]) {
      expect(shareCodeFromPath(path, base), path).toBeNull()
    }
  })
})
