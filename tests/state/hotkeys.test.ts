// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { describe, expect, it } from 'vitest'
import {
  COMMANDS,
  DEFAULT_HOTKEYS,
  chordOf,
  commandForChord,
  formatChord,
  isReservedChord,
  isValidChord,
  resolveHotkeys,
  sanitizeHotkeys,
} from '../../src/state/hotkeys.ts'

/** A keydown stand-in: chordOf only reads key and the modifier flags. */
function key(
  k: string,
  mods: Partial<{ shift: boolean; ctrl: boolean; meta: boolean; alt: boolean }> = {},
): KeyboardEvent {
  return {
    key: k,
    shiftKey: mods.shift ?? false,
    ctrlKey: mods.ctrl ?? false,
    metaKey: mods.meta ?? false,
    altKey: mods.alt ?? false,
  } as KeyboardEvent
}

describe('the default keymap', () => {
  it('covers every command exactly once', () => {
    expect(Object.keys(DEFAULT_HOTKEYS).sort()).toEqual(COMMANDS.map((c) => c.id).sort())
  })

  it('is collision-free, valid, and unreserved', () => {
    const chords = Object.values(DEFAULT_HOTKEYS).filter((c): c is string => c !== null)
    expect(new Set(chords).size).toBe(chords.length)
    for (const chord of chords) {
      expect(isValidChord(chord), chord).toBe(true)
      expect(isReservedChord(chord), chord).toBe(false)
    }
  })
})

describe('chordOf', () => {
  it('normalizes letters with their modifiers', () => {
    expect(chordOf(key('n'))).toBe('n')
    expect(chordOf(key('N', { shift: true }))).toBe('shift+n')
    expect(chordOf(key('a', { ctrl: true }))).toBe('ctrl+a')
    expect(chordOf(key('X', { ctrl: true, shift: true }))).toBe('ctrl+shift+x')
  })

  it('keeps a shifted character as itself and prefixes named keys', () => {
    expect(chordOf(key('?', { shift: true }))).toBe('?')
    expect(chordOf(key('/'))).toBe('/')
    expect(chordOf(key('Delete'))).toBe('Delete')
    expect(chordOf(key('Delete', { shift: true }))).toBe('shift+Delete')
  })

  it('refuses Meta and Alt, bare modifiers, and the unbindable keys', () => {
    expect(chordOf(key('n', { meta: true }))).toBeNull()
    expect(chordOf(key('n', { alt: true }))).toBeNull()
    expect(chordOf(key('Shift', { shift: true }))).toBeNull()
    expect(chordOf(key('Control', { ctrl: true }))).toBeNull()
    expect(chordOf(key('Enter'))).toBeNull()
    expect(chordOf(key(' '))).toBeNull()
    expect(chordOf(key('Tab'))).toBeNull()
    expect(chordOf(key('Escape'))).toBeNull()
  })
})

describe('formatChord', () => {
  it('names the keys pressed', () => {
    expect(formatChord('n')).toBe('N')
    expect(formatChord('shift+n')).toBe('Shift+N')
    expect(formatChord('ctrl+a')).toBe('Ctrl+A')
    expect(formatChord('ctrl+shift+x')).toBe('Ctrl+Shift+X')
    expect(formatChord('?')).toBe('Shift+/')
    expect(formatChord(',')).toBe(',')
    expect(formatChord('Delete')).toBe('Del')
    expect(formatChord('shift+Delete')).toBe('Shift+Del')
  })
})

describe('sanitizeHotkeys', () => {
  it('keeps valid overrides and explicit unbinds', () => {
    expect(sanitizeHotkeys({ nextTurn: 't', prevTurn: null })).toEqual({
      nextTurn: 't',
      prevTurn: null,
    })
  })

  it('drops unknown commands, malformed chords, and reserved chords', () => {
    expect(
      sanitizeHotkeys({
        notACommand: 'x',
        nextTurn: 'ctrl+w',
        prevTurn: 'Shift+N',
        endFight: 42,
        pauseResume: 'shift+',
        startCombat: 'F5',
      }),
    ).toEqual({})
  })

  it('yields nothing for a missing or malformed blob', () => {
    expect(sanitizeHotkeys(undefined)).toEqual({})
    expect(sanitizeHotkeys('nonsense')).toEqual({})
  })
})

describe('resolveHotkeys and commandForChord', () => {
  it('lays overrides over the defaults', () => {
    const resolved = resolveHotkeys({ nextTurn: 't', openLog: null })
    expect(resolved.nextTurn).toBe('t')
    expect(resolved.openLog).toBeNull()
    expect(resolved.prevTurn).toBe('shift+n')
    expect(commandForChord(resolved, 't')).toBe('nextTurn')
    expect(commandForChord(resolved, 'n')).toBeNull()
    expect(commandForChord(resolved, 'l')).toBeNull()
  })

  it('keeps a doubled chord only on the first command in display order', () => {
    // Rebinding damageSelected onto the nextTurn default: nextTurn comes first.
    const resolved = resolveHotkeys({ damageSelected: 'n' })
    expect(resolved.nextTurn).toBe('n')
    expect(resolved.damageSelected).toBeNull()
  })
})
