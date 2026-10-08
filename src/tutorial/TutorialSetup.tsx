// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useRef } from 'react'
import { TutorialSpotlight } from './TutorialSpotlight.tsx'
import { Button } from '../components/ui/primitives.tsx'
import type { TutorialEntryController } from './useTutorialEntry.ts'
import type { TutorialSetupController, SetupTask } from './useTutorialSetup.ts'

const titles: Record<SetupTask, string> = {
  pc: 'Step 1. Add a player character to the board',
  'roster-create': 'Step 1. Create your practice character',
  'roster-add': 'Step 1. Put your character on the board',
  quick: 'Step 2. Add an ally',
  mage: 'Step 3. Add the Mage',
  ogre: 'Step 4. Add the Ogre',
  begin: 'Step 5. Set the turn order',
  initiative: 'Step 5. Set the turn order',
  damage: 'Step 6. Record your player’s hit',
  'ogre-turn': 'Step 7. Start the Ogre’s turn',
  attack: 'Step 8. Resolve the Ogre’s Javelin',
  prone: 'Step 9. Record the Ogre’s fall',
  'mage-turn': 'Step 10. Start the Mage’s turn',
  spell: 'Step 11. Cast the Mage’s Fireball',
  turn: 'Step 12. Advance the fight',
  'death-save': 'Step 12. Resolve your ally’s death save',
  ready: 'Step 13. End the practice fight',
  stop: 'Step 13. End the practice fight',
  recap: 'Review the ended fight',
  'end-prompt': 'Choose whether to keep fighting',
  clear: 'Step 14. Clear the practice board',
  complete: 'Tutorial complete',
}

const instructions: Record<SetupTask, string> = {
  pc: 'Click Add PC to put a player character on the board. Choose a name, enter 30 hit points and armor class 12, then click Add.',
  'roster-create':
    'Choose Create character. Choose a name, enter 30 hit points and armor class 12, then create your character. This practice character stays in your roster after clearing the board.',
  'roster-add':
    'Choose Add to encounter for your new character. This puts a copy on the board; the character stays in your roster.',
  quick:
    'Your character has an ally in this fight. Click Quick add, choose a name, enter 30 hit points and armor class 12, and set Side to Friend. Click Add.',
  mage: 'The Mage and Ogre are your opponents. Click Add creature, search for Mage, and add it from the selected Basic Rules library.',
  ogre: 'Add the Mage’s companion. Search for Ogre in Add creature and add it from the same Basic Rules library.',
  begin:
    'Click Begin to set the turn order. Your player character acts first, followed by the Ogre, Mage, and your ally.',
  initiative:
    'Enter 20 for your player character, then click Start combat. Ogre 18, Mage 16, and your ally 14 are practice presets, so this story always follows the same order. Normally, OpenFray rolls for creatures and quick adds while you enter your players’ rolls.',
  damage:
    'Your player character hits the Ogre for 3 damage, rolled at the table. Record 3 damage against the Ogre: click its hit points in the tracker, type -3, then press Enter.',
  'ogre-turn':
    'Your player’s hit is recorded. Click Next turn at the top of the tracker to move the turn marker to the Ogre.',
  attack:
    'The Ogre throws a javelin at your player character. Choose Javelin in its stat block, target your player character, then Roll attack. Apply the damage on a hit. On a miss, Close without applying damage.',
  prone:
    'The Ogre trips over rubble after throwing its javelin. Choose Apply effect for the Ogre, select Prone, then Apply to record its fall.',
  'mage-turn':
    'Prone applied. The Ogre’s turn is finished. Click Next turn to move the turn marker to the Mage.',
  spell:
    'The Mage aims Fireball at your ally, catching its own Ogre in the blast. Choose Fireball in the Mage’s stat block, then Cast. Target your allied quick add and Ogre. Roll saves, record your ally’s table-side Save or Fail, then Apply damage. The Ogre rolls normally.',
  turn: 'Fireball resolved and damage applied. Choose Next turn to advance the initiative marker. Dead creatures are skipped; unconscious player characters and quick adds still take turns for death saves.',
  'death-save':
    'Your ally is unconscious and still takes turns for death saves. Record its actual result with Save or Fail, or use Roll death save. Use Next turn to continue. Recovery, stabilization, and death keep their real consequences.',
  ready: 'Turn advanced.',
  stop: 'Turn advanced. Choose Stop to end the fight and open its recap. Pause only holds the fight; everyone and the game log stay on the board.',
  recap:
    'The fight ended. Choose Done in the Combat recap to return to the lesson. Everyone and the log stay on the board.',
  'end-prompt':
    'Every foe is down. Choose Keep fighting to continue, or End combat and dismiss the recap. The lesson keeps all committed results.',
  clear:
    'The fight ended. Choose the trash control, Remove everyone and clear the log. Your browser opens a confirmation: confirm to remove everyone and the game log. Cancel leaves cleanup pending; you can retry or Exit tutorial. Roster characters and other saved references stay untouched.',
  complete: 'Everyone and the game log are cleared.',
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
        className="fixed bottom-2 left-2 z-[70] flex max-h-[38dvh] w-[calc(100%-1rem)] max-w-sm flex-col rounded-lg border border-indigo-400 bg-white p-3 text-slate-900 shadow-xl [--hint-safe-bottom:env(safe-area-inset-bottom,0px)] [--hint-safe-left:env(safe-area-inset-left,0px)] [--hint-safe-right:env(safe-area-inset-right,0px)] [--hint-safe-top:env(safe-area-inset-top,0px)] short:max-w-none short:flex-row short:items-center short:gap-3 dark:bg-slate-900 dark:text-slate-100"
      >
        <div
          role="region"
          aria-label="Tutorial instructions"
          tabIndex={0}
          className="min-h-0 overflow-y-auto short:flex-1"
        >
          <h2 className="mb-1 text-sm font-semibold">{titles[setup.task]}</h2>
          <p role="status" className="text-sm">
            {setup.task === 'prone' && setup.attackResult && (
              <>
                {setup.attackResult.outcome === 'miss'
                  ? 'The attack missed. No damage was applied. '
                  : `${setup.attackResult.outcome === 'crit' ? 'Critical hit' : 'Hit'}: ${setup.attackResult.damage} damage applied. ${setup.pcDefeated ? 'Your player character is down; the committed result stays on the board. ' : ''}`}
              </>
            )}
            {setup.task === 'pc' && setup.signedIn
              ? 'Click Add PC, then Create a character to make your practice player character. Existing characters stay untouched.'
              : instructions[setup.task]}
          </p>
          <p className="mt-1 text-xs text-slate-500 short:hidden">
            Tutorial examples use{' '}
            {setup.library === 'srd-5.2' ? 'Basic Rules 2024' : 'Basic Rules 2014'}. Your library
            and campaign choices stay unchanged.
          </p>
        </div>
        <Button className="mt-2 shrink-0 self-start short:mt-0" onClick={controller.requestExit}>
          Exit tutorial
        </Button>
      </section>
    </>
  )
}
