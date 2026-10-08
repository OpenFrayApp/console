// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { expect, it } from 'vitest'
import { practiceInitiative } from '../../src/tutorial/practiceValues.ts'
import { monster, pc } from '../fixtures.ts'

it('prescribes the player and ally initiative independently of their normal modifiers', () => {
  expect(practiceInitiative(pc({ initiativeMod: -3 }))).toBe(20)
  expect(practiceInitiative(pc({ kind: 'quick', initiativeMod: 8 }))).toBe(14)
})

it.each(['srd-5.2', 'srd-5.1'])('prescribes only the selected %s tutorial creatures', (library) => {
  expect(practiceInitiative(monster({ creatureId: `${library}:ogre` }))).toBe(18)
  expect(practiceInitiative(monster({ creatureId: `${library}:mage` }))).toBe(16)
})

it('does not match custom creatures by their name or an identity suffix', () => {
  expect(practiceInitiative(monster({ creatureId: 'custom:ogre', label: 'Ogre' }))).toBeNull()
  expect(practiceInitiative(monster({ creatureId: 'custom:mage', label: 'Mage' }))).toBeNull()
  expect(practiceInitiative(monster())).toBeNull()
})
