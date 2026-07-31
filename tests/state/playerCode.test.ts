// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import {
  normalizePlayerCode,
  playerCodeError,
  playerCodeFromPath,
  randomPlayerCode,
} from '../../src/state/playerCode.ts'

describe('randomPlayerCode', () => {
  it('is long enough not to be guessed, and free of lookalike characters', () => {
    for (let i = 0; i < 200; i++) {
      const code = randomPlayerCode()
      expect(code).toHaveLength(10)
      expect(code).toMatch(/^[a-z0-9]+$/)
      expect(code).not.toMatch(/[01lio]/)
    }
  })

  it('does not repeat itself', () => {
    const codes = new Set(Array.from({ length: 200 }, randomPlayerCode))
    expect(codes.size).toBe(200)
  })
})

describe('normalizePlayerCode', () => {
  it('treats a name the GM typed and its tidy form as the same claim', () => {
    expect(normalizePlayerCode('  Tuesday Game ')).toBe('tuesday-game')
    expect(normalizePlayerCode('tuesday_game')).toBe('tuesday-game')
    expect(normalizePlayerCode('Tuesday   Game')).toBe('tuesday-game')
  })

  it('drops characters a link cannot carry', () => {
    expect(normalizePlayerCode("Rhys' Table!")).toBe('rhys-table')
    expect(normalizePlayerCode('a/b?c=d')).toBe('abcd')
  })

  it('never leaves a leading or trailing hyphen', () => {
    expect(normalizePlayerCode('--dragons--')).toBe('dragons')
    expect(normalizePlayerCode('!!!')).toBe('')
  })
})

describe('playerCodeError', () => {
  it('accepts an ordinary table name', () => {
    expect(playerCodeError('Tuesday Game')).toBeNull()
    expect(playerCodeError('dragons2')).toBeNull()
  })

  it('asks for something when nothing usable was typed', () => {
    expect(playerCodeError('   ')).toMatch(/letters, numbers and hyphens/)
    expect(playerCodeError('!!!')).toMatch(/letters, numbers and hyphens/)
  })

  it('holds the length between the two bounds', () => {
    expect(playerCodeError('ab')).toMatch(/at least 3/)
    expect(playerCodeError('a'.repeat(33))).toMatch(/under 32/)
    expect(playerCodeError('abc')).toBeNull()
    expect(playerCodeError('a'.repeat(32))).toBeNull()
  })

  it('keeps the names that would make a confusing link', () => {
    expect(playerCodeError('play')).toMatch(/reserved/)
    expect(playerCodeError('Console')).toMatch(/reserved/)
  })
})

describe('playerCodeFromPath', () => {
  it('reads the code out of a player link', () => {
    expect(playerCodeFromPath('/console/play/tuesday-game', '/console/')).toBe('tuesday-game')
    expect(playerCodeFromPath('/console/play/tuesday-game/', '/console/')).toBe('tuesday-game')
  })

  it('normalizes what it finds, so a shared link survives being retyped', () => {
    expect(playerCodeFromPath('/console/play/Tuesday%20Game', '/console/')).toBe('tuesday20game')
    expect(playerCodeFromPath('/console/play/DRAGONS', '/console/')).toBe('dragons')
  })

  it('is null for the console itself and for anything else', () => {
    expect(playerCodeFromPath('/console/', '/console/')).toBeNull()
    expect(playerCodeFromPath('/console/play/', '/console/')).toBeNull()
    expect(playerCodeFromPath('/', '/console/')).toBeNull()
    expect(playerCodeFromPath('/play/x', '/console/')).toBeNull()
  })
})
