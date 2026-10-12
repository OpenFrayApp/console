// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { nameOf } from '../src/combat/combatant.ts'
import App from '../src/App.tsx'
import { saveSettings } from '../src/state/settings.ts'
import {
  loadAuthRecovery,
  saveAuthRecovery,
  loadAuthRecoveryConflict,
} from '../src/state/authRecovery.ts'
import { saveSession } from '../src/state/persistence.ts'
import { decodeSession } from '../src/codecs/session.ts'
import { AuthContext } from '../src/auth/useAuth.ts'
import { recoverySnapshot } from './fixtures/sessionSnapshot.ts'
import { IndexedDbRecovery } from '../src/state/indexedDbRecovery.ts'
import * as cloudEncounter from '../src/state/cloudEncounter.ts'
import type { User } from '@supabase/supabase-js'
import { authState, pc } from './fixtures.ts'

const navigation = vi.hoisted(() => ({ leave: vi.fn(), account: vi.fn() }))
vi.mock('../src/auth/signInNavigation.ts', () => ({
  navigateToSiteSignIn: navigation.leave,
  navigateToSiteAccount: navigation.account,
}))

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  localStorage.clear()
  vi.restoreAllMocks()
  navigation.leave.mockReset()
  navigation.account.mockReset()
})

/** Start an anonymous board without the newcomer invitation. */
async function startBoard() {
  saveSettings({ tutorialSuppression: 'dismissed' })
  render(
    <AuthContext.Provider value={authState()}>
      <App />
    </AuthContext.Provider>,
  )
  await screen.findByRole('button', { name: 'Sign in to resume saving' })
  fireEvent.click(screen.getByRole('button', { name: 'Quick add' }))
  fireEvent.change(screen.getByLabelText('Quick add name'), { target: { value: 'Latest guard' } })
  fireEvent.change(screen.getByLabelText('Max HP'), { target: { value: '10' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
}

it('checkpoints the latest board before navigating to site sign-in in the same tab', async () => {
  await startBoard()
  fireEvent.click(screen.getAllByRole('button', { name: 'Sign in' })[0])
  await waitFor(() => expect(navigation.leave).toHaveBeenCalledOnce())
  const recovery = loadAuthRecovery()
  expect(recovery.snapshot?.encounter.combatants.map(nameOf)).toEqual(['Latest guard'])
  expect(screen.getByRole('button', { name: 'Remove Latest guard' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Continue with Google' })).toBeNull()
})

it('stays on the working board when a checkpoint fails and offers retry and download', async () => {
  await startBoard()
  const write = Storage.prototype.setItem
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
    if (key === 'openfray:auth-recovery') throw new DOMException('Full', 'QuotaExceededError')
    return write.call(this, key, value)
  })
  fireEvent.click(screen.getAllByRole('button', { name: 'Sign in' })[0])
  expect(await screen.findByRole('alert')).toHaveTextContent(/checkpoint.*Retry/i)
  expect(navigation.leave).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Remove Latest guard' })).toBeInTheDocument()
  expect(decodeSession(sessionStorage.getItem('openfray:session')!)).toMatchObject({ status: 'ok' })
  expect(screen.getByRole('button', { name: 'Download recovery copy' })).toBeInTheDocument()
  vi.restoreAllMocks()
  fireEvent.click(screen.getByRole('button', { name: 'Retry sign-in' }))
  await waitFor(() => expect(navigation.leave).toHaveBeenCalledOnce())
})

it.each(['empty', 'existing'] as const)(
  'keeps the returned anonymous board independent of %s cloud until an explicit choice',
  async (cloud) => {
    saveSettings({ tutorialSuppression: 'dismissed' })
    const anonymous = recoverySnapshot('anonymous-return')
    anonymous.encounter.combatants = [pc({ name: 'Anonymous guard' })]
    expect(saveAuthRecovery(anonymous).status).toBe('saved')
    const cloudBoard = recoverySnapshot('cloud-return')
    cloudBoard.encounter.combatants = [pc({ name: 'Cloud guard' })]
    vi.spyOn(IndexedDbRecovery.prototype, 'loadLatest').mockResolvedValue(null)
    vi.spyOn(IndexedDbRecovery.prototype, 'load').mockResolvedValue(null)
    vi.spyOn(IndexedDbRecovery.prototype, 'loadConflict').mockResolvedValue(null)
    const saveDevice = vi
      .spyOn(IndexedDbRecovery.prototype, 'save')
      .mockResolvedValue({ status: 'saved' })
    const archive = vi
      .spyOn(IndexedDbRecovery.prototype, 'archiveConflict')
      .mockResolvedValue({ status: 'saved' })
    vi.spyOn(IndexedDbRecovery.prototype, 'markSynced').mockResolvedValue({ status: 'saved' })
    vi.spyOn(cloudEncounter, 'loadCloudEncounter').mockResolvedValue(
      cloud === 'empty'
        ? { status: 'empty' }
        : {
            status: 'loaded',
            id: 'cloud-row',
            encounter: cloudBoard.encounter,
            revision: 8,
            updatedAt: '2026-09-02T10:11:12Z',
            playerCode: null,
          },
    )
    vi.spyOn(cloudEncounter, 'acquireCloudWriter').mockResolvedValue({
      status: 'acquired',
      revision: 8,
      leaseToken: 'writer-a',
    })
    const saveCloud = vi
      .spyOn(cloudEncounter, 'saveCloudEncounter')
      .mockResolvedValue({ status: 'failed' })
    render(
      <AuthContext.Provider value={authState({ user: { id: 'return-owner' } as User })}>
        <App />
      </AuthContext.Provider>,
    )
    const conflict = await screen.findByRole('dialog', { name: 'Choose a board copy' })
    expect(conflict).toHaveTextContent('Your anonymous board has not been added to this account.')
    expect(screen.getByRole('button', { name: 'Remove Anonymous guard' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove Cloud guard' })).toBeNull()
    expect(saveDevice).not.toHaveBeenCalled()
    expect(saveCloud).not.toHaveBeenCalled()
    expect(loadAuthRecovery().snapshot).toMatchObject(anonymous)
    fireEvent.click(screen.getByRole('button', { name: 'Use cloud copy' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Choose a board copy' })).toBeNull(),
    )
    expect(screen.queryByRole('button', { name: 'Remove Anonymous guard' })).toBeNull()
    if (cloud === 'existing')
      expect(screen.getByRole('button', { name: 'Remove Cloud guard' })).toBeInTheDocument()
    else expect(screen.getByText(/Nobody is on the board yet/)).toBeInTheDocument()
    expect(archive).toHaveBeenCalledWith(
      'return-owner',
      expect.objectContaining({
        device: expect.objectContaining({ snapshot: expect.objectContaining(anonymous) }),
      }),
    )
    expect(loadAuthRecovery().status).toBe('empty')
  },
)

it('does not checkpoint the previous owner board under a new identity while its cloud is loading', async () => {
  saveSettings({ tutorialSuppression: 'dismissed' })
  vi.spyOn(IndexedDbRecovery.prototype, 'loadLatest').mockResolvedValue(null)
  vi.spyOn(IndexedDbRecovery.prototype, 'load').mockResolvedValue(null)
  vi.spyOn(IndexedDbRecovery.prototype, 'loadConflict').mockResolvedValue(null)
  const saveDevice = vi
    .spyOn(IndexedDbRecovery.prototype, 'save')
    .mockResolvedValue({ status: 'saved' })
  vi.spyOn(IndexedDbRecovery.prototype, 'markSynced').mockResolvedValue({ status: 'saved' })
  const first = recoverySnapshot('owner-a-fight')
  first.encounter.combatants = [pc({ name: 'Private guard' })]
  let finish!: (value: cloudEncounter.LoadedEncounter) => void
  const held = new Promise<cloudEncounter.LoadedEncounter>((resolve) => {
    finish = resolve
  })
  vi.spyOn(cloudEncounter, 'loadCloudEncounter')
    .mockResolvedValueOnce({
      status: 'loaded',
      id: 'owner-a-row',
      encounter: first.encounter,
      revision: 8,
      updatedAt: '2026-09-02T10:11:12Z',
      playerCode: null,
    })
    .mockReturnValueOnce(held)
  vi.spyOn(cloudEncounter, 'acquireCloudWriter').mockResolvedValue({
    status: 'acquired',
    revision: 8,
    leaseToken: 'writer-a',
  })
  const app = render(
    <AuthContext.Provider value={authState({ user: { id: 'owner-a' } as User })}>
      <App />
    </AuthContext.Provider>,
  )
  await screen.findByRole('button', { name: 'Remove Private guard' })
  app.rerender(
    <AuthContext.Provider value={authState({ user: { id: 'owner-b' } as User })}>
      <App />
    </AuthContext.Provider>,
  )
  await waitFor(() => expect(cloudEncounter.loadCloudEncounter).toHaveBeenCalledTimes(2))
  expect(saveDevice.mock.calls.filter(([owner]) => owner === 'owner-b')).toEqual([])
  finish({ status: 'empty' })
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Remove Private guard' })).toBeNull(),
  )
  await waitFor(() =>
    expect(saveDevice.mock.calls.some(([owner]) => owner === 'owner-b')).toBe(true),
  )
  expect(
    saveDevice.mock.calls
      .filter(([owner]) => owner === 'owner-b')
      .map(([, saved]) => saved.encounter.combatants),
  ).toEqual([[]])
})

it('can renew an expired identity after checkpointing its latest board to the original recovery owner', async () => {
  saveSettings({ tutorialSuppression: 'dismissed' })
  let stored = recoverySnapshot('expired-fight')
  stored.encounter.combatants = [pc({ name: 'Expired guard' })]
  vi.spyOn(IndexedDbRecovery.prototype, 'loadLatest').mockImplementation(async () => ({
    ownerId: 'expired-owner',
    snapshot: stored,
    savedAt: '2026-09-02T10:11:12Z',
  }))
  vi.spyOn(IndexedDbRecovery.prototype, 'load').mockImplementation(async () => ({
    ownerId: 'expired-owner',
    snapshot: stored,
    savedAt: '2026-09-02T10:11:12Z',
  }))
  const saves = vi
    .spyOn(IndexedDbRecovery.prototype, 'save')
    .mockImplementation(async (_owner, value) => {
      stored = value
      return { status: 'saved' }
    })
  const saveCloud = vi
    .spyOn(cloudEncounter, 'saveCloudEncounter')
    .mockResolvedValue({ status: 'failed' })
  render(
    <AuthContext.Provider value={authState({ identityExpired: true })}>
      <App />
    </AuthContext.Provider>,
  )
  await screen.findByRole('button', { name: 'Remove Expired guard' })
  fireEvent.click(screen.getAllByRole('button', { name: 'Sign in' })[0])
  await waitFor(() => expect(navigation.leave).toHaveBeenCalledOnce())
  expect(saves.mock.calls.map(([owner]) => owner)).toEqual(['expired-owner', 'expired-owner'])
  expect(stored.encounter.combatants.map(nameOf)).toEqual(['Expired guard'])
  expect(loadAuthRecovery().status).toBe('empty')
  expect(saveCloud).not.toHaveBeenCalled()
})

it('does not reopen an old owner conflict when its pending reconciliation finishes after an owner switch', async () => {
  saveSettings({ tutorialSuppression: 'dismissed' })
  const deviceBoard = recoverySnapshot('owner-a-device')
  deviceBoard.encounter.combatants = [pc({ name: 'Owner A device guard' })]
  const device = { ownerId: 'owner-a', snapshot: deviceBoard, savedAt: '2026-09-02T10:11:12Z' }
  vi.spyOn(IndexedDbRecovery.prototype, 'loadLatest').mockResolvedValue(device)
  vi.spyOn(IndexedDbRecovery.prototype, 'load').mockImplementation(async (owner) =>
    owner === 'owner-a' ? device : null,
  )
  vi.spyOn(IndexedDbRecovery.prototype, 'loadConflict').mockResolvedValue(null)
  vi.spyOn(IndexedDbRecovery.prototype, 'save').mockResolvedValue({ status: 'saved' })
  let finishArchive!: () => void
  const held = new Promise<void>((resolve) => {
    finishArchive = resolve
  })
  vi.spyOn(IndexedDbRecovery.prototype, 'archiveConflict').mockImplementation(async () => {
    await held
    return { status: 'saved' }
  })
  const cloudA = recoverySnapshot('owner-a-cloud')
  cloudA.encounter.combatants = [pc({ name: 'Owner A cloud guard' })]
  const cloudB = recoverySnapshot('owner-b-cloud')
  cloudB.encounter.combatants = [pc({ name: 'Owner B cloud guard' })]
  vi.spyOn(cloudEncounter, 'loadCloudEncounter')
    .mockResolvedValueOnce({
      status: 'loaded',
      id: 'owner-a-row',
      encounter: cloudA.encounter,
      revision: 8,
      updatedAt: '2026-09-02T10:11:12Z',
      playerCode: null,
    })
    .mockResolvedValueOnce({
      status: 'loaded',
      id: 'owner-a-row',
      encounter: cloudA.encounter,
      revision: 8,
      updatedAt: '2026-09-02T10:11:12Z',
      playerCode: null,
    })
    .mockResolvedValueOnce({
      status: 'loaded',
      id: 'owner-b-row',
      encounter: cloudB.encounter,
      revision: 8,
      updatedAt: '2026-09-02T10:11:12Z',
      playerCode: null,
    })
  vi.spyOn(cloudEncounter, 'acquireCloudWriter').mockResolvedValue({
    status: 'acquired',
    revision: 8,
    leaseToken: 'writer-a',
  })
  const app = render(
    <AuthContext.Provider value={authState({ user: { id: 'owner-a' } as User })}>
      <App />
    </AuthContext.Provider>,
  )
  await screen.findByRole('dialog', { name: 'Choose a board copy' })
  fireEvent.click(screen.getByRole('button', { name: 'Use cloud copy' }))
  await waitFor(() => expect(IndexedDbRecovery.prototype.archiveConflict).toHaveBeenCalledOnce())
  app.rerender(
    <AuthContext.Provider value={authState({ user: { id: 'owner-b' } as User })}>
      <App />
    </AuthContext.Provider>,
  )
  await screen.findByRole('button', { name: 'Remove Owner B cloud guard' })
  finishArchive()
  await waitFor(() =>
    expect(screen.queryByRole('dialog', { name: 'Choose a board copy' })).toBeNull(),
  )
  expect(screen.getByRole('button', { name: 'Remove Owner B cloud guard' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Remove Owner A device guard' })).toBeNull()
})

it('restores the latest verified anonymous handoff after full-page cancellation when session mirroring failed', async () => {
  saveSettings({ tutorialSuppression: 'dismissed' })
  vi.spyOn(IndexedDbRecovery.prototype, 'loadLatest').mockResolvedValue(null)
  const old = recoverySnapshot('cancelled-trip')
  old.encounter.combatants = [pc({ name: 'Old guard' })]
  expect(saveSession(old).status).toBe('saved')
  expect(saveAuthRecovery(old).status).toBe('saved')
  const write = Storage.prototype.setItem
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
    if (key.startsWith('openfray:session')) throw new DOMException('Full', 'QuotaExceededError')
    return write.call(this, key, value)
  })
  const renderAnonymous = () =>
    render(
      <AuthContext.Provider value={authState()}>
        <App />
      </AuthContext.Provider>,
    )
  renderAnonymous()
  await screen.findByRole('button', { name: 'Remove Old guard' })
  fireEvent.click(screen.getByRole('button', { name: 'Remove Old guard' }))
  const addGuard = (name: string) => {
    fireEvent.click(screen.getByRole('button', { name: 'Quick add' }))
    fireEvent.change(screen.getByLabelText('Quick add name'), { target: { value: name } })
    fireEvent.change(screen.getByLabelText('Max HP'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  }
  addGuard('Latest guard')
  fireEvent.click(screen.getAllByRole('button', { name: 'Sign in' })[0])
  await waitFor(() => expect(navigation.leave).toHaveBeenCalledOnce())
  expect(loadAuthRecovery().snapshot?.encounter.combatants.map(nameOf)).toEqual(['Latest guard'])
  cleanup()
  renderAnonymous()
  await screen.findByRole('button', { name: 'Remove Latest guard' })
  expect(screen.queryByRole('button', { name: 'Remove Old guard' })).toBeNull()
  addGuard('Later guard')
  await waitFor(() =>
    expect(loadAuthRecovery().snapshot?.encounter.combatants.map(nameOf)).toEqual([
      'Latest guard',
      'Later guard',
    ]),
  )
  cleanup()
  renderAnonymous()
  await screen.findByRole('button', { name: 'Remove Later guard' })
  expect(screen.getByRole('button', { name: 'Remove Latest guard' })).toBeInTheDocument()
})

it.each([
  ['anonymous', 'sign-in'],
  ['owner', 'sign-in'],
  ['anonymous', 'account'],
  ['owner', 'account'],
] as const)(
  'preserves every unresolved %s branch before %s departure without cloud publication',
  async (origin, destination) => {
    saveSettings({ tutorialSuppression: 'dismissed' })
    const ownerBoard = recoverySnapshot('before-renewal-owner')
    ownerBoard.encounter.combatants = [pc({ name: 'Owner guard' })]
    const anonymous = recoverySnapshot('before-renewal-anonymous')
    anonymous.encounter.combatants = [pc({ name: 'Anonymous guard' })]
    const cloudBoard = recoverySnapshot('before-renewal-cloud')
    cloudBoard.encounter.combatants = [pc({ name: 'Cloud guard' })]
    if (origin === 'anonymous') expect(saveAuthRecovery(anonymous).status).toBe('saved')
    let stored = ownerBoard
    let archived: import('../src/state/encounterLifecycle.ts').ReconciliationConflict | null = null
    vi.spyOn(IndexedDbRecovery.prototype, 'loadLatest').mockImplementation(async () => ({
      ownerId: 'renew-owner',
      snapshot: stored,
      savedAt: '2026-09-02T10:11:12Z',
    }))
    vi.spyOn(IndexedDbRecovery.prototype, 'load').mockImplementation(async (ownerId) =>
      ownerId === 'renew-owner'
        ? { ownerId: 'renew-owner', snapshot: stored, savedAt: '2026-09-02T10:11:12Z' }
        : null,
    )
    vi.spyOn(IndexedDbRecovery.prototype, 'loadConflict').mockImplementation(async (ownerId) =>
      ownerId === 'renew-owner' ? archived : null,
    )
    const archive = vi
      .spyOn(IndexedDbRecovery.prototype, 'archiveConflict')
      .mockImplementation(async (_owner, conflict) => {
        archived = conflict
        return { status: 'saved' }
      })
    const deviceSave = vi
      .spyOn(IndexedDbRecovery.prototype, 'save')
      .mockImplementation(async (_owner, snapshot) => {
        stored = snapshot
        return { status: 'saved' }
      })
    const cloudLoad = vi.spyOn(cloudEncounter, 'loadCloudEncounter').mockResolvedValue({
      status: 'loaded',
      id: 'cloud-row',
      encounter: cloudBoard.encounter,
      revision: 8,
      updatedAt: '2026-09-02T10:11:12Z',
      playerCode: null,
    })
    const acquire = vi
      .spyOn(cloudEncounter, 'acquireCloudWriter')
      .mockResolvedValue({ status: 'failed' })
    const cloudSave = vi
      .spyOn(cloudEncounter, 'saveCloudEncounter')
      .mockResolvedValue({ status: 'failed' })
    const app = render(
      <AuthContext.Provider value={authState({ user: { id: 'renew-owner' } as User })}>
        <App />
      </AuthContext.Provider>,
    )
    await screen.findByRole('dialog', { name: 'Choose a board copy' })
    if (destination === 'sign-in') {
      app.rerender(
        <AuthContext.Provider value={authState({ identityExpired: true })}>
          <App />
        </AuthContext.Provider>,
      )
      await act(() => Promise.resolve())
      fireEvent.click(screen.getAllByRole('button', { name: 'Sign in' })[0])
      await waitFor(() => expect(navigation.leave).toHaveBeenCalledOnce())
    } else {
      fireEvent.click(screen.getByRole('button', { name: 'Account menu' }))
      fireEvent.click(screen.getByRole('menuitem', { name: 'Profile' }))
      await waitFor(() => expect(navigation.account).toHaveBeenCalledOnce())
    }
    expect(cloudLoad).toHaveBeenCalledOnce()
    expect(acquire).not.toHaveBeenCalled()
    expect(cloudSave).not.toHaveBeenCalled()
    if (origin === 'anonymous') {
      expect(archive).not.toHaveBeenCalled()
      expect(deviceSave).not.toHaveBeenCalled()
      const retained = loadAuthRecoveryConflict('renew-owner')
      expect(retained?.device.snapshot.encounter.encounterId).toBe('before-renewal-anonymous')
      expect(retained?.cloud.snapshot.encounter.encounterId).toBe('before-renewal-cloud')
      expect(retained?.ownerRecovery?.snapshot.encounter.encounterId).toBe('before-renewal-owner')
      expect(loadAuthRecoveryConflict('wrong-owner')).toBeNull()
    } else {
      expect(archive).toHaveBeenCalledOnce()
      expect(archived).toMatchObject({
        unresolved: true,
        device: { snapshot: ownerBoard },
        cloud: { snapshot: expect.objectContaining({ encounter: cloudBoard.encounter }) },
      })
    }
    cleanup()
    cloudLoad.mockResolvedValue({ status: 'failed' })
    render(
      <AuthContext.Provider value={authState({ user: { id: 'renew-owner' } as User })}>
        <App />
      </AuthContext.Provider>,
    )
    await screen.findByRole('dialog', { name: 'Choose a board copy' })
    expect(
      screen.getByRole('button', {
        name: origin === 'anonymous' ? 'Remove Anonymous guard' : 'Remove Owner guard',
      }),
    ).toBeInTheDocument()
    expect(cloudSave).not.toHaveBeenCalled()
    cleanup()
    render(
      <AuthContext.Provider value={authState({ user: { id: 'wrong-owner' } as User })}>
        <App />
      </AuthContext.Provider>,
    )
    if (origin === 'anonymous')
      await screen.findByRole('button', { name: 'Remove Anonymous guard' })
    else await screen.findByText(/Nobody is on the board yet/)
    await act(() => Promise.resolve())
    expect(screen.queryByRole('dialog', { name: 'Choose a board copy' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Remove Owner guard' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Remove Cloud guard' })).toBeNull()
    expect(cloudSave).not.toHaveBeenCalled()
  },
)
