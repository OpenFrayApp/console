// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useLayoutEffect, type RefObject } from 'react'

const focusScopes: RefObject<HTMLElement | null>[] = []

/** Whether a control is reachable, including inside nested collapsible reference sections. */
function isVisibleControl(element: HTMLElement): boolean {
  if (element.tabIndex < 0 || element.matches(':disabled')) return false
  for (let parent: HTMLElement | null = element; parent; parent = parent.parentElement) {
    if (parent.hidden || parent.inert) return false
    const style = getComputedStyle(parent)
    if (style.display === 'none' || style.visibility === 'hidden') return false
    if (parent instanceof HTMLDetailsElement && !parent.open) {
      const summary = parent.querySelector(':scope > summary')
      if (!summary?.contains(element)) return false
    }
  }
  return true
}

/** Contain and restore keyboard focus across a dialog's reference and action surfaces. */
export function useDialogFocus(root: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const previous = document.activeElement
    focusScopes.push(root)
    /** List the dialog's currently visible native and custom keyboard stops. */
    const controls = () =>
      Array.from(
        root.current?.querySelectorAll<HTMLElement>(
          'button, input, select, textarea, a[href], summary, [tabindex]',
        ) ?? [],
      ).filter(isVisibleControl)
    /** Recover focus after an action replaces the currently focused control. */
    const retainFocus = () => {
      if (
        focusScopes.at(-1) === root &&
        root.current &&
        !root.current.contains(document.activeElement)
      )
        controls()[0]?.focus()
    }
    /** Wrap Tab at the dialog boundaries while preserving native tab order within them. */
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || focusScopes.at(-1) !== root) return
      const stops = controls()
      const first = stops[0],
        last = stops.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    const observer = new MutationObserver(retainFocus)
    if (root.current) observer.observe(root.current, { childList: true, subtree: true })
    document.addEventListener('focusin', retainFocus)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      observer.disconnect()
      document.removeEventListener('focusin', retainFocus)
      document.removeEventListener('keydown', onKeyDown)
      const topmost = focusScopes.at(-1) === root
      focusScopes.splice(focusScopes.indexOf(root), 1)
      if (topmost && previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [root])
}
