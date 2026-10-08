// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, expect, it } from 'vitest'
import { act, cleanup, render, renderHook, screen, within } from '@testing-library/react'
import { useTutorialSetup } from '../../src/tutorial/useTutorialSetup.ts'
import { useTutorialEntry } from '../../src/tutorial/useTutorialEntry.ts'
import { TutorialSetup } from '../../src/tutorial/TutorialSetup.tsx'
import { instantiate } from '../../src/combat/combatant.ts'
import { applyDamage } from '../../src/combat/resources.ts'
import { condition } from '../../src/combat/effects.ts'
import { emptyEncounter } from '../../src/state/encounter.ts'
import type { Creature } from '../../src/schema/creature.ts'
import creatures from '../../public/compendium/srd-creatures.json'
import { pc } from '../fixtures.ts'

afterEach(cleanup)

it.each(['attack pending', 'damage applied', 'Prone applied'])(
  'returns to the same actionable guidance after exceptional real-dialog inputs with %s',
  (operation) => {
    const ogre = instantiate(creatures.find((c) => c.id === 'srd-5.2:ogre') as Creature, {
      combatantId: 'ogre',
      label: 'Ogre',
      initiative: 17,
    })
    const mage = instantiate(creatures.find((c) => c.id === 'srd-5.2:mage') as Creature, {
      combatantId: 'mage',
      label: 'Mage',
      initiative: 18,
    })
    const encounter = {
      ...emptyEncounter(),
      round: 1,
      combatants: [
        pc(),
        pc({ combatantId: 'ally', kind: 'quick', name: 'Robin', side: 'friend' }),
        mage,
        ogre,
      ],
    }
    const initial = {
      active: true,
      encounter,
      signedIn: false,
      initiativeOpen: false,
      library: 'srd-5.2' as const,
      recapOpen: false,
      endPromptOpen: false,
    }
    const hook = renderHook(
      (inputs) => ({
        setup: useTutorialSetup(inputs),
        entry: useTutorialEntry({
          ready: false,
          invitationAvailable: false,
          boardEmpty: false,
          inCombat: true,
          enabledLibraries: ['srd-5.2'],
          effectiveSuppression: null,
          onSuppress: () => {},
        }),
      }),
      { initialProps: initial },
    )
    act(() => hook.result.current.setup.recordDamage('ogre', 3))
    hook.rerender({ ...initial, encounter: { ...encounter, activeIndex: 3 } })
    if (operation !== 'attack pending') {
      act(() =>
        hook.result.current.setup.recordAttack(
          'ogre',
          ogre.creature.actions!.find((a) => a.name === 'Javelin')!.id,
          { targetId: 'p1', outcome: 'hit', damage: 16 },
        ),
      )
      if (operation === 'Prone applied')
        act(() => hook.result.current.setup.recordEffects('ogre', [condition('Prone')]))
    }
    const guide = render(
      <TutorialSetup controller={hook.result.current.entry} setup={hook.result.current.setup} />,
    )
    const instruction = within(
      screen.getByRole('dialog', { name: 'Tutorial introduction' }),
    ).getByRole('status').textContent
    hook.rerender({
      ...initial,
      endPromptOpen: true,
      encounter: {
        ...encounter,
        combatants: encounter.combatants.map((c) => (c.isPC ? c : applyDamage(c, c.hp.max))),
      },
    })
    guide.rerender(
      <TutorialSetup controller={hook.result.current.entry} setup={hook.result.current.setup} />,
    )
    expect(screen.getByText(/Every foe is down.*Keep fighting/)).toBeInTheDocument()
    hook.rerender(initial)
    guide.rerender(
      <TutorialSetup controller={hook.result.current.entry} setup={hook.result.current.setup} />,
    )
    expect(
      within(screen.getByRole('dialog', { name: 'Tutorial introduction' })).getByRole('status')
        .textContent,
    ).toBe(instruction)
    const stopped = {
      ...encounter,
      round: 0,
      combatants: encounter.combatants.map((c) => (c.isPC ? applyDamage(c, 60) : c)),
    }
    hook.rerender({ ...initial, encounter: stopped, recapOpen: true })
    guide.rerender(
      <TutorialSetup controller={hook.result.current.entry} setup={hook.result.current.setup} />,
    )
    expect(screen.getByText(/fight ended.*Done.*Combat recap/)).toBeInTheDocument()
    hook.rerender({ ...initial, encounter: stopped })
    guide.rerender(
      <TutorialSetup controller={hook.result.current.entry} setup={hook.result.current.setup} />,
    )
    if (operation === 'damage applied')
      expect(screen.getByText(/player character is down.*Choose Apply effect/)).toBeInTheDocument()
    else if (operation === 'Prone applied')
      expect(
        screen.getByRole('heading', { name: 'Step 14. Clear the practice board' }),
      ).toBeInTheDocument()
    else
      expect(
        within(screen.getByRole('dialog', { name: 'Tutorial introduction' })).getByRole('status')
          .textContent,
      ).toBe(instruction)
    expect(screen.queryByText('Tutorial complete')).toBeNull()
  },
)
