// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useEffect, useState } from 'react'
import type { TutorialSuppression } from '../state/settings.ts'

type TutorialSurface = 'welcome' | 'introduction' | 'exit' | 'prerequisite' | null
export type TutorialLibrary = 'srd-5.2' | 'srd-5.1'

const INVITED_KEY = 'openfray:tutorial-invited'

/** Read only the invitation latch, never encounter recovery or guide progress. */
function wasInvited(): boolean {
  try {
    return sessionStorage.getItem(INVITED_KEY) === 'true'
  } catch {
    return false
  }
}

/** Remember an invitation for this tab's session without requiring browser storage. */
function rememberInvitation(): void {
  try {
    sessionStorage.setItem(INVITED_KEY, 'true')
  } catch {
    // The in-memory latch still prevents repeated invitations while the console is open.
  }
}

/** Coordinate optional entry and exit without owning or mutating working-board state. */
export function useTutorialEntry({
  ready,
  invitationAvailable,
  boardEmpty,
  inCombat,
  enabledLibraries,
  effectiveSuppression,
  onSuppress,
}: {
  ready: boolean
  invitationAvailable: boolean
  boardEmpty: boolean
  inCombat: boolean
  enabledLibraries: string[]
  /** The device/account union; account synchronization is supplied at composition. */
  effectiveSuppression: TutorialSuppression | null
  /** Apply locally first; account persistence may follow in the background. */
  onSuppress: (reason: TutorialSuppression) => void
}) {
  const [invited, setInvited] = useState(wasInvited)
  const [surface, setSurface] = useState<TutorialSurface>(null)
  const [library, setLibrary] = useState<TutorialLibrary | null>(null)
  const [prerequisiteMessage, setPrerequisiteMessage] = useState<string | null>(null)
  const availableLibrary = enabledLibraries.includes('srd-5.2')
    ? 'srd-5.2'
    : enabledLibraries.includes('srd-5.1')
      ? 'srd-5.1'
      : null
  const prerequisite = !ready
    ? 'Wait for identity and working-board recovery to finish, then start the tutorial again.'
    : !boardEmpty || inCombat
      ? 'Stop the fight and clear the board through the normal controls before starting the tutorial. Your board stays unchanged.'
      : !availableLibrary
        ? 'Enable Basic Rules 2024 or Basic Rules 2014 in Settings → Libraries, then start the tutorial again.'
        : null

  /** Latch all entry attempts so ordinary board clearing cannot reopen the welcome. */
  const latchInvitation = () => {
    setInvited(true)
    rememberInvitation()
  }

  useEffect(() => {
    if (!ready && surface !== 'prerequisite') {
      setSurface(null)
      setLibrary(null)
      return
    }
    if (
      !ready ||
      !invitationAvailable ||
      !boardEmpty ||
      inCombat ||
      effectiveSuppression ||
      invited ||
      surface
    )
      return
    // Add popovers own their focused fields outside App's dialog state.
    if (
      document.querySelector('[role="dialog"], [role="menu"]') ||
      document.activeElement?.matches('input, textarea, select, [contenteditable="true"]')
    )
      return
    setInvited(true)
    rememberInvitation()
    setSurface('welcome')
  }, [ready, invitationAvailable, boardEmpty, inCombat, effectiveSuppression, invited, surface])

  /** Start at the introduction only after checking the current board and libraries. */
  const launch = () => {
    latchInvitation()
    if (prerequisite) {
      setPrerequisiteMessage(prerequisite)
      setSurface('prerequisite')
    } else {
      setLibrary(availableLibrary)
      setSurface('introduction')
    }
  }

  /** Leave the guide without completing it or changing the encounter. */
  const dismiss = (permanent = false) => {
    latchInvitation()
    if (permanent) onSuppress('dismissed')
    setSurface(null)
    setLibrary(null)
  }

  return {
    surface,
    library,
    prerequisite: prerequisiteMessage,
    launch,
    dismiss,
    onSuppress,
    requestExit: () => setSurface('exit'),
    cancelExit: () => setSurface('introduction'),
  }
}

export type TutorialEntryController = ReturnType<typeof useTutorialEntry>
