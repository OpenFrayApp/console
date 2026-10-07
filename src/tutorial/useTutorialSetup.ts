// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { isStable } from '../combat/deathsaves.ts'
import { useEffect, useState } from 'react'
import type { Effect } from '../schema/effect.ts'
import type { CompletedSave, CompletedAttack } from '../components/resolve/resolverShared.ts'
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
  | 'death-save'
  | 'spell'
  | 'turn'
  | 'recap'
  | 'end-prompt'
  | 'stop'
  | 'clear'
  | 'complete'

/** Observe committed setup on the working board, retaining only the newly created roster identity. */
export function useTutorialSetup({
  active,
  encounter,
  signedIn,
  initiativeOpen,
  library,
  recapOpen = false,
  endPromptOpen = false,
}: {
  active: boolean
  encounter: Encounter
  signedIn: boolean
  initiativeOpen: boolean
  library: TutorialLibrary | null
  recapOpen?: boolean
  endPromptOpen?: boolean
}) {
  const [combatTask, setCombatTask] = useState<
    'damage' | 'attack' | 'prone' | 'spell' | 'turn' | 'death-save' | 'ready'
  >('damage')
  const [turnBaseline, setTurnBaseline] = useState<{ round: number; id?: string } | null>(null)
  const [deathSaveBaseline, setDeathSaveBaseline] = useState<string | null>(null)
  const [spellResult, setSpellResult] = useState<CompletedSave | null>(null)
  const mageId = encounter.combatants.find(
    (c) => !c.isPC && c.creatureId === `${library}:mage`,
  )?.combatantId
  const quickId = encounter.combatants.find(
    (c) => c.isPC && c.kind === 'quick' && c.side === 'friend',
  )?.combatantId
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
      setSpellResult(null)
      setTurnBaseline(null)
      setDeathSaveBaseline(null)
      setCreatedPcId(null)
      setRosterCreating(false)
    }
  }, [active, encounter.round])
  const quick = encounter.combatants.find((c) => c.combatantId === quickId)
  const player = encounter.combatants.find((c) => c.combatantId === pcId)
  const dyingAlly =
    quick?.isPC &&
    quick.status === 'unconscious' &&
    !isStable(quick) &&
    player?.isPC &&
    (player.status === 'dead' || isStable(player))
  const deathSaveTally = quick?.isPC
    ? `${quick.deathSaves?.successes ?? 0}:${quick.deathSaves?.failures ?? 0}`
    : null
  useEffect(() => {
    if (!active || combatTask !== 'death-save') return
    if (!dyingAlly || encounter.round === 0) setCombatTask('ready')
    else if (deathSaveTally !== deathSaveBaseline) {
      setTurnBaseline({
        round: encounter.round,
        id: encounter.combatants[encounter.activeIndex]?.combatantId,
      })
      setCombatTask('turn')
    }
  }, [active, combatTask, dyingAlly, encounter, deathSaveTally, deathSaveBaseline])
  useEffect(() => {
    if (!active || combatTask !== 'turn' || !turnBaseline) return
    if (
      encounter.round === 0 ||
      encounter.round !== turnBaseline.round ||
      encounter.combatants[encounter.activeIndex]?.combatantId !== turnBaseline.id
    ) {
      setDeathSaveBaseline(deathSaveTally)
      setCombatTask(dyingAlly && encounter.round > 0 ? 'death-save' : 'ready')
    }
  }, [active, combatTask, turnBaseline, encounter, dyingAlly, deathSaveTally])
  const task: SetupTask =
    encounter.round > 0 || combatStarted
      ? recapOpen
        ? 'recap'
        : endPromptOpen
          ? 'end-prompt'
          : combatTask === 'death-save' &&
              encounter.combatants[encounter.activeIndex]?.combatantId !== quickId
            ? 'turn'
            : combatTask === 'ready'
              ? encounter.round > 0
                ? 'stop'
                : encounter.combatants.length === 0 && encounter.log.length === 0
                  ? 'complete'
                  : 'clear'
              : combatTask
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
    combatTask,
    library,
    signedIn,
    createdPcId,
    ogreId,
    pcId,
    mageId,
    quickId,
    spellResult,
    fightEnded: combatStarted && encounter.round === 0,
    attackResult,
    pcDefeated: encounter.combatants.find((c) => c.combatantId === pcId)?.status !== 'active',
    /** Accept the prescribed damage committed against the Ogre. */
    recordDamage: (id: string, damage: number) => {
      if (active && combatTask === 'damage' && id === ogreId && damage === 3)
        setCombatTask('attack')
    },
    /** Accept a settled Ogre Javelin outcome against the practice character. */
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
    /** Accept Prone committed to the Ogre after its attack. */
    recordEffects: (id: string, effects: Effect[]) => {
      if (
        active &&
        combatTask === 'prone' &&
        id === ogreId &&
        effects.some((e) => e.icon === 'condition' && e.name === 'Prone')
      )
        setCombatTask('spell')
    },
    /** Accept a settled Mage Fireball against exactly the practice ally and Ogre. */
    recordSpell: (sourceId: string, spellId: string, result: CompletedSave) => {
      if (
        !active ||
        combatTask !== 'spell' ||
        sourceId !== mageId ||
        spellId !== `${library}:fireball` ||
        result.targets.length !== 2 ||
        !result.targets.some((t) => t.targetId === quickId) ||
        !result.targets.some((t) => t.targetId === ogreId)
      )
        return
      setSpellResult(result)
      setTurnBaseline({
        round: encounter.round,
        id: encounter.combatants[encounter.activeIndex]?.combatantId,
      })
      setCombatTask(encounter.round > 0 ? 'turn' : 'ready')
    },
    recordCreatedPc: setCreatedPcId,
    /** Begin the new-character roster path without selecting an existing character. */
    startRosterCreation: () => setRosterCreating(true),
  }
}

export type TutorialSetupController = ReturnType<typeof useTutorialSetup>
