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
  pc: 'Choose Add PC to put a player character on the board. Choose a name, set Max HP to 30 and AC to 12, then choose Add.',
  'roster-create':
    'Choose Create character. Choose a name, enter 30 in Max HP and 12 in AC, then choose Create PC. Your practice character stays in your roster after clearing the board.',
  'roster-add':
    'Choose Add to encounter for your practice character. A copy joins the board; the character stays in your roster.',
  quick:
    'Add an ally for your player character. Choose Quick add, choose a name, set Max HP to 30 and AC to 12, and set Side to Friend. Choose Add.',
  mage: 'The Mage and Ogre are your opponents. Choose Add creature, search for Mage, and add it from the selected Basic Rules library.',
  ogre: 'Add the Mage’s Ogre companion. Choose Add creature, search for Ogre, and add it from the same Basic Rules library.',
  begin:
    'Choose Begin to open Roll initiative. Set up this order: your player character, the Ogre, the Mage, then your ally.',
  initiative:
    'Enter 20 for your player character, then choose Start combat. Ogre 18, Mage 16, and ally 14 are practice presets for this turn order. Normally, OpenFray rolls for creatures and quick adds while you enter your players’ rolls.',
  damage:
    'Your player character hits the Ogre for 3 damage, rolled at the table. Choose the Ogre’s hit points in the tracker, type -3, then press Enter to record the damage.',
  'ogre-turn':
    'Your player character’s hit is recorded. Choose Next turn at the top of the tracker to start the Ogre’s turn.',
  attack:
    'The Ogre throws a javelin at your player character. Choose Javelin in its stat block, target your character, then Roll attack. On a hit, choose Apply to followed by your character’s name. On a miss, choose Close; no damage is applied.',
  prone:
    'The Ogre trips over rubble after throwing its javelin. Choose Apply effect for the Ogre, select Prone, then choose Apply to record its fall.',
  'mage-turn':
    'Prone applied to the Ogre. Choose Next turn to finish its turn and start the Mage’s turn.',
  spell:
    'The Mage’s Fireball catches your ally and its own Ogre. Choose Fireball in the Mage’s stat block, then Cast. Target your ally and Ogre. Choose Roll saves, record your ally’s table result with Save or Fail, then Apply damage. The console rolls the Ogre’s save.',
  turn: 'The Mage’s Fireball is resolved and damage is recorded. Choose Next turn to advance the turn marker.',
  'death-save':
    'Your ally is unconscious and still takes turns for death saves. Record its table result with Save or Fail, or choose Roll death save. Choose Next turn to continue. Recovery, stabilization, and death apply normally.',
  ready: 'Turn advanced.',
  stop: 'Turn advanced. Choose Stop to end the practice fight and open Combat recap. Pause keeps the fight open. Everyone and the game log stay on the board until you clear them.',
  recap:
    'The fight ended. Choose Done in the Combat recap to return to the tutorial. Everyone and the game log stay on the board.',
  'end-prompt':
    'Every foe is down. Choose Keep fighting to continue, or End combat to open Combat recap, then Done. Your recorded results stay on the board.',
  clear:
    'Choose Remove everyone and clear the log (the trash control). Your browser opens a confirmation: confirm to clear the board and game log. This cannot be undone. Cancel keeps both; retry or choose Exit tutorial. Roster characters and saved references stay untouched.',
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
              ? 'Choose Add PC, then Create a character… to make your practice player character. Existing characters stay untouched.'
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
