// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, expect, it } from 'vitest'
import { cleanup, render, renderHook, screen, within } from '@testing-library/react'
import { TutorialSetup } from '../../src/tutorial/TutorialSetup.tsx'
import { useTutorialSetup, type SetupTask } from '../../src/tutorial/useTutorialSetup.ts'
import { useTutorialEntry } from '../../src/tutorial/useTutorialEntry.ts'
import { emptyEncounter } from '../../src/state/encounter.ts'

afterEach(cleanup)

/** Render a displayed tutorial task at the component’s public presentation boundary. */
function showTask(task: Exclude<SetupTask, 'ready'>, signedIn = false) {
  const hook = renderHook(() => ({
    setup: useTutorialSetup({
      active: true,
      encounter: emptyEncounter(),
      signedIn,
      initiativeOpen: false,
      library: 'srd-5.2',
    }),
    entry: useTutorialEntry({
      ready: false,
      invitationAvailable: false,
      boardEmpty: true,
      inCombat: false,
      enabledLibraries: ['srd-5.2'],
      effectiveSuppression: null,
      onSuppress: () => {},
    }),
  }))
  const view = render(
    <TutorialSetup
      controller={hook.result.current.entry}
      setup={{ ...hook.result.current.setup, task }}
    />,
  )
  const guide = screen.getByRole('dialog', { name: 'Tutorial introduction' })
  return { view, hook, instruction: within(guide).getByRole('status') }
}

it('names both roster creation controls and the final Create PC action', () => {
  const { instruction } = showTask('roster-create', true)
  expect(instruction).toHaveTextContent('Create character')
  expect(instruction).toHaveTextContent('Max HP')
  expect(instruction).toHaveTextContent('AC')
  expect(instruction).toHaveTextContent('Create PC')
  expect(instruction).toHaveTextContent('stays in your roster after clearing')
})

it('advances from the Mage without predicting an unconscious ally or suggesting irrelevant mechanics', () => {
  const { instruction } = showTask('turn')
  expect(instruction).toHaveTextContent('Fireball')
  expect(instruction).toHaveTextContent('Next turn')
  expect(instruction).toHaveTextContent('Mage')
  expect(instruction).not.toHaveTextContent(/death save|unconscious|concentration/i)
})

it('uses the character picker’s exact label without touching existing roster characters', () => {
  const { instruction } = showTask('pc', true)
  expect(instruction).toHaveTextContent('Choose Add PC, then Create a character…')
  expect(instruction).toHaveTextContent('Existing characters stay untouched')
})

it.each<{ task: Exclude<SetupTask, 'ready'>; heading: string; controls: string[] }>([
  {
    task: 'pc',
    heading: 'Step 1. Add a player character to the board',
    controls: ['Add PC', 'Max HP', 'AC', 'then choose Add'],
  },
  {
    task: 'roster-create',
    heading: 'Step 1. Create your practice character',
    controls: ['Create character', 'Create PC'],
  },
  {
    task: 'roster-add',
    heading: 'Step 1. Put your character on the board',
    controls: ['Add to encounter', 'copy', 'roster'],
  },
  {
    task: 'quick',
    heading: 'Step 2. Add an ally',
    controls: ['Quick add', 'Max HP', 'AC', 'Side', 'Friend', 'Choose Add.'],
  },
  {
    task: 'mage',
    heading: 'Step 3. Add the Mage',
    controls: ['Add creature', 'Mage', 'Basic Rules'],
  },
  {
    task: 'ogre',
    heading: 'Step 4. Add the Ogre',
    controls: ['Add creature', 'Ogre', 'same Basic Rules'],
  },
  {
    task: 'begin',
    heading: 'Step 5. Set the turn order',
    controls: ['Begin', 'Roll initiative', 'player character', 'Ogre', 'Mage', 'ally'],
  },
  {
    task: 'initiative',
    heading: 'Step 5. Set the turn order',
    controls: [
      '20',
      'Ogre 18',
      'Mage 16',
      'ally 14',
      'practice presets',
      'Start combat',
      'Normally, OpenFray rolls for creatures and quick adds',
    ],
  },
  {
    task: 'damage',
    heading: 'Step 6. Record your player’s hit',
    controls: ['player character', 'Ogre', '3 damage', 'rolled at the table', '-3', 'Enter'],
  },
  { task: 'ogre-turn', heading: 'Step 7. Start the Ogre’s turn', controls: ['Next turn', 'Ogre'] },
  {
    task: 'attack',
    heading: 'Step 8. Resolve the Ogre’s Javelin',
    controls: ['Ogre', 'Javelin', 'Roll attack', 'Apply to', 'Close', 'no damage'],
  },
  {
    task: 'prone',
    heading: 'Step 9. Record the Ogre’s fall',
    controls: ['rubble', 'Apply effect', 'Prone', 'then choose Apply'],
  },
  {
    task: 'mage-turn',
    heading: 'Step 10. Start the Mage’s turn',
    controls: ['Prone', 'Ogre', 'Next turn', 'Mage'],
  },
  {
    task: 'spell',
    heading: 'Step 11. Cast the Mage’s Fireball',
    controls: [
      'Mage',
      'ally and its own Ogre',
      'Fireball',
      'Cast',
      'Roll saves',
      'Save or Fail',
      'Apply damage',
      'Ogre’s save',
    ],
  },
  {
    task: 'turn',
    heading: 'Step 12. Advance the fight',
    controls: ['Mage', 'Fireball', 'Next turn'],
  },
  {
    task: 'death-save',
    heading: 'Step 12. Resolve your ally’s death save',
    controls: [
      'ally is unconscious',
      'Save or Fail',
      'Roll death save',
      'Next turn',
      'Recovery, stabilization, and death',
    ],
  },
  {
    task: 'stop',
    heading: 'Step 13. End the practice fight',
    controls: ['Stop', 'Combat recap', 'Pause', 'game log'],
  },
  {
    task: 'recap',
    heading: 'Review the ended fight',
    controls: ['Done', 'Combat recap', 'tutorial', 'stay on the board'],
  },
  {
    task: 'end-prompt',
    heading: 'Choose whether to keep fighting',
    controls: ['Keep fighting', 'End combat', 'Combat recap', 'Done', 'results stay on the board'],
  },
  {
    task: 'clear',
    heading: 'Step 14. Clear the practice board',
    controls: [
      'Remove everyone and clear the log',
      'confirmation',
      'cannot be undone',
      'Cancel',
      'retry',
      'Exit tutorial',
      'Roster characters',
    ],
  },
  {
    task: 'complete',
    heading: 'Tutorial complete',
    controls: ['Everyone and the game log are cleared'],
  },
])(
  'keeps $task concise with its story heading and actual next controls',
  ({ task, heading, controls }) => {
    const { instruction } = showTask(task)
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    for (const label of controls) expect(instruction).toHaveTextContent(label)
    expect(instruction.textContent!.split(/\s+/).length).toBeLessThanOrEqual(65)
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()
  },
)

it.each([
  {
    outcome: 'miss' as const,
    damage: 0,
    defeated: false,
    expected: 'The attack missed. No damage was applied.',
  },
  { outcome: 'hit' as const, damage: 16, defeated: false, expected: 'Hit: 16 damage applied.' },
  {
    outcome: 'crit' as const,
    damage: 32,
    defeated: true,
    expected: 'Critical hit: 32 damage applied.',
  },
])(
  'retains the committed $outcome outcome before the Ogre’s fall',
  ({ outcome, damage, defeated, expected }) => {
    const { view, hook, instruction } = showTask('prone')
    view.rerender(
      <TutorialSetup
        controller={hook.result.current.entry}
        setup={{
          ...hook.result.current.setup,
          task: 'prone',
          attackResult: { targetId: 'player', outcome, damage },
          pcDefeated: defeated,
        }}
      />,
    )
    expect(instruction).toHaveTextContent(expected)
    expect(instruction).toHaveTextContent('Choose Apply effect for the Ogre')
    if (defeated) expect(instruction).toHaveTextContent('Your player character is down')
    else expect(instruction).not.toHaveTextContent('Your player character is down')
  },
)
