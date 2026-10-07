// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useRef } from 'react'
import { TutorialSpotlight } from './TutorialSpotlight.tsx'
import { Button } from '../components/ui/primitives.tsx'
import type { TutorialEntryController } from './useTutorialEntry.ts'
import type { TutorialSetupController, SetupTask } from './useTutorialSetup.ts'

const instructions: Record<SetupTask, string> = {
  pc: 'Choose a name in Add PC. Enter 30 hit points and armor class 12, then Add.',
  'roster-create':
    'Choose Create character. Choose a name, enter 30 hit points and armor class 12, then create your character. No class or level is required. This new character stays in your roster after clearing the board; existing characters stay untouched.',
  'roster-add':
    'Choose Add to encounter for your new character. The board receives a snapshot; the character stays in your roster.',
  quick:
    'Choose Quick add. Choose a name, enter 30 hit points and armor class 12, and set Side to Friend, then Add.',
  mage: 'Choose Add creature. Search for Mage and add it from the selected Basic Rules library.',
  ogre: 'Search for Ogre in Add creature and add it from the same Basic Rules library.',
  begin: 'Choose Begin to enter initiative for all four combatants.',
  initiative:
    'Enter a whole-number initiative manually for each of the four combatants, then Start combat. Normally OpenFray rolls for creatures and quick adds while you enter player characters’ rolls.',
  damage:
    'Your fight has started. Record 3 damage against the Ogre: choose its hit points in the tracker, type -3, then press Enter. This records a player’s roll made outside the console.',
  attack:
    'Damage recorded. Choose Javelin in the Ogre’s stat block, target your player character, then Roll attack. Apply the normal damage on a hit. On a miss, Close without applying damage. Resolve any concentration check before continuing.',
  prone:
    'Choose Apply effect for the Ogre, select Prone, then Apply. Applying it after the attack leaves that attack’s roll unchanged.',
  recap:
    'The fight ended. Choose Done in the Combat recap to return to the lesson. Everyone and the log stay on the board.',
  'end-prompt':
    'Every foe is down. Choose Keep fighting to continue, or End combat and dismiss the recap. The lesson keeps all committed results.',
  spell:
    'Prone applied. Choose Fireball in the Mage’s stat block, then Cast. Target only your allied quick add and Ogre: intentional friendly fire against the Mage’s allied Ogre. Roll saves, record your quick add’s externally made Save or Fail, then Apply damage. The Ogre rolls normally; successful saves take half damage. Keep any defeat.',
  'death-save':
    'Your allied quick add is unconscious and still takes turns for death saves. Record its actual result with Save or Fail, or use Roll death save when needed. Use Next turn to continue normally. Recovery, stabilization, and death all keep their real consequences; Exit tutorial remains available.',
  turn: 'Fireball resolved and damage applied. Choose Next turn to advance the initiative marker. Dead creatures are skipped; unconscious player characters and quick adds still take turns for death saves.',
  ready:
    'Turn advanced. Guided cleanup is coming later. Exit tutorial to keep this board. The tutorial is not complete.',
}

/** Explain the current real setup task without a separate form or an acknowledgement step. */
export function TutorialSetup({
  controller,
  setup,
}: {
  controller: TutorialEntryController
  setup: TutorialSetupController
}) {
  const guideRef = useRef<HTMLElement>(null)
  return (
    <>
      <TutorialSpotlight
        onExit={controller.requestExit}
        task={setup.task}
        ogreId={setup.ogreId}
        guideRef={guideRef}
      />
      <section
        ref={guideRef}
        role="dialog"
        aria-label="Tutorial introduction"
        data-tutorial-guide
        className="fixed inset-x-2 bottom-2 z-[70] mx-auto max-h-[38dvh] max-w-xl overflow-y-auto rounded-lg border border-indigo-400 bg-white p-3 text-slate-900 shadow-xl short:flex short:max-w-none short:items-center short:gap-3 dark:bg-slate-900 dark:text-slate-100"
      >
        <p role="status" className="text-sm short:flex-1">
          {setup.task === 'prone' && setup.attackResult && (
            <>
              {setup.attackResult.outcome === 'miss'
                ? 'The attack missed. No damage was applied. '
                : `${setup.attackResult.outcome === 'crit' ? 'Critical hit' : 'Hit'}: ${setup.attackResult.damage} damage applied. ${setup.pcDefeated ? 'Your player character is down; the committed result stays on the board. ' : ''}`}
            </>
          )}
          {setup.task === 'pc' && setup.signedIn
            ? 'Choose Add PC, then Create a character to create a new roster entry. Existing characters stay untouched.'
            : setup.task === 'ready' && setup.fightEnded
              ? 'The fight already ended. Guided cleanup is coming later. Exit tutorial to keep everyone and the log. The tutorial is not complete.'
              : instructions[setup.task]}
        </p>
        <p className="mt-1 text-xs text-slate-500 short:hidden">
          Tutorial examples use{' '}
          {setup.library === 'srd-5.2' ? 'Basic Rules 2024' : 'Basic Rules 2014'}. Your library and
          campaign choices stay unchanged.
        </p>
        <Button className="mt-2 short:mt-0 short:shrink-0" onClick={controller.requestExit}>
          Exit tutorial
        </Button>
      </section>
    </>
  )
}
