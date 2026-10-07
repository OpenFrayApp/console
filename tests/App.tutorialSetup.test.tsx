// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { decodeSession } from '../src/codecs/session.ts'
import { saveSettings, loadSettings } from '../src/state/settings.ts'
import creatures2024 from '../public/compendium/srd-creatures.json'
import creatures2014 from '../public/compendium/srd-2014-creatures.json'
import type { User } from '@supabase/supabase-js'
import type { RosterPc } from '../src/schema/roster.ts'
import { renderTutorial } from './tutorial/setupHarness.tsx'

const roster = vi.hoisted(() => ({ saved: [] as RosterPc[] }))
vi.mock('../src/state/cloudPlayers.ts', () => ({
  loadRosterPcs: async () => roster.saved,
  saveRosterPc: async (pc: RosterPc) => {
    roster.saved = [...roster.saved, pc]
  },
  updateRosterPc: vi.fn(),
  deleteRosterPc: vi.fn(),
}))

vi.mock('../src/compendium/srd.ts', async (original) => ({
  ...(await original<object>()),
  loadSrdCreatures: async () => [...creatures2024, ...creatures2014],
}))

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
  vi.restoreAllMocks()
  cleanup()
  sessionStorage.clear()
  localStorage.clear()
  roster.saved = []
})

it('guides the real anonymous Add PC and rejects incorrect practice values before committing', async () => {
  renderTutorial()
  fireEvent.click(await screen.findByRole('button', { name: 'Start tutorial' }))
  expect(screen.getByText(/Choose a name.*30 hit points.*armor class 12/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Add PC' }))
  fireEvent.change(screen.getByLabelText('PC name'), { target: { value: 'Rowan' } })
  fireEvent.change(screen.getByLabelText('Max HP'), { target: { value: '29' } })
  fireEvent.change(screen.getByLabelText('AC'), { target: { value: '12' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(screen.queryByRole('button', { name: 'Remove Rowan' })).toBeNull()
  expect(screen.getByLabelText('PC name')).toHaveValue('Rowan')
  fireEvent.change(screen.getByLabelText('Max HP'), { target: { value: '30' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(screen.getByRole('button', { name: 'Remove Rowan' })).toBeInTheDocument()
  expect(screen.getByText(/Quick add.*Friend/)).toBeInTheDocument()
  await waitFor(() => expect(sessionStorage.getItem('openfray:session')).toContain('Rowan'))
})

/** Commit a named practice combatant through its visible normal form. */
function addPractice(control: string, label: string, name: string) {
  fireEvent.click(screen.getByRole('button', { name: control }))
  fireEvent.change(screen.getByLabelText(label), { target: { value: name } })
  fireEvent.change(screen.getByLabelText('Max HP'), { target: { value: '30' } })
  fireEvent.change(screen.getByLabelText('AC'), { target: { value: '12' } })
}

it.each(['srd-5.2', 'srd-5.1'])(
  'adds exactly the required %s snapshots and starts only with four valid manual initiatives',
  async (library) => {
    saveSettings({ enabledLibraries: [library] })
    const settings = loadSettings()
    renderTutorial()
    fireEvent.click(await screen.findByRole('button', { name: 'Start tutorial' }))
    addPractice('Add PC', 'PC name', 'Rowan')
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    addPractice('Quick add', 'Quick add name', 'Robin')
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.queryByRole('button', { name: 'Remove Robin' })).toBeNull()
    fireEvent.change(screen.getByLabelText('Side'), { target: { value: 'friend' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add creature' }))
    fireEvent.change(screen.getByLabelText('Search creatures'), { target: { value: 'Mage' } })
    fireEvent.click(await screen.findByRole('button', { name: /^Mage / }))
    fireEvent.click(screen.getByRole('button', { name: 'Add creature' }))
    fireEvent.change(screen.getByLabelText('Search creatures'), { target: { value: 'Ogre' } })
    fireEvent.click(await screen.findByRole('button', { name: /^Ogre / }))
    fireEvent.click(screen.getByRole('button', { name: 'Begin' }))
    for (const name of ['Rowan', 'Robin', 'Mage', 'Ogre'])
      expect(screen.getByLabelText(`Initiative for ${name}`)).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: 'Start combat' }))
    expect(screen.getByRole('dialog', { name: 'Roll initiative' })).toBeInTheDocument()
    for (const [index, name] of ['Rowan', 'Robin', 'Mage', 'Ogre'].entries())
      fireEvent.change(screen.getByLabelText(`Initiative for ${name}`), {
        target: { value: String(20 - index) },
      })
    fireEvent.change(screen.getByLabelText('Initiative for Ogre'), { target: { value: 'no dice' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start combat' }))
    expect(screen.getByRole('dialog', { name: 'Roll initiative' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Initiative for Ogre'), { target: { value: '-2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start combat' }))
    expect(screen.queryByRole('dialog', { name: 'Roll initiative' })).toBeNull()
    expect(screen.getByText(/Your fight has started/)).toBeInTheDocument()
    await waitFor(() => expect(sessionStorage.getItem('openfray:session')).toContain('"round":1'))
    const recovery = decodeSession(sessionStorage.getItem('openfray:session')!)
    expect(recovery.status).toBe('ok')
    if (recovery.status !== 'ok') throw new Error('Expected the normal recovery copy')
    expect(recovery.snapshot.encounter.combatants).toEqual([
      expect.objectContaining({
        name: 'Rowan',
        kind: 'pc',
        ac: 12,
        hp: { current: 30, max: 30, temp: 0 },
        initiative: 20,
      }),
      expect.objectContaining({
        name: 'Robin',
        kind: 'quick',
        side: 'friend',
        ac: 12,
        hp: { current: 30, max: 30, temp: 0 },
        initiative: 19,
      }),
      expect.objectContaining({
        creature: expect.objectContaining({
          id: `${library}:mage`,
          edition: library === 'srd-5.2' ? '5.5' : '5.0',
        }),
        initiative: 18,
      }),
      expect.objectContaining({
        creature: expect.objectContaining({ id: `${library}:ogre` }),
        initiative: -2,
      }),
    ])
    expect(recovery.snapshot.encounter.log.some((entry) => entry.category === 'roll')).toBe(false)
    expect(loadSettings()).toEqual(settings)
    expect(screen.queryByText('Tutorial complete')).toBeNull()
  },
)

it('blocks unrelated actions and form cancellation but allows reversible exit without losing committed setup', async () => {
  renderTutorial()
  fireEvent.click(await screen.findByRole('button', { name: 'Start tutorial' }))
  fireEvent.click(screen.getByRole('button', { name: 'Quick add' }))
  expect(screen.queryByLabelText('Quick add name')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Add PC' }))
  fireEvent.keyDown(screen.getByLabelText('PC name'), { key: 'Escape' })
  fireEvent.click(screen.getByRole('button', { name: 'Return to tutorial' }))
  expect(screen.getByLabelText('PC name')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Add PC' }))
  expect(screen.getByLabelText('PC name')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Exit tutorial' }))
  fireEvent.click(screen.getByRole('button', { name: 'Return to tutorial' }))
  expect(screen.getByLabelText('PC name')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('PC name'), { target: { value: 'Keep me' } })
  fireEvent.change(screen.getByLabelText('Max HP'), { target: { value: '30' } })
  fireEvent.change(screen.getByLabelText('AC'), { target: { value: '12' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  fireEvent.click(screen.getByRole('button', { name: 'Exit tutorial' }))
  fireEvent.click(screen.getByRole('button', { name: 'Yes, another time' }))
  expect(screen.getByRole('button', { name: 'Remove Keep me' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Quick add' }))
  expect(screen.getByLabelText('Quick add name')).toBeInTheDocument()
})

it('creates a NEW durable roster character through the signed-in path and leaves existing roster entries untouched', async () => {
  roster.saved = [{ id: 'existing', name: 'Existing adventurer', ac: 18, maxHp: 50 }]
  renderTutorial({ id: 'setup-owner' } as User)
  fireEvent.click(await screen.findByRole('button', { name: 'Start tutorial' }))
  fireEvent.click(screen.getByRole('button', { name: 'Add PC' }))
  expect(screen.queryByRole('button', { name: 'Existing adventurer' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Create a character…' }))
  fireEvent.click(screen.getByRole('button', { name: 'Create character' }))
  expect(screen.getByText(/stays in your roster after clearing/)).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('PC name'), { target: { value: 'New adventurer' } })
  fireEvent.change(screen.getByLabelText('AC'), { target: { value: '13' } })
  fireEvent.change(screen.getByLabelText('Max HP'), { target: { value: '30' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create PC' }))
  expect(screen.getByRole('dialog', { name: 'New player character' })).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('AC'), { target: { value: '12' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create PC' }))
  expect(screen.queryByRole('dialog', { name: 'New player character' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Add to encounter' }))
  expect(screen.getByRole('button', { name: 'Remove New adventurer' })).toBeInTheDocument()
  addPractice('Quick add', 'Quick add name', 'New friend')
  fireEvent.change(screen.getByLabelText('Side'), { target: { value: 'friend' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  for (const name of ['Mage', 'Ogre']) {
    fireEvent.click(screen.getByRole('button', { name: 'Add creature' }))
    fireEvent.change(screen.getByLabelText('Search creatures'), { target: { value: name } })
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^${name} `) }))
  }
  fireEvent.click(screen.getByRole('button', { name: 'Begin' }))
  for (const [index, name] of ['New adventurer', 'New friend', 'Mage', 'Ogre'].entries()) {
    fireEvent.change(screen.getByLabelText(`Initiative for ${name}`), {
      target: { value: String(20 - index) },
    })
  }
  fireEvent.click(screen.getByRole('button', { name: 'Start combat' }))
  expect(screen.getByText(/Your fight has started/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Exit tutorial' }))
  fireEvent.click(screen.getByRole('button', { name: 'Yes, another time' }))
  fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
  fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  fireEvent.click(screen.getByRole('button', { name: 'Remove everyone and clear the log' }))
  fireEvent.click(screen.getByRole('button', { name: 'Add PC' }))
  expect(await screen.findByRole('button', { name: 'New adventurer' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Existing adventurer' })).toBeInTheDocument()
  expect(roster.saved).toEqual([
    { id: 'existing', name: 'Existing adventurer', ac: 18, maxHp: 50 },
    expect.objectContaining({ name: 'New adventurer', maxHp: 30, ac: 12 }),
  ])
})
