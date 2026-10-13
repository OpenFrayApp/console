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

it.each<{ task: Exclude<SetupTask, 'ready'>; controls: string[] }>([
  {
    task: 'pc',
    controls: ['Add PC', 'Max HP', 'AC', 'then choose Add'],
  },
  {
    task: 'roster-create',
    controls: ['Create character', 'Create PC'],
  },
  {
    task: 'roster-add',
    controls: ['Add to encounter', 'copy', 'roster'],
  },
  {
    task: 'quick',
    controls: ['Quick add', 'Max HP', 'AC', 'Side', 'Friend', 'Choose Add.'],
  },
  {
    task: 'mage',
    controls: ['Add creature', 'Mage', 'Basic Rules'],
  },
  {
    task: 'ogre',
    controls: ['Add creature', 'Ogre', 'same Basic Rules'],
  },
  {
    task: 'begin',
    controls: ['Begin', 'Roll initiative', 'player character', 'Ogre', 'Mage', 'ally'],
  },
  {
    task: 'initiative',
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
    controls: ['player character', 'Ogre', '3 damage', 'rolled at the table', '-3', 'Enter'],
  },
  { task: 'ogre-turn', controls: ['Next turn', 'Ogre'] },
  {
    task: 'attack',
    controls: ['Ogre', 'Javelin', 'Roll attack', 'Apply to', 'Close', 'no damage'],
  },
  {
    task: 'prone',
    controls: ['rubble', 'Apply effect', 'Prone', 'then choose Apply'],
  },
  {
    task: 'mage-turn',
    controls: ['Prone', 'Ogre', 'Next turn', 'Mage'],
  },
  {
    task: 'spell',
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
    controls: ['Mage', 'Fireball', 'Next turn'],
  },
  {
    task: 'death-save',
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
    controls: ['Stop', 'Combat recap', 'Pause', 'game log'],
  },
  {
    task: 'recap',
    controls: ['Done', 'Combat recap', 'tutorial', 'stay on the board'],
  },
  {
    task: 'end-prompt',
    controls: ['Keep fighting', 'End combat', 'Combat recap', 'Done', 'results stay on the board'],
  },
  {
    task: 'clear',
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
    controls: ['Everyone and the game log are cleared'],
  },
])('guides $task using its actual next controls', ({ task, controls }) => {
  const { instruction } = showTask(task)
  for (const label of controls) expect(instruction).toHaveTextContent(label)
  expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()
})

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
