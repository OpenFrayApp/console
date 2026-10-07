// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useEffect, useState } from 'react'
import type { Effect } from '../schema/effect.ts'
import type { CompletedAttack } from '../components/resolve/resolverShared.ts'
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
  | 'damage'
  | 'attack'
  | 'prone'

/** Observe committed setup on the working board, retaining only the newly created roster identity. */
export function useTutorialSetup({
  active,
  encounter,
  signedIn,
  initiativeOpen,
  library,
}: {
  active: boolean
  encounter: Encounter
  signedIn: boolean
  initiativeOpen: boolean
  library: TutorialLibrary | null
}) {
  const [combatTask, setCombatTask] = useState<'damage' | 'attack' | 'prone' | 'ready'>('damage')
  const [attackResult, setAttackResult] = useState<CompletedAttack | null>(null)
  const [combatStarted, setCombatStarted] = useState(false)
  const ogreId = encounter.combatants.find(
    (c) => !c.isPC && c.creatureId === `${library}:ogre`,
  )?.combatantId
  const [rosterCreating, setRosterCreating] = useState(false)
  const [createdPcId, setCreatedPcId] = useState<string | null>(null)
  const pcId = encounter.combatants.find(
    (c) => c.isPC && c.kind === 'pc' && (!signedIn || c.rosterId === createdPcId),
  )?.combatantId
  useEffect(() => {
    if (active && encounter.round > 0) setCombatStarted(true)
    if (!active) {
      setCombatStarted(false)
      setCombatTask('damage')
      setAttackResult(null)
      setCreatedPcId(null)
      setRosterCreating(false)
    }
  }, [active, encounter.round])
  const task: SetupTask =
    encounter.round > 0 || combatStarted
      ? combatTask
      : encounter.combatants.length === 0
        ? signedIn && rosterCreating
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
  return {
    active,
    task,
    library,
    signedIn,
    createdPcId,
    ogreId,
    pcId,
    attackResult,
    pcDefeated: encounter.combatants.find((c) => c.combatantId === pcId)?.status !== 'active',
    recordDamage: (id: string, damage: number) => {
      if (active && combatTask === 'damage' && id === ogreId && damage === 3)
        setCombatTask('attack')
    },
    recordAttack: (sourceId: string, actionId: string, result: CompletedAttack) => {
      const ogre = encounter.combatants.find((c) => c.combatantId === ogreId)
      const javelin = ogre && !ogre.isPC && ogre.creature.actions?.find((a) => a.name === 'Javelin')
      if (
        active &&
        combatTask === 'attack' &&
        sourceId === ogreId &&
        javelin &&
        actionId === javelin.id &&
        result.targetId === pcId
      ) {
        setAttackResult(result)
        setCombatTask('prone')
      }
    },
    recordEffects: (id: string, effects: Effect[]) => {
      if (
        active &&
        combatTask === 'prone' &&
        id === ogreId &&
        effects.some((e) => e.icon === 'condition' && e.name === 'Prone')
      )
        setCombatTask('ready')
    },
    recordCreatedPc: setCreatedPcId,
    startRosterCreation: () => setRosterCreating(true),
  }
}

export type TutorialSetupController = ReturnType<typeof useTutorialSetup>
