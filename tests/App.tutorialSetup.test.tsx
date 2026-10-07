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
  'adds the required %s snapshots and starts with the prescribed practice turn order',
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
    expect(
      screen.getByText(/Normally, OpenFray rolls for creatures and quick adds/),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Initiative for Rowan')).toHaveValue('')
    for (const [name, value] of [
      ['Ogre', '18'],
      ['Mage', '16'],
      ['Robin', '14'],
    ]) {
      expect(screen.getByLabelText(`Initiative for ${name}`)).toHaveValue(value)
      expect(screen.getByLabelText(`Initiative for ${name}`)).toHaveAttribute('readonly')
    }
    for (const value of ['', 'no dice', '17']) {
      fireEvent.change(screen.getByLabelText('Initiative for Rowan'), { target: { value } })
      fireEvent.click(screen.getByRole('button', { name: 'Start combat' }))
      expect(screen.getByRole('dialog', { name: 'Roll initiative' })).toBeInTheDocument()
    }
    fireEvent.change(screen.getByLabelText('Initiative for Rowan'), { target: { value: '20' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start combat' }))
    expect(screen.queryByRole('dialog', { name: 'Roll initiative' })).toBeNull()
    expect(
      screen.getByRole('heading', { name: 'Step 6. Record your player’s hit' }),
    ).toBeInTheDocument()
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
        creature: expect.objectContaining({ id: `${library}:ogre` }),
        initiative: 18,
      }),
      expect.objectContaining({
        creature: expect.objectContaining({
          id: `${library}:mage`,
          edition: library === 'srd-5.2' ? '5.5' : '5.0',
        }),
        initiative: 16,
      }),
      expect.objectContaining({
        name: 'Robin',
        kind: 'quick',
        side: 'friend',
        ac: 12,
        hp: { current: 30, max: 30, temp: 0 },
        initiative: 14,
      }),
    ])
    expect(recovery.snapshot.encounter.log.some((entry) => entry.category === 'roll')).toBe(false)
    expect(
      recovery.snapshot.encounter.log.filter((entry) =>
        entry.message.includes('practice initiative'),
      ),
    ).toHaveLength(4)
    expect(recovery.snapshot.encounter.activeIndex).toBe(0)
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
  fireEvent.change(screen.getByLabelText('Initiative for New adventurer'), {
    target: { value: '20' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Start combat' }))
  expect(
    screen.getByRole('heading', { name: 'Step 6. Record your player’s hit' }),
  ).toBeInTheDocument()
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

/** Launch manually through the real search and Settings controls. */
function launchFromSettings() {
  fireEvent.click(screen.getByRole('button', { name: 'Search references' }))
  fireEvent.click(screen.getByRole('option', { name: 'Settings' }))
  fireEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))
}

it.each(
  [false, true].flatMap((signedIn) =>
    ['Creatures', 'Characters'].map((tab) => ({ signedIn, tab })),
  ),
)(
  'starts with Add PC when launched from $tab with signedIn=$signedIn',
  async ({ signedIn, tab }) => {
    renderTutorial(signedIn ? ({ id: `launch-owner-${tab}` } as User) : null)
    fireEvent.click(await screen.findByRole('button', { name: 'Not now' }))
    fireEvent.click(screen.getByRole('button', { name: 'Search references' }))
    fireEvent.click(screen.getByRole('option', { name: 'Compendium' }))
    fireEvent.click(screen.getByRole('tab', { name: tab }))
    launchFromSettings()
    expect(screen.queryByRole('tab', { name: tab })).toBeNull()
    expect(screen.queryByText(/stays in your roster after clearing/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Add PC' }))
    if (signedIn) {
      fireEvent.click(screen.getByRole('button', { name: 'Create a character…' }))
      expect(screen.getByText(/stays in your roster after clearing/)).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Create character' }))
    }
    expect(screen.getByLabelText('PC name')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('PC name'), { target: { value: 'Launched adventurer' } })
    fireEvent.change(screen.getByLabelText('AC'), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText('Max HP'), { target: { value: '30' } })
    fireEvent.click(screen.getByRole('button', { name: signedIn ? 'Create PC' : 'Add' }))
    if (signedIn) fireEvent.click(screen.getByRole('button', { name: 'Add to encounter' }))
    expect(screen.getByRole('button', { name: 'Remove Launched adventurer' })).toBeInTheDocument()
    expect(screen.getByText(/Quick add.*Friend/)).toBeInTheDocument()
    await waitFor(() =>
      expect(sessionStorage.getItem('openfray:session')).toContain('Launched adventurer'),
    )
  },
)

it.each(['library', 'board'])(
  'keeps the current Characters route when the %s prerequisite blocks launch',
  async (prerequisite) => {
    if (prerequisite === 'library') saveSettings({ enabledLibraries: ['kobold-press-tob3'] })
    renderTutorial()
    fireEvent.click(await screen.findByRole('button', { name: 'Not now' }))
    if (prerequisite === 'board') {
      addPractice('Quick add', 'Quick add name', 'Keep this guard')
      fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Search references' }))
    fireEvent.click(screen.getByRole('option', { name: 'Compendium' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Characters' }))
    const settings = loadSettings()
    launchFromSettings()
    expect(screen.getByRole('dialog', { name: 'Before starting the tutorial' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back to the console' }))
    expect(screen.getByRole('tab', { name: 'Characters' })).toHaveAttribute('aria-selected', 'true')
    expect(loadSettings()).toEqual(settings)
    if (prerequisite === 'board') {
      await waitFor(() =>
        expect(sessionStorage.getItem('openfray:session')).toContain('Keep this guard'),
      )
    }
  },
)

it.each(['Controls', 'Stat block'])(
  'returns to Tracker when launched from the swipe %s screen',
  async (pane) => {
    renderTutorial()
    fireEvent.click(await screen.findByRole('button', { name: 'Not now' }))
    fireEvent.click(screen.getByRole('button', { name: pane }))
    expect(screen.getByRole('button', { name: pane })).toHaveAttribute('aria-current', 'page')
    launchFromSettings()
    expect(screen.getByRole('button', { name: 'Tracker' })).toHaveAttribute('aria-current', 'page')
    addPractice('Add PC', 'PC name', 'Rowan')
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    addPractice('Quick add', 'Quick add name', 'Robin')
    fireEvent.change(screen.getByLabelText('Side'), { target: { value: 'friend' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    for (const name of ['Mage', 'Ogre']) {
      fireEvent.click(screen.getByRole('button', { name: 'Add creature' }))
      fireEvent.change(screen.getByLabelText('Search creatures'), { target: { value: name } })
      fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^${name} `) }))
    }
    expect(screen.getByRole('button', { name: 'Tracker' })).toHaveAttribute('aria-current', 'page')
    fireEvent.click(screen.getByRole('button', { name: 'Begin' }))
    expect(screen.getByRole('dialog', { name: 'Roll initiative' })).toBeInTheDocument()
    await waitFor(() =>
      expect(sessionStorage.getItem('openfray:session')).toContain('srd-5.2:ogre'),
    )
  },
)
