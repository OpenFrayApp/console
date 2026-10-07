// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, within, waitFor } from '@testing-library/react'
import creatures2024 from '../public/compendium/srd-creatures.json'
import creatures2014 from '../public/compendium/srd-2014-creatures.json'
import spells2024 from '../public/compendium/srd-spells.json'
import spells2014 from '../public/compendium/srd-2014-spells.json'
import { saveSettings } from '../src/state/settings.ts'
import { decodeSession } from '../src/codecs/session.ts'
import { renderTutorial, startPracticeFight } from './tutorial/setupHarness.tsx'

vi.mock('../src/compendium/srd.ts', async (original) => ({
  ...(await original<object>()),
  loadSrdCreatures: async () => [...creatures2024, ...creatures2014],
  loadSrdSpells: async () => [...spells2024, ...spells2014],
}))
const dice = vi.hoisted(() => ({ saves: [19, 0] }))
vi.mock('../src/dice/roll.ts', async (original) => {
  const actual = await original<typeof import('../src/dice/roll.ts')>()
  return {
    ...actual,
    roll: (formula: string, ctx: import('../src/dice/roll.ts').RollContext = {}) =>
      actual.roll(formula, {
        ...ctx,
        rand: () => (ctx.kind === 'save' ? dice.saves.shift()! : ctx.kind === 'attack' ? 9 : 5),
      }),
  }
})
const controls = {
  click: (element: HTMLElement) => fireEvent.click(element),
  fill: (element: HTMLElement, value: string) => fireEvent.change(element, { target: { value } }),
  select: (element: HTMLElement, value: string) => fireEvent.change(element, { target: { value } }),
}
beforeEach(() => {
  dice.saves = [0]
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 20,
    y: 20,
    left: 20,
    top: 20,
    right: 200,
    bottom: 80,
    width: 180,
    height: 60,
    toJSON: () => ({}),
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  sessionStorage.clear()
  localStorage.clear()
})

/** Reach casting through committed outside damage, attack, and Prone on the real board. */
async function reachFireball(hp: number, attackDamage?: number) {
  await startPracticeFight(controls)
  fireEvent.click(screen.getByRole('button', { name: String(hp) }))
  controls.fill(screen.getByRole('textbox', { name: 'Hit points for Ogre' }), '-3')
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Hit points for Ogre' }), { key: 'Enter' })
  fireEvent.click(await screen.findByRole('button', { name: 'Javelin.' }))
  fireEvent.click(
    within(screen.getByRole('dialog', { name: 'Ogre · Javelin' })).getByRole('button', {
      name: 'Rowan',
    }),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Roll attack' }))
  if (attackDamage !== undefined)
    controls.fill(screen.getByRole('textbox', { name: 'Damage to apply' }), String(attackDamage))
  fireEvent.click(screen.getByRole('button', { name: 'Apply to Rowan' }))
  fireEvent.click(screen.getByRole('button', { name: 'Apply effect' }))
  fireEvent.click(screen.getByRole('button', { name: 'Prone' }))
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
  expect(screen.getByText(/Prone applied.*Fireball/)).toBeInTheDocument()
  fireEvent.click(await screen.findByRole('button', { name: /^Fireball/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Cast' }))
}

it.each([
  { library: 'srd-5.2', hp: 68 },
  { library: 'srd-5.1', hp: 59 },
])(
  'casts the real $library Mage Fireball with exact targets, mixed saves, resources, and a committed turn',
  async ({ library, hp }) => {
    saveSettings({ enabledLibraries: [library] })
    renderTutorial()
    await reachFireball(hp)
    const dialog = screen.getByRole('dialog', { name: 'Mage · Fireball' })
    expect(screen.getByText(/friendly fire.*Mage’s allied Ogre/)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rowan' }))
    expect(screen.getByRole('button', { name: 'Roll saves' })).toBeDisabled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Robin' }))
    expect(screen.getByRole('button', { name: 'Roll saves' })).toBeDisabled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ogre' }))
    fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
    expect(screen.getByRole('button', { name: 'Apply damage' })).toBeDisabled()
    fireEvent.click(
      within(screen.getByRole('textbox', { name: 'Damage to Robin' }).closest('li')!).getByRole(
        'button',
        { name: 'Save' },
      ),
    )
    expect(screen.getByRole('textbox', { name: 'Damage to Robin' })).toHaveValue('24')
    expect(screen.getByRole('textbox', { name: 'Damage to Ogre' })).toHaveValue('48')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(dialog).toBeInTheDocument()
    expect(screen.queryByText(/Choose Next turn/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Apply damage' }))
    expect(screen.queryByRole('dialog', { name: 'Mage · Fireball' })).toBeNull()
    expect(screen.getByText(/Choose Next turn/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '6' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: String(hp - 51) })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next turn' }))
    expect(screen.getByText(/Turn advanced/)).toBeInTheDocument()
    await waitFor(() => {
      const decoded = decodeSession(sessionStorage.getItem('openfray:session')!)
      expect(decoded.status).toBe('ok')
      if (decoded.status !== 'ok') return
      const encounter = decoded.snapshot.encounter
      expect(encounter.combatants[encounter.activeIndex].isPC).toBe(true)
      expect(encounter.combatants[encounter.activeIndex]).toMatchObject({ name: 'Robin' })
      const mage = encounter.combatants.find((c) => !c.isPC && c.creatureId === `${library}:mage`)!
      if (mage.isPC) throw new Error('Expected Mage')
      expect(
        library === 'srd-5.2'
          ? mage.spellUsesSpent[`${library}:fireball`] === 1
          : mage.slotsUsed['3'],
      ).toBe(library === 'srd-5.2' ? true : 1)
    })
  },
)

it.each([
  { library: 'srd-5.2', hp: 68, allySave: false, ogreSave: false },
  { library: 'srd-5.1', hp: 59, allySave: false, ogreSave: true },
  { library: 'srd-5.2', hp: 68, allySave: true, ogreSave: true },
])(
  'accepts recorded ally Save=$allySave and genuine Ogre Save=$ogreSave in $library, including defeat and skipped turns',
  async ({ library, hp, allySave, ogreSave }) => {
    dice.saves = [ogreSave ? 19 : 0]
    saveSettings({ enabledLibraries: [library] })
    renderTutorial()
    await reachFireball(hp)
    const dialog = screen.getByRole('dialog', { name: 'Mage · Fireball' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Robin' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ogre' }))
    fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
    const ally = screen.getByRole('textbox', { name: 'Damage to Robin' })
    fireEvent.click(
      within(ally.closest('li')!).getByRole('button', { name: allySave ? 'Save' : 'Fail' }),
    )
    expect(ally).toHaveValue(allySave ? '24' : '48')
    expect(screen.getByRole('textbox', { name: 'Damage to Ogre' })).toHaveValue(
      ogreSave ? '24' : '48',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Apply damage' }))
    expect(screen.getByText(/Choose Next turn/)).toBeInTheDocument()
    if (!allySave) expect(screen.getAllByText('Unconscious').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Next turn' }))
    expect(screen.getByText(/Turn advanced/)).toBeInTheDocument()
    await waitFor(() => {
      const decoded = decodeSession(sessionStorage.getItem('openfray:session')!)
      if (decoded.status !== 'ok') throw new Error('Expected recovery')
      expect(
        decoded.snapshot.encounter.combatants[decoded.snapshot.encounter.activeIndex],
      ).toMatchObject({ name: 'Robin' })
    })
  },
)

it.each(
  [
    { library: 'srd-5.2', hp: 68 },
    { library: 'srd-5.1', hp: 59 },
  ].flatMap((fixture) =>
    ['dead', 'stable', 'recovered'].map((outcome) => ({ ...fixture, outcome })),
  ),
)(
  'retains genuine $library Fireball and the ally’s $outcome outcome through real turns and completion UI',
  async ({ library, hp, outcome }) => {
    dice.saves = [0]
    saveSettings({ enabledLibraries: [library] })
    renderTutorial()
    await reachFireball(hp, 60)
    const dialog = screen.getByRole('dialog', { name: 'Mage · Fireball' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Robin' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ogre' }))
    fireEvent.click(screen.getByRole('button', { name: 'Roll saves' }))
    fireEvent.click(
      within(screen.getByRole('textbox', { name: 'Damage to Robin' }).closest('li')!).getByRole(
        'button',
        { name: 'Fail' },
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Apply damage' }))
    expect(screen.queryByRole('dialog', { name: 'Combat recap' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Next turn' }))
    expect(screen.getByText(/still takes turns for death saves/)).toBeInTheDocument()
    dice.saves = outcome === 'dead' ? [1, 1, 1] : outcome === 'stable' ? [9, 9, 9] : [19]
    const turns = outcome === 'recovered' ? 1 : 3
    for (let turn = 0; turn < turns; turn++) {
      fireEvent.click(screen.getByRole('button', { name: 'Roll death save' }))
      if (turn < turns - 1) {
        for (let next = 0; next < 3; next++)
          fireEvent.click(screen.getByRole('button', { name: 'Next turn' }))
      }
    }
    if (outcome === 'recovered') {
      expect(screen.queryByRole('dialog', { name: 'Combat recap' })).toBeNull()
      expect(screen.getByText(/Turn advanced/)).toBeInTheDocument()
    } else {
      expect(await screen.findByRole('dialog', { name: 'Combat recap' })).toBeInTheDocument()
      expect(screen.getByText(/fight ended.*Done.*Combat recap/)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Next turn' })).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'Done' }))
      expect(screen.getByText(/fight already ended/)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Next turn' })).toBeNull()
    }
    expect(screen.queryByText('Tutorial complete')).toBeNull()
    await waitFor(() => {
      const decoded = decodeSession(sessionStorage.getItem('openfray:session')!)
      if (decoded.status !== 'ok') throw new Error('Expected recovery')
      const encounter = decoded.snapshot.encounter
      expect(encounter.round).toBe(outcome === 'recovered' ? 1 : 0)
      expect(encounter.combatants.filter((c) => c.isPC).map((c) => c.hp.current)).toEqual([
        0,
        outcome === 'recovered' ? 1 : 0,
      ])
      expect(encounter.log.some((entry) => entry.message.includes('Fireball'))).toBe(true)
    })
  },
)
