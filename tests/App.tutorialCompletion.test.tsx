// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import creatures2024 from '../public/compendium/srd-creatures.json'
import creatures2014 from '../public/compendium/srd-2014-creatures.json'
import spells2024 from '../public/compendium/srd-spells.json'
import spells2014 from '../public/compendium/srd-2014-spells.json'
import { loadSettings, saveSettings } from '../src/state/settings.ts'
import App from '../src/App.tsx'
import { AuthContext } from '../src/auth/useAuth.ts'
import { authState } from './fixtures.ts'
import { decodeSession } from '../src/codecs/session.ts'
import { saveSession } from '../src/state/persistence.ts'
import { recoverySnapshot } from './fixtures/sessionSnapshot.ts'
import {
  renderTutorial,
  startPracticeFight,
  resolvePracticeFight,
} from './tutorial/setupHarness.tsx'
import type { User } from '@supabase/supabase-js'
import type { RosterPc } from '../src/schema/roster.ts'

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
  loadSrdSpells: async () => [...spells2024, ...spells2014],
}))
vi.mock('../src/dice/roll.ts', async (original) => {
  const actual = await original<typeof import('../src/dice/roll.ts')>()
  return {
    ...actual,
    roll: (formula: string, ctx: import('../src/dice/roll.ts').RollContext = {}) =>
      actual.roll(formula, {
        ...ctx,
        rand: () => (ctx.kind === 'attack' ? 9 : ctx.kind === 'save' ? 0 : 5),
      }),
  }
})
const controls = {
  click: (element: HTMLElement) => fireEvent.click(element),
  fill: (element: HTMLElement, value: string) => fireEvent.change(element, { target: { value } }),
  select: (element: HTMLElement, value: string) => fireEvent.change(element, { target: { value } }),
  enter: (element: HTMLElement) => fireEvent.keyDown(element, { key: 'Enter' }),
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
  roster.saved = []
})

it.each(['srd-5.2', 'srd-5.1'])(
  'completes the full anonymous %s journey only after Stop, recap, and confirmed board/log clearing',
  async (library) => {
    saveSettings({ enabledLibraries: [library] })
    renderTutorial()
    await startPracticeFight(controls)
    await resolvePracticeFight(controls, library)
    expect(screen.getByText(/Choose Stop/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(screen.getByRole('button', { name: 'Next turn' })).toBeInTheDocument()
    expect(loadSettings().tutorialSuppression).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
    expect(screen.getByRole('dialog', { name: 'Combat recap' })).toBeInTheDocument()
    expect(screen.queryByText('Tutorial complete')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByText(/browser.*confirmation.*Cancel/)).toBeInTheDocument()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    fireEvent.click(screen.getByRole('button', { name: 'Remove everyone and clear the log' }))
    expect(confirm).toHaveBeenCalledWith(
      'Remove everyone from the board and clear the game log? This can’t be undone.',
    )
    expect(screen.queryByText('Tutorial complete')).toBeNull()
    expect(loadSettings().tutorialSuppression).toBeNull()
    expect(screen.getByRole('button', { name: 'Remove Rowan' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Exit tutorial' }))
    fireEvent.click(screen.getByRole('button', { name: 'Return to tutorial' }))
    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Remove everyone and clear the log' }))
    expect(await screen.findByRole('dialog', { name: 'Tutorial complete' })).toBeInTheDocument()
    expect(loadSettings().tutorialSuppression).toBe('completed')
    await waitFor(() => {
      const decoded = decodeSession(sessionStorage.getItem('openfray:session')!)
      if (decoded.status !== 'ok') throw new Error('Expected recovery')
      expect(decoded.snapshot.encounter.combatants).toEqual([])
      expect(decoded.snapshot.encounter.log).toEqual([])
      expect(decoded.snapshot.encounter.round).toBe(0)
    })
    expect(
      within(screen.getByRole('dialog', { name: 'Tutorial complete' })).getByRole('button', {
        name: 'Sign in',
      }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continue without an account' }))
    expect(screen.queryByRole('dialog', { name: 'Tutorial complete' })).toBeNull()
    cleanup()
    sessionStorage.clear()
    renderTutorial()
    await waitFor(() => expect(sessionStorage.getItem('openfray:session')).not.toBeNull())
    expect(screen.queryByRole('dialog', { name: 'Learn the console' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Search references' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Search references' }), {
      target: { value: 'tutorial' },
    })
    fireEvent.click(screen.getByRole('option', { name: 'Start tutorial' }))
    expect(
      screen.getByRole('heading', { name: 'Step 1. Add a player character to the board' }),
    ).toBeInTheDocument()
  },
)

/** Finish with the ordinary Stop, recap, and native cleanup controls. */
async function clearPracticeFight() {
  fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
  fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  fireEvent.click(screen.getByRole('button', { name: 'Remove everyone and clear the log' }))
  return screen.findByRole('dialog', { name: 'Tutorial complete' })
}

it.each(['srd-5.2', 'srd-5.1'])(
  'finishes the NEW signed-in %s roster path without deleting either character, even when account preference persistence fails',
  async (library) => {
    const existing = { id: 'existing', name: 'Existing adventurer', ac: 18, maxHp: 50 }
    roster.saved = [existing]
    saveSettings({ enabledLibraries: [library] })
    const persistPreference = vi.fn(async () => ({
      error: 'Account preference could not be saved. Try again later.',
    }))
    renderTutorial({ id: 'completion-owner' } as User, {
      setTutorialSuppression: persistPreference,
    })
    await startPracticeFight(controls, true)
    expect(screen.getByRole('button', { name: 'Remove Rowan' })).toBeInTheDocument()
    await resolvePracticeFight(controls, library, { allySave: false })
    const complete = await clearPracticeFight()
    expect(within(complete).queryByRole('button', { name: 'Sign in' })).toBeNull()
    expect(
      within(complete).queryByRole('button', { name: 'Continue without an account' }),
    ).toBeNull()
    expect(loadSettings().tutorialSuppression).toBe('completed')
    await waitFor(() => expect(persistPreference).toHaveBeenCalledWith('completed'))
    expect(
      await screen.findByText('Account preference could not be saved. Try again later.'),
    ).toBeInTheDocument()
    expect(roster.saved).toEqual([
      existing,
      expect.objectContaining({ name: 'Rowan', maxHp: 30, ac: 12 }),
    ])
    fireEvent.click(within(complete).getByRole('button', { name: 'Back to the console' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add PC' }))
    expect(await screen.findByRole('button', { name: 'Rowan' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Existing adventurer' })).toBeInTheDocument()
  },
)

it.each(['google', 'discord'])(
  'offers existing %s OAuth only after actual cleanup, without an anonymous encounter preservation promise',
  async (provider) => {
    const signIn = vi.fn(async () => ({ error: 'Provider unavailable. Try again later.' }))
    renderTutorial(null, { signInWithProvider: signIn })
    await startPracticeFight(controls)
    await resolvePracticeFight(controls)
    expect(screen.queryByRole('button', { name: 'Continue with Google' })).toBeNull()
    const complete = await clearPracticeFight()
    expect(within(complete).getByRole('button', { name: 'Sign in' })).toHaveClass('bg-indigo-600')
    fireEvent.click(within(complete).getByRole('button', { name: 'Sign in' }))
    const entry = screen.getByRole('dialog', { name: 'Sign in' })
    expect(within(entry).queryByText(/current encounter stays/)).toBeNull()
    expect(
      within(entry).getByText(/tutorial board and game log have been cleared/),
    ).toBeInTheDocument()
    fireEvent.click(
      within(entry).getByRole('button', {
        name: provider === 'google' ? 'Continue with Google' : 'Continue with Discord',
      }),
    )
    await waitFor(() => expect(signIn).toHaveBeenCalledWith(provider))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Provider unavailable. Try again later.',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Back to the console' }))
    expect(loadSettings().tutorialSuppression).toBe('completed')
  },
)

it.each([true, false])(
  'allows completed manual anonymous replays despite permanent suppression with configured auth=%s',
  async (configured) => {
    saveSettings({ tutorialSuppression: 'dismissed' })
    renderTutorial(null, { configured })
    await waitFor(() => expect(sessionStorage.getItem('openfray:session')).not.toBeNull())
    for (let replay = 0; replay < 2; replay++) {
      fireEvent.click(screen.getByRole('button', { name: 'Search references' }))
      fireEvent.change(screen.getByRole('combobox', { name: 'Search references' }), {
        target: { value: 'tutorial' },
      })
      fireEvent.click(screen.getByRole('option', { name: 'Start tutorial' }))
      await startPracticeFight(controls, false, true)
      await resolvePracticeFight(controls)
      const complete = await clearPracticeFight()
      if (configured)
        expect(within(complete).getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
      else {
        expect(within(complete).queryByRole('button', { name: 'Sign in' })).toBeNull()
        expect(within(complete).getByText(/Signing in isn’t available/)).toBeInTheDocument()
      }
      expect(screen.queryByRole('button', { name: 'Continue with Discord' })).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'Continue without an account' }))
    }
    expect(loadSettings().tutorialSuppression).toBe('completed')
  },
)

it.each([false, true])(
  'preserves committed turns/log after native cancellation and permanent exit=$permanent, without completion or identity invitation',
  async (permanent) => {
    renderTutorial()
    await startPracticeFight(controls)
    await resolvePracticeFight(controls)
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(sessionStorage.getItem('openfray:session')).toContain('Fireball'))
    const before = sessionStorage.getItem('openfray:session')
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    fireEvent.click(screen.getByRole('button', { name: 'Remove everyone and clear the log' }))
    fireEvent.click(screen.getByRole('button', { name: 'Exit tutorial' }))
    fireEvent.click(
      screen.getByRole('button', { name: permanent ? 'Never show again' : 'Yes, another time' }),
    )
    expect(screen.getByRole('button', { name: 'Remove Rowan' })).toBeInTheDocument()
    expect(sessionStorage.getItem('openfray:session')).toBe(before)
    expect(loadSettings().tutorialSuppression).toBe(permanent ? 'dismissed' : null)
    expect(screen.queryByRole('dialog', { name: 'Tutorial complete' })).toBeNull()
    expect(screen.queryByRole('dialog', { name: 'Sign in' })).toBeNull()
  },
)

it('completes after normal clearing while preserving encounter metadata and library preferences', async () => {
  const snapshot = recoverySnapshot('named-practice')
  snapshot.encounter.name = 'Table notes'
  snapshot.encounter.shortRests = 2
  saveSession(snapshot)
  const settings = loadSettings()
  renderTutorial()
  await startPracticeFight(controls)
  await resolvePracticeFight(controls)
  await clearPracticeFight()
  await waitFor(() => {
    const decoded = decodeSession(sessionStorage.getItem('openfray:session')!)
    if (decoded.status !== 'ok') throw new Error('Expected recovery')
    expect(decoded.snapshot.encounter).toMatchObject({
      encounterId: 'named-practice',
      name: 'Table notes',
      shortRests: 2,
      combatants: [],
      log: [],
      round: 0,
    })
  })
  expect(loadSettings().enabledLibraries).toEqual(settings.enabledLibraries)
})

it('transfers actual anonymous completion to the arriving account through the existing background preference hook', async () => {
  const app = renderTutorial()
  await startPracticeFight(controls)
  await resolvePracticeFight(controls)
  await clearPracticeFight()
  fireEvent.click(screen.getByRole('button', { name: 'Continue without an account' }))
  const writePreference = vi.fn(async () => ({ error: null }))
  app.rerender(
    <AuthContext.Provider
      value={authState({
        user: { id: 'arriving-owner' } as User,
        setTutorialSuppression: writePreference,
      })}
    >
      <App />
    </AuthContext.Provider>,
  )
  await waitFor(() => expect(writePreference).toHaveBeenCalledWith('completed'))
  expect(screen.queryByRole('dialog', { name: 'Learn the console' })).toBeNull()
  expect(loadSettings().tutorialSuppression).toBe('completed')
})

it('retains account-only suppression on full manual completion without rewriting the account preference', async () => {
  const writePreference = vi.fn(async () => ({ error: null }))
  renderTutorial({ id: 'already-suppressed-owner' } as User, {
    tutorialSuppression: 'dismissed',
    setTutorialSuppression: writePreference,
  })
  await waitFor(() => expect(sessionStorage.getItem('openfray:session')).not.toBeNull())
  fireEvent.click(screen.getByRole('button', { name: 'Search references' }))
  fireEvent.change(screen.getByRole('combobox', { name: 'Search references' }), {
    target: { value: 'tutorial' },
  })
  fireEvent.click(screen.getByRole('option', { name: 'Start tutorial' }))
  await startPracticeFight(controls, true, true)
  await resolvePracticeFight(controls)
  await clearPracticeFight()
  expect(loadSettings().tutorialSuppression).toBe('completed')
  expect(writePreference).not.toHaveBeenCalled()
})

it('still shows truthful completion and continued console access if device preference storage is unavailable', async () => {
  renderTutorial(null, { configured: false })
  await startPracticeFight(controls)
  await resolvePracticeFight(controls)
  const original = Storage.prototype.setItem
  const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
    this: Storage,
    key,
    value,
  ) {
    if (key === 'openfray-settings') throw new Error('Storage unavailable')
    return original.call(this, key, value)
  })
  const complete = await clearPracticeFight()
  expect(storage).toHaveBeenCalledWith('openfray-settings', expect.stringContaining('completed'))
  fireEvent.click(within(complete).getByRole('button', { name: 'Continue without an account' }))
  expect(screen.getByText(/Nobody is on the board yet/)).toBeInTheDocument()
  expect(screen.queryByRole('dialog', { name: 'Learn the console' })).toBeNull()
})
