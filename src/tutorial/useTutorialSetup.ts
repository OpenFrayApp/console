// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useEffect, useState } from 'react'
import type { Encounter } from '../schema/encounter.ts'
import type { TutorialLibrary } from './useTutorialEntry.ts'

export type SetupTask =
  | 'pc'
  | 'roster-create'
  | 'roster-add'
  | 'quick'
  | 'mage'
  | 'ogre'
  | 'begin'
  | 'initiative'
  | 'ready'

/** Observe committed setup on the working board, retaining only the newly created roster identity. */
export function useTutorialSetup({
  active,
  encounter,
  signedIn,
  view,
  initiativeOpen,
  library,
}: {
  active: boolean
  encounter: Encounter
  signedIn: boolean
  view: string
  initiativeOpen: boolean
  library: TutorialLibrary | null
}) {
  const [createdPcId, setCreatedPcId] = useState<string | null>(null)
  useEffect(() => {
    if (!active) setCreatedPcId(null)
  }, [active])
  const task: SetupTask =
    encounter.round > 0
      ? 'ready'
      : encounter.combatants.length === 0
        ? signedIn && view === 'compendium'
          ? createdPcId
            ? 'roster-add'
            : 'roster-create'
          : 'pc'
        : encounter.combatants.length === 1
          ? 'quick'
          : encounter.combatants.length === 2
            ? 'mage'
            : encounter.combatants.length === 3
              ? 'ogre'
              : initiativeOpen
                ? 'initiative'
                : 'begin'
  return { active, task, library, signedIn, createdPcId, recordCreatedPc: setCreatedPcId }
}

export type TutorialSetupController = ReturnType<typeof useTutorialSetup>
