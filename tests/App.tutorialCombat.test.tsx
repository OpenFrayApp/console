// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, within, waitFor } from '@testing-library/react'
import creatures2024 from '../public/compendium/srd-creatures.json'
import creatures2014 from '../public/compendium/srd-2014-creatures.json'
import type { User } from '@supabase/supabase-js'
import { saveSettings } from '../src/state/settings.ts'
import { renderTutorial, startPracticeFight } from './tutorial/setupHarness.tsx'

vi.mock('../src/compendium/srd.ts', async (original) => ({
  ...(await original<object>()),
  loadSrdCreatures: async () => [...creatures2024, ...creatures2014],
  loadSrdSpells: async () => [],
}))

const controls = {
  click: (element: HTMLElement) => fireEvent.click(element),
  fill: (element: HTMLElement, value: string) => fireEvent.change(element, { target: { value } }),
  select: (element: HTMLElement, value: string) => fireEvent.change(element, { target: { value } }),
}

beforeEach(() => {
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

it('records only the prescribed outside roll through real Ogre hit points before the attack lesson', async () => {
  renderTutorial()
  await startPracticeFight(controls)
  expect(screen.getByText(/Record.*3 damage.*Ogre/)).toBeInTheDocument()
  for (const value of ['no dice', '-30', '3', '-2']) {
    fireEvent.click(screen.getByRole('button', { name: '68' }))
    const field = screen.getByRole('textbox', { name: 'Hit points for Ogre' })
    fireEvent.change(field, { target: { value } })
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(screen.getByText(/Record.*3 damage.*Ogre/)).toBeInTheDocument()
  }
  fireEvent.click(screen.getByRole('button', { name: '68' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Hit points for Ogre' }), {
    target: { value: '-3' },
  })
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Hit points for Ogre' }), { key: 'Enter' })
  expect(screen.getByText(/Javelin.*player character/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '65' })).toBeInTheDocument()
  await waitFor(() => expect(sessionStorage.getItem('openfray:session')).toContain('"current":65'))
})

const dice = vi.hoisted(() => ({ natural: 10 }))
vi.mock('../src/dice/roll.ts', async (original) => {
  const actual = await original<typeof import('../src/dice/roll.ts')>()
  return {
    ...actual,
    roll: vi.fn((formula: string, ctx: import('../src/dice/roll.ts').RollContext = {}) =>
      actual.roll(formula, { ...ctx, rand: () => (ctx.kind === 'attack' ? dice.natural - 1 : 5) }),
    ),
  }
})

/** Record the outside roll through the tracker and open the prescribed normal attack. */
async function openJavelin(initialHp = 68) {
  fireEvent.click(screen.getByRole('button', { name: String(initialHp) }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Hit points for Ogre' }), {
    target: { value: '-3' },
  })
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Hit points for Ogre' }), { key: 'Enter' })
  fireEvent.click(await screen.findByRole('button', { name: 'Javelin.' }))
}

it('resolves a genuine Javelin hit and applies damage before guiding Prone', async () => {
  dice.natural = 10
  renderTutorial()
  await startPracticeFight(controls)
  await openJavelin()
  expect(screen.getByRole('dialog', { name: 'Ogre · Javelin' })).toBeInTheDocument()
  fireEvent.click(
    within(screen.getByRole('dialog', { name: 'Ogre · Javelin' })).getByRole('button', {
      name: 'Rowan',
    }),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Roll attack' }))
  expect(screen.getByText('Hit')).toBeInTheDocument()
  expect(screen.queryByText(/Choose Apply effect for the Ogre/)).toBeNull()
  expect(screen.getByRole('textbox', { name: 'Damage to apply' })).toHaveValue('16')
  fireEvent.click(screen.getByRole('button', { name: 'Apply to Rowan' }))
  expect(screen.queryByRole('dialog', { name: 'Ogre · Javelin' })).toBeNull()
  expect(screen.getByText(/Choose Apply effect for the Ogre/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '14' })).toBeInTheDocument()
})

it('commits Prone only after Apply and leaves attack and damage unchanged on exit', async () => {
  dice.natural = 10
  renderTutorial()
  await startPracticeFight(controls)
  await openJavelin()
  fireEvent.click(
    within(screen.getByRole('dialog', { name: 'Ogre · Javelin' })).getByRole('button', {
      name: 'Rowan',
    }),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Roll attack' }))
  fireEvent.click(screen.getByRole('button', { name: 'Apply to Rowan' }))
  fireEvent.click(screen.getByRole('button', { name: 'Apply effect' }))
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
  expect(screen.getByText(/Choose Apply effect for the Ogre/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Apply effect' }))
  fireEvent.click(screen.getByRole('button', { name: 'Prone' }))
  expect(screen.queryByText(/Prone applied/)).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
  expect(screen.queryByRole('dialog', { name: 'Apply effect to Ogre' })).toBeNull()
  expect(screen.getByText(/Prone applied/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Exit tutorial' }))
  fireEvent.click(screen.getByRole('button', { name: 'Yes, another time' }))
  expect(screen.getByRole('button', { name: '14' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '65' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Prone' })).toBeInTheDocument()
})

it.each([1, 4])(
  'finishes a genuine natural-%s miss without fabricated damage or rerolls',
  async (natural) => {
    dice.natural = natural
    renderTutorial()
    await startPracticeFight(controls)
    await openJavelin()
    const dialog = screen.getByRole('dialog', { name: 'Ogre · Javelin' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(dialog).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rowan' }))
    fireEvent.click(screen.getByRole('button', { name: 'Roll attack' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reroll' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply to Rowan' }))
    expect(dialog).toBeInTheDocument()
    expect(screen.queryByText(/Choose Apply effect for the Ogre/)).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(screen.getByText(/The attack missed. No damage was applied/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '14' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Exit tutorial' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, another time' }))
    const { decodeSession } = await import('../src/codecs/session.ts')
    await waitFor(() => expect(sessionStorage.getItem('openfray:session')).toContain('Javelin'))
    const recovery = decodeSession(sessionStorage.getItem('openfray:session')!)
    if (recovery.status !== 'ok') throw new Error('Expected normal recovery')
    const pc = recovery.snapshot.encounter.combatants.find((c) => c.isPC && c.kind === 'pc')!
    expect(pc.hp.current).toBe(30)
    expect(
      recovery.snapshot.encounter.log.filter((entry) => entry.message === 'Ogre: Javelin → Rowan'),
    ).toHaveLength(1)
  },
)

it('uses normal critical damage and blocks invalid damage, wrong targets, modifiers and cancellation', async () => {
  dice.natural = 20
  renderTutorial()
  await startPracticeFight(controls)
  await openJavelin()
  const dialog = screen.getByRole('dialog', { name: 'Ogre · Javelin' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Robin' }))
  expect(screen.getByRole('button', { name: 'Roll attack' })).toBeDisabled()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Rowan' }))
  fireEvent.click(screen.getByRole('button', { name: 'Disadvantage' }))
  fireEvent.click(screen.getByRole('button', { name: 'Roll attack' }))
  expect(screen.getByText('Critical hit!')).toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'Damage to apply' })).toHaveValue('28')
  for (const value of ['no dice', '-1', '1.5', '999999999999999999999']) {
    fireEvent.change(screen.getByRole('textbox', { name: 'Damage to apply' }), {
      target: { value },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Apply to Rowan' }))
    expect(dialog).toBeInTheDocument()
    expect(screen.queryByText(/Choose Apply effect for the Ogre/)).toBeNull()
  }
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Damage to apply' }), { key: 'Escape' })
  fireEvent.click(screen.getByRole('button', { name: 'Return to tutorial' }))
  expect(screen.getByText('Critical hit!')).toBeInTheDocument()
  fireEvent.change(screen.getByRole('textbox', { name: 'Damage to apply' }), {
    target: { value: '28' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Apply to Rowan' }))
  expect(screen.getByText(/Critical hit: 28 damage applied/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument()
})

it.each([
  { damage: 30, status: 'Unconscious' },
  { damage: 60, status: 'Dead' },
])(
  'keeps the normal $status outcome and continues to Prone when the GM edits damage to $damage',
  async ({ damage, status }) => {
    dice.natural = 10
    renderTutorial()
    await startPracticeFight(controls)
    await openJavelin()
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Ogre · Javelin' })).getByRole('button', {
        name: 'Rowan',
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Roll attack' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Damage to apply' }), {
      target: { value: String(damage) },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Apply to Rowan' }))
    expect(screen.getAllByText(status).length).toBeGreaterThan(0)
    expect(screen.getByText(/player character is down/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Apply effect' }))
    fireEvent.click(screen.getByRole('button', { name: 'Prone' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(screen.getByText(/Prone applied/)).toBeInTheDocument()
  },
)

it.each([
  { library: 'srd-5.2', hp: 68, signedIn: true },
  { library: 'srd-5.1', hp: 59, signedIn: false },
])(
  'continues the real $library setup and new-roster identity path with signedIn=$signedIn',
  async ({ library, hp, signedIn }) => {
    saveSettings({ enabledLibraries: [library] })
    dice.natural = 10
    renderTutorial(signedIn ? ({ id: 'combat-owner' } as User) : null)
    await startPracticeFight(controls, signedIn)
    await openJavelin(hp)
    const dialog = screen.getByRole('dialog', { name: 'Ogre · Javelin' })
    expect(within(dialog).getByText(/\+6 to hit.*2d6\+4 piercing/)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rowan' }))
    fireEvent.click(screen.getByRole('button', { name: 'Roll attack' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply to Rowan' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply effect' }))
    fireEvent.click(screen.getByRole('button', { name: 'Prone' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(screen.getByText(/Prone applied/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '14' })).toBeInTheDocument()
  },
)
