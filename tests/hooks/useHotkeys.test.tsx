// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useHotkeys } from '../../src/hooks/useHotkeys.ts'
import { resolveHotkeys } from '../../src/state/hotkeys.ts'
import type { HotkeyCommandId } from '../../src/state/hotkeys.ts'

afterEach(cleanup)

/** Mounts the hook with the given keymap and spies, plus an input to type into. */
function Harness({
  overrides = {},
  handlers,
}: {
  overrides?: Partial<Record<HotkeyCommandId, string | null>>
  handlers: Partial<Record<HotkeyCommandId, () => void>>
}) {
  useHotkeys(resolveHotkeys(overrides), handlers)
  return <input aria-label="Typing surface" />
}

describe('useHotkeys', () => {
  it('fires the bound handler and claims the event', () => {
    const nextTurn = vi.fn()
    render(<Harness handlers={{ nextTurn }} />)
    fireEvent.keyDown(document.body, { key: 'n' })
    expect(nextTurn).toHaveBeenCalledOnce()
  })

  it('tells shift and ctrl chords apart', () => {
    const nextTurn = vi.fn()
    const prevTurn = vi.fn()
    const quickAdd = vi.fn()
    const addCreature = vi.fn()
    render(<Harness handlers={{ nextTurn, prevTurn, quickAdd, addCreature }} />)
    fireEvent.keyDown(document.body, { key: 'N', shiftKey: true })
    expect(prevTurn).toHaveBeenCalledOnce()
    expect(nextTurn).not.toHaveBeenCalled()
    fireEvent.keyDown(document.body, { key: 'a', ctrlKey: true })
    expect(quickAdd).toHaveBeenCalledOnce()
    expect(addCreature).not.toHaveBeenCalled()
  })

  it('stays quiet while the GM is typing', () => {
    const nextTurn = vi.fn()
    const { getByLabelText } = render(<Harness handlers={{ nextTurn }} />)
    fireEvent.keyDown(getByLabelText('Typing surface'), { key: 'n' })
    expect(nextTurn).not.toHaveBeenCalled()
  })

  it('stays quiet under Meta and Alt, and while a dialog is open', () => {
    const nextTurn = vi.fn()
    render(<Harness handlers={{ nextTurn }} />)
    fireEvent.keyDown(document.body, { key: 'n', metaKey: true })
    fireEvent.keyDown(document.body, { key: 'n', altKey: true })
    expect(nextTurn).not.toHaveBeenCalled()
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    document.body.appendChild(dialog)
    fireEvent.keyDown(document.body, { key: 'n' })
    expect(nextTurn).not.toHaveBeenCalled()
    dialog.remove()
    fireEvent.keyDown(document.body, { key: 'n' })
    expect(nextTurn).toHaveBeenCalledOnce()
  })

  it('honors a rebound key and drops the default it replaced', () => {
    const nextTurn = vi.fn()
    render(<Harness overrides={{ nextTurn: 't' }} handlers={{ nextTurn }} />)
    fireEvent.keyDown(document.body, { key: 'n' })
    expect(nextTurn).not.toHaveBeenCalled()
    fireEvent.keyDown(document.body, { key: 't' })
    expect(nextTurn).toHaveBeenCalledOnce()
  })

  it('repeats only the selection movement', () => {
    const nextTurn = vi.fn()
    const selectNext = vi.fn()
    render(<Harness handlers={{ nextTurn, selectNext }} />)
    fireEvent.keyDown(document.body, { key: 'n', repeat: true })
    expect(nextTurn).not.toHaveBeenCalled()
    fireEvent.keyDown(document.body, { key: 'j', repeat: true })
    expect(selectNext).toHaveBeenCalledOnce()
  })

  it('lets an unbound chord fall through untouched', () => {
    const nextTurn = vi.fn()
    render(<Harness handlers={{ nextTurn }} />)
    const event = fireEvent.keyDown(document.body, { key: 'z' })
    expect(event).toBe(true) // not defaultPrevented
    expect(nextTurn).not.toHaveBeenCalled()
  })
})
