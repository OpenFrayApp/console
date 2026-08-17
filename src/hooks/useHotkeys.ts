// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useEffect, useRef } from 'react'
import { chordOf, commandForChord, COMMANDS } from '../state/hotkeys.ts'
import type { HotkeyCommandId } from '../state/hotkeys.ts'
import { track, EVENTS } from '../lib/analytics.ts'

const REPEATING = new Set(COMMANDS.filter((c) => c.repeats).map((c) => c.id))

/** Whether the target is somewhere the GM is typing, where every key is theirs. */
function isTypingSurface(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

/**
 * The console's keyboard commands: one document-level keydown that maps chords to
 * the App's own handlers. It stands down while the GM is typing, while any dialog
 * or menu is open, and for every Meta/Alt combination; an unbound Ctrl chord falls
 * through to the browser untouched.
 */
export function useHotkeys(
  bindings: Record<HotkeyCommandId, string | null>,
  handlers: Partial<Record<HotkeyCommandId, () => void>>,
): void {
  // Handlers close over fresh state each render; the listener reads the latest
  // through refs so it can stay bound once per keymap.
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers
  const bindingsRef = useRef(bindings)
  bindingsRef.current = bindings

  useEffect(() => {
    /** Route one keydown to its command, if the board should hear it. */
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      const chord = chordOf(e)
      if (chord === null) return
      if (isTypingSurface(e.target)) return
      // A dialog or menu owns the keyboard while it's up. Popovers autofocus an
      // input, so the typing guard covers them.
      if (document.querySelector('[role="dialog"], [role="menu"]')) return
      const command = commandForChord(bindingsRef.current, chord)
      if (command === null) return
      if (e.repeat && !REPEATING.has(command)) return
      const handler = handlersRef.current[command]
      if (!handler) return
      e.preventDefault()
      handler()
      track(EVENTS.keyboardShortcutUsed)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])
}
