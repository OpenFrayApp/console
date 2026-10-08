// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, expect, it } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useTutorialSetup } from '../../src/tutorial/useTutorialSetup.ts'
import { instantiate } from '../../src/combat/combatant.ts'
import { condition } from '../../src/combat/effects.ts'
import { emptyEncounter } from '../../src/state/encounter.ts'
import type { Creature } from '../../src/schema/creature.ts'
import creatures from '../../public/compendium/srd-creatures.json'
import { pc } from '../fixtures.ts'

afterEach(cleanup)

it('waits for the GM to advance from the player to the Ogre and then to the Mage', () => {
  const ogre = instantiate(creatures.find((c) => c.id === 'srd-5.2:ogre') as Creature, {
    combatantId: 'ogre',
    label: 'Ogre',
    initiative: 18,
  })
  const mage = instantiate(creatures.find((c) => c.id === 'srd-5.2:mage') as Creature, {
    combatantId: 'mage',
    label: 'Mage',
    initiative: 16,
  })
  const encounter = {
    ...emptyEncounter(),
    round: 1,
    combatants: [
      pc({ initiative: 20 }),
      ogre,
      mage,
      pc({ combatantId: 'ally', kind: 'quick', name: 'Robin', side: 'friend', initiative: 14 }),
    ],
  }
  const initial = {
    active: true,
    encounter,
    signedIn: false,
    initiativeOpen: false,
    library: 'srd-5.2' as const,
  }
  const hook = renderHook(useTutorialSetup, { initialProps: initial })
  const actionId = ogre.creature.actions!.find((a) => a.name === 'Javelin')!.id
  const attack = { targetId: 'p1', outcome: 'hit' as const, damage: 16 }
  act(() => hook.result.current.recordDamage('ogre', 3))
  expect(hook.result.current.task).toBe('ogre-turn')
  act(() => hook.result.current.recordAttack('ogre', actionId, attack))
  expect(hook.result.current.task).toBe('ogre-turn')
  expect(encounter.activeIndex).toBe(0)
  hook.rerender({ ...initial, encounter: { ...encounter, activeIndex: 1 } })
  expect(hook.result.current.task).toBe('attack')
  act(() => hook.result.current.recordAttack('ogre', actionId, attack))
  expect(hook.result.current.task).toBe('prone')
  act(() => hook.result.current.recordEffects('ogre', [condition('Prone')]))
  expect(hook.result.current.task).toBe('mage-turn')
  hook.rerender({ ...initial, encounter: { ...encounter, activeIndex: 2 } })
  expect(hook.result.current.task).toBe('spell')
})

it('offers cleanup when a fight really ends during a pending story turn', () => {
  const ogre = instantiate(creatures.find((c) => c.id === 'srd-5.2:ogre') as Creature, {
    combatantId: 'ogre',
    label: 'Ogre',
    initiative: 18,
  })
  const initial = {
    active: true,
    encounter: { ...emptyEncounter(), round: 1, combatants: [pc(), ogre] },
    signedIn: false,
    initiativeOpen: false,
    library: 'srd-5.2' as const,
    recapOpen: false,
  }
  const hook = renderHook(useTutorialSetup, { initialProps: initial })
  act(() => hook.result.current.recordDamage('ogre', 3))
  expect(hook.result.current.task).toBe('ogre-turn')
  hook.rerender({ ...initial, recapOpen: true, encounter: { ...initial.encounter, round: 0 } })
  expect(hook.result.current.task).toBe('recap')
  hook.rerender({ ...initial, encounter: { ...initial.encounter, round: 0 } })
  expect(hook.result.current.task).toBe('clear')
})
