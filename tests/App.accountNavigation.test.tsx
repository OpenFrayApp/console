// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import App from '../src/App.tsx'
import { AuthContext } from '../src/auth/useAuth.ts'
import { nameOf } from '../src/combat/combatant.ts'
import { IndexedDbRecovery } from '../src/state/indexedDbRecovery.ts'
import * as cloud from '../src/state/cloudEncounter.ts'
import { saveSettings } from '../src/state/settings.ts'
import { authState, pc } from './fixtures.ts'
import { recoverySnapshot } from './fixtures/sessionSnapshot.ts'
import type { SessionSnapshot } from '../src/state/persistence.ts'

const navigation = vi.hoisted(() => ({ account: vi.fn(), signIn: vi.fn() }))
vi.mock('../src/auth/signInNavigation.ts', () => ({
  navigateToSiteAccount: navigation.account,
  navigateToSiteSignIn: navigation.signIn,
}))

afterEach(() => {
  cleanup()
  localStorage.clear()
  sessionStorage.clear()
  vi.restoreAllMocks()
  navigation.account.mockReset()
  navigation.signIn.mockReset()
})

/** Compose the working board with owner-scoped recovery and observable cloud writes. */
async function startOwnerBoard() {
  saveSettings({ tutorialSuppression: 'dismissed' })
  const initial = recoverySnapshot('owner-fight')
  initial.encounter.combatants = [pc({ name: 'Owner guard' })]
  const recovery = new Map<string, SessionSnapshot>()
  let persistedCloud = initial.encounter
  vi.spyOn(IndexedDbRecovery.prototype, 'loadLatest').mockImplementation(async () => {
    const snapshot = recovery.get('owner-a')
    return snapshot ? { ownerId: 'owner-a', snapshot, savedAt: '2026-09-02T10:11:12Z' } : null
  })
  const read = vi.spyOn(IndexedDbRecovery.prototype, 'load').mockImplementation(async (ownerId) => {
    const snapshot = recovery.get(ownerId)
    return snapshot ? { ownerId, snapshot, savedAt: '2026-09-02T10:11:12Z' } : null
  })
  vi.spyOn(IndexedDbRecovery.prototype, 'loadConflict').mockResolvedValue(null)
  const save = vi
    .spyOn(IndexedDbRecovery.prototype, 'save')
    .mockImplementation(async (ownerId, snapshot) => {
      recovery.set(ownerId, snapshot)
      return { status: 'saved' }
    })
  vi.spyOn(IndexedDbRecovery.prototype, 'markSynced').mockResolvedValue({ status: 'saved' })
  vi.spyOn(cloud, 'loadCloudEncounter').mockImplementation(async () => ({
    status: 'loaded',
    id: 'cloud-row',
    encounter: persistedCloud,
    revision: 8,
    updatedAt: '2026-09-02T10:11:12Z',
    playerCode: null,
  }))
  vi.spyOn(cloud, 'acquireCloudWriter').mockResolvedValue({
    status: 'acquired',
    revision: 8,
    leaseToken: 'writer-a',
  })
  const saveCloud = vi
    .spyOn(cloud, 'saveCloudEncounter')
    .mockImplementation(async (_owner, _id, revision, _writer, encounter) => {
      persistedCloud = encounter
      return { status: 'saved', id: 'cloud-row', revision: revision + 1, leaseToken: 'writer-a' }
    })
  const owner = authState({ user: { id: 'owner-a', email: 'gm@example.test' } as User })
  const app = render(
    <AuthContext.Provider value={owner}>
      <App />
    </AuthContext.Provider>,
  )
  await screen.findByRole('button', { name: 'Remove Owner guard' })
  return { app, owner, recovery, read, save, saveCloud, cloudBoard: () => persistedCloud }
}

/** Commit one quick creature through the rendered controls. */
function addGuard() {
  fireEvent.click(screen.getByRole('button', { name: 'Quick add' }))
  fireEvent.change(screen.getByLabelText('Quick add name'), { target: { value: 'Latest guard' } })
  fireEvent.change(screen.getByLabelText('Max HP'), { target: { value: '10' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
}

/** Use the header's checkpointed account entry. */
function openAccount() {
  fireEvent.click(screen.getByRole('button', { name: 'Account menu' }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'Profile' }))
}

it('drains the latest committed cloud write before account departure and restores it on return', async () => {
  const board = await startOwnerBoard()
  addGuard()
  let finish!: () => void
  const held = new Promise<void>((resolve) => {
    finish = resolve
  })
  const persist = board.saveCloud.getMockImplementation()!
  board.saveCloud.mockImplementationOnce(async (...args) => {
    await held
    return persist(...args)
  })
  openAccount()
  await waitFor(() => expect(board.saveCloud).toHaveBeenCalled())
  expect(navigation.account).not.toHaveBeenCalled()
  expect(board.cloudBoard().combatants.map(nameOf)).toEqual(['Owner guard'])
  expect(board.recovery.get('owner-a')?.encounter.combatants.map(nameOf)).toEqual([
    'Owner guard',
    'Latest guard',
  ])
  await act(async () => {
    finish()
    await held
  })
  await waitFor(() => expect(navigation.account).toHaveBeenCalledOnce())
  expect(board.cloudBoard().combatants.map(nameOf)).toEqual(['Owner guard', 'Latest guard'])
  expect(board.saveCloud.mock.calls.every(([owner]) => owner === 'owner-a')).toBe(true)
  board.app.unmount()
  render(
    <AuthContext.Provider
      value={{ ...board.owner, displayName: 'Returned name', shareLicense: 'cc-by-4.0' }}
    >
      <App />
    </AuthContext.Provider>,
  )
  await screen.findByRole('button', { name: 'Remove Latest guard' })
  expect(screen.getByRole('button', { name: 'Remove Owner guard' })).toBeInTheDocument()
})

it.each(['recovery readback', 'cloud drain'] as const)(
  'refuses account navigation after failed %s and offers retry/download',
  async (failure) => {
    const board = await startOwnerBoard()
    addGuard()
    if (failure === 'recovery readback') board.read.mockResolvedValueOnce(null)
    else board.saveCloud.mockResolvedValueOnce({ status: 'failed' })
    openAccount()
    expect(await screen.findByRole('dialog', { name: 'Account checkpoint' })).toHaveTextContent(
      failure === 'cloud drain' ? 'cloud copy could not be confirmed' : 'could not be verified',
    )
    expect(navigation.account).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Remove Latest guard' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download recovery copy' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry account' }))
    if (failure === 'cloud drain') {
      await screen.findByRole('button', { name: 'Continue with device copy' })
      expect(navigation.account).not.toHaveBeenCalled()
      fireEvent.click(screen.getByRole('button', { name: 'Continue with device copy' }))
    }
    await waitFor(() => expect(navigation.account).toHaveBeenCalledOnce())
    expect(board.recovery.get('owner-a')?.encounter.combatants.map(nameOf)).toEqual([
      'Owner guard',
      'Latest guard',
    ])
    expect(board.cloudBoard().combatants.map(nameOf)).toEqual(
      failure === 'cloud drain' ? ['Owner guard'] : ['Owner guard', 'Latest guard'],
    )
  },
)

it('does not leave for account if identity changes during cloud draining', async () => {
  const board = await startOwnerBoard()
  addGuard()
  let finish!: (result: cloud.CloudWriteResult) => void
  board.saveCloud.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  openAccount()
  await waitFor(() => expect(board.saveCloud).toHaveBeenCalled())
  board.app.rerender(
    <AuthContext.Provider value={authState({ identityExpired: true })}>
      <App />
    </AuthContext.Provider>,
  )
  await act(async () => {
    finish({ status: 'identity-expired' })
  })
  await screen.findByRole('dialog', { name: 'Account checkpoint' })
  expect(navigation.account).not.toHaveBeenCalled()
  expect(board.recovery.get('owner-a')?.encounter.combatants.map(nameOf)).toEqual([
    'Owner guard',
    'Latest guard',
  ])
  expect(board.cloudBoard().combatants.map(nameOf)).toEqual(['Owner guard'])
})

it('keeps owner recovery separate and never republishes it after an unauthenticated full-page account return', async () => {
  const board = await startOwnerBoard()
  addGuard()
  openAccount()
  await waitFor(() => expect(navigation.account).toHaveBeenCalledOnce())
  const cloudWrites = board.saveCloud.mock.calls.length
  board.app.unmount()
  render(
    <AuthContext.Provider value={authState()}>
      <App />
    </AuthContext.Provider>,
  )
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Remove Owner guard' })).toBeNull(),
  )
  await screen.findByText(/Nobody is on the board yet/)
  expect(screen.queryByRole('button', { name: 'Remove Owner guard' })).toBeNull()
  expect(board.recovery.get('owner-a')?.encounter.combatants.map(nameOf)).toEqual([
    'Owner guard',
    'Latest guard',
  ])
  expect(board.saveCloud).toHaveBeenCalledTimes(cloudWrites)
  expect(board.cloudBoard().combatants.map(nameOf)).toEqual(['Owner guard', 'Latest guard'])
})

it('refuses explicit device-copy continuation when recovery readback cannot be verified', async () => {
  const board = await startOwnerBoard()
  addGuard()
  board.saveCloud.mockResolvedValueOnce({ status: 'failed' })
  openAccount()
  await screen.findByRole('button', { name: 'Continue with device copy' })
  board.read.mockResolvedValueOnce(null)
  fireEvent.click(screen.getByRole('button', { name: 'Continue with device copy' }))
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('could not be verified'))
  expect(navigation.account).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Download recovery copy' })).toBeInTheDocument()
  expect(board.cloudBoard().combatants.map(nameOf)).toEqual(['Owner guard'])
  expect(board.recovery.get('owner-a')?.encounter.combatants.map(nameOf)).toEqual([
    'Owner guard',
    'Latest guard',
  ])
})
