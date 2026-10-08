// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { useReducer } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SaveResolver } from '../../../src/components/resolve/SaveResolver.tsx'
import { emptyEncounter, encounterReducer } from '../../../src/state/encounter.ts'
import { monster } from '../../fixtures.ts'

vi.mock('../../../src/dice/roll.ts', async (original) => {
  const actual = await original<typeof import('../../../src/dice/roll.ts')>()
  return {
    ...actual,
    roll: (formula: string, ctx: import('../../../src/dice/roll.ts').RollContext = {}) =>
      actual.roll(formula, { ...ctx, rand: () => 0 }),
  }
})
afterEach(cleanup)

it.each([false, true])(
  'does not report an abandoned resolution after saves rolled=%s',
  (rolled) => {
    const completed = vi.fn()
    const view = render(
      <SaveResolver
        action={{
          id: 'fire',
          name: 'Fire',
          kind: 'save',
          toHit: null,
          text: '',
          save: { ability: 'dex', dc: 14, onSave: 'half' },
          damage: [{ formula: '8d6', type: 'fire' }],
        }}
        combatants={[monster()]}
        dispatch={vi.fn()}
        onRoll={vi.fn()}
        onClose={vi.fn()}
        onSaveCompleted={completed}
      />,
    )
    if (rolled) {
      fireEvent.click(screen.getByRole('button', { name: 'Goblin (A)' }))
      fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
    }
    view.unmount()
    expect(completed).not.toHaveBeenCalled()
  },
)

it('reports applied damage exactly once only after the last normal concentration check settles', () => {
  const completed = vi.fn()
  /** Exercise the real damage transitions while observing the public completion boundary. */
  function Fight() {
    const [encounter, dispatch] = useReducer(encounterReducer, {
      ...emptyEncounter(),
      combatants: [
        monster({
          combatantId: 'first',
          label: 'First',
          hp: { current: 100, max: 100, temp: 0 },
          concentration: { spell: 'Bless', saveDc: 14, round: 1 },
        }),
        monster({
          combatantId: 'last',
          label: 'Last',
          hp: { current: 100, max: 100, temp: 0 },
          concentration: { spell: 'Bless', saveDc: 14, round: 1 },
        }),
      ],
    })
    return (
      <>
        <output aria-label="Working hit points">
          {encounter.combatants.map((c) => c.hp.current).join(',')}
        </output>
        <SaveResolver
          action={{
            id: 'fire',
            name: 'Fire',
            kind: 'save',
            toHit: null,
            text: '',
            save: { ability: 'dex', dc: 14, onSave: 'half' },
            damage: [{ formula: '8d6', type: 'fire' }],
          }}
          combatants={encounter.combatants}
          dispatch={dispatch}
          onRoll={vi.fn()}
          onClose={vi.fn()}
          onSaveCompleted={completed}
          tutorialSaveTargetIds={['first', 'last']}
        />
      </>
    )
  }
  render(<Fight />)
  for (const name of ['First', 'Last']) fireEvent.click(screen.getByRole('button', { name }))
  fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
  expect(completed).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Apply damage' }))
  expect(screen.getByLabelText('Working hit points')).toHaveTextContent('92,92')
  expect(completed).not.toHaveBeenCalled()
  fireEvent.click(screen.getAllByRole('button', { name: 'Maintained' })[0])
  expect(completed).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Maintained' }))
  expect(completed).toHaveBeenCalledExactlyOnceWith({
    targets: [
      { targetId: 'first', result: 'fail', damage: 8 },
      { targetId: 'last', result: 'fail', damage: 8 },
    ],
  })
})
