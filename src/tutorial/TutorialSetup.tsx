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
  ready:
    'Your fight has started. Guided combat lessons are coming later. Exit tutorial to keep exploring with this board.',
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
      <TutorialSpotlight onExit={controller.requestExit} task={setup.task} guideRef={guideRef} />
      <section
        ref={guideRef}
        role="dialog"
        aria-label="Tutorial introduction"
        data-tutorial-guide
        className="fixed inset-x-2 bottom-2 z-[70] mx-auto max-h-[38dvh] max-w-xl overflow-y-auto rounded-lg border border-indigo-400 bg-white p-3 text-slate-900 shadow-xl dark:bg-slate-900 dark:text-slate-100"
      >
        <p role="status" className="text-sm">
          {setup.task === 'pc' && setup.signedIn
            ? 'Choose Add PC, then Create a character to create a new roster entry. Existing characters stay untouched.'
            : instructions[setup.task]}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Tutorial examples use{' '}
          {setup.library === 'srd-5.2' ? 'Basic Rules 2024' : 'Basic Rules 2014'}. Your library and
          campaign choices stay unchanged.
        </p>
        <Button className="mt-2" onClick={controller.requestExit}>
          Exit tutorial
        </Button>
      </section>
    </>
  )
}
