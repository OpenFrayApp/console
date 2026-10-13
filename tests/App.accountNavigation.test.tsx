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
import {
  saveSession,
  exportRecoveryCopy,
  loadSession,
  loadOwnerSession,
  type SessionSnapshot,
} from '../src/state/persistence.ts'
import { saveAuthRecovery, loadAuthRecovery } from '../src/state/authRecovery.ts'
import { encounterHash } from '../src/state/reconciliation.ts'
import type { DeviceRecovery, ReconciliationConflict } from '../src/state/encounterLifecycle.ts'
import { encodeSession, decodeSession } from '../src/codecs/session.ts'

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
  vi.unstubAllGlobals()
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

/** Request explicit termination through the header rather than bypassing recovery. */
function requestSignOut() {
  fireEvent.click(screen.getByRole('button', { name: 'Account menu' }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }))
}

it('drains latest recovery before the menu invokes guarded sign-out without site navigation', async () => {
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
  requestSignOut()
  await waitFor(() => expect(board.saveCloud).toHaveBeenCalled())
  expect(board.owner.signOut).not.toHaveBeenCalled()
  await act(async () => {
    finish()
    await held
  })
  await waitFor(() => expect(board.owner.signOut).toHaveBeenCalledOnce())
  expect(navigation.account).not.toHaveBeenCalled()
  expect(navigation.signIn).not.toHaveBeenCalled()
  expect(board.recovery.get('owner-a')?.encounter.combatants.map(nameOf)).toEqual([
    'Owner guard',
    'Latest guard',
  ])
})

it.each(['recovery readback', 'cloud drain'] as const)(
  'keeps the menu sign-out gated on failed %s with recovery available',
  async (failure) => {
    const board = await startOwnerBoard()
    addGuard()
    if (failure === 'recovery readback') board.read.mockResolvedValueOnce(null)
    else board.saveCloud.mockResolvedValueOnce({ status: 'failed' })
    requestSignOut()
    expect(await screen.findByRole('dialog', { name: 'Sign-out checkpoint' })).toHaveTextContent(
      failure === 'cloud drain' ? 'cloud copy could not be confirmed' : 'could not be verified',
    )
    expect(board.owner.signOut).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Download recovery copy' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove Latest guard' })).toBeInTheDocument()
  },
)

it('does not invoke old or replacement sign-out if identity changes during checkpoint', async () => {
  const board = await startOwnerBoard()
  addGuard()
  let finish!: (result: cloud.CloudWriteResult) => void
  board.saveCloud.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  requestSignOut()
  await waitFor(() => expect(board.saveCloud).toHaveBeenCalled())
  const replacement = authState({ user: { id: 'owner-b', email: 'other@example.test' } as User })
  board.app.rerender(
    <AuthContext.Provider value={replacement}>
      <App />
    </AuthContext.Provider>,
  )
  await act(async () => {
    finish({ status: 'identity-expired' })
  })
  await screen.findByRole('dialog', { name: 'Sign-out checkpoint' })
  expect(board.owner.signOut).not.toHaveBeenCalled()
  expect(replacement.signOut).not.toHaveBeenCalled()
})

it('removes the unsafe-navigation warning synchronously after verifying Profile departure', async () => {
  await startOwnerBoard()
  addGuard()
  let warned: boolean | undefined
  navigation.account.mockImplementationOnce(() => {
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    warned = event.defaultPrevented
  })
  openAccount()
  await waitFor(() => expect(navigation.account).toHaveBeenCalledOnce())
  expect(warned).toBe(false)
})

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
    if (failure === 'recovery readback') {
      const event = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(true)
    }
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

it.each(['healthy', 'blocked', 'missing'] as const)(
  'keeps owner recovery separate after account signout with %s IndexedDB',
  async (availability) => {
    const board = await startOwnerBoard()
    addGuard()
    openAccount()
    await waitFor(() => expect(navigation.account).toHaveBeenCalledOnce())
    const cloudWrites = board.saveCloud.mock.calls.length
    board.app.unmount()
    if (availability === 'blocked') {
      vi.mocked(IndexedDbRecovery.prototype.loadLatest).mockRejectedValue(new Error('blocked'))
      board.read.mockRejectedValue(new Error('blocked'))
    } else if (availability === 'missing') {
      vi.mocked(IndexedDbRecovery.prototype.loadLatest).mockResolvedValue(null)
      board.read.mockResolvedValue(null)
    }
    render(
      <AuthContext.Provider value={authState()}>
        <App />
      </AuthContext.Provider>,
    )
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Remove Owner guard' })).toBeNull(),
    )
    await screen.findByRole('button', { name: 'Sign in to resume saving' })
    await screen.findByText(/Nobody is on the board yet/)
    expect(screen.queryByRole('button', { name: 'Remove Owner guard' })).toBeNull()
    expect(board.recovery.get('owner-a')?.encounter.combatants.map(nameOf)).toEqual([
      'Owner guard',
      'Latest guard',
    ])
    expect(board.saveCloud).toHaveBeenCalledTimes(cloudWrites)
    expect(board.cloudBoard().combatants.map(nameOf)).toEqual(['Owner guard', 'Latest guard'])
  },
)

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

it('restores later genuine anonymous edits after reload even when owner IndexedDB recovery remains', async () => {
  const board = await startOwnerBoard()
  openAccount()
  await waitFor(() => expect(navigation.account).toHaveBeenCalledOnce())
  const writes = board.saveCloud.mock.calls.length
  board.app.unmount()
  const anonymous = () =>
    render(
      <AuthContext.Provider value={authState()}>
        <App />
      </AuthContext.Provider>,
    )
  anonymous()
  await screen.findByRole('button', { name: 'Sign in to resume saving' })
  addGuard()
  await screen.findByRole('button', { name: 'Remove Latest guard' })
  cleanup()
  anonymous()
  await screen.findByRole('button', { name: 'Remove Latest guard' })
  expect(screen.queryByRole('button', { name: 'Remove Owner guard' })).toBeNull()
  expect(board.recovery.get('owner-a')?.encounter.combatants.map(nameOf)).toEqual(['Owner guard'])
  expect(board.saveCloud).toHaveBeenCalledTimes(writes)
})

it('does not expose owner tab rollback to a different identity when IndexedDB is missing', async () => {
  const board = await startOwnerBoard()
  openAccount()
  await waitFor(() => expect(navigation.account).toHaveBeenCalledOnce())
  board.app.unmount()
  vi.mocked(IndexedDbRecovery.prototype.loadLatest).mockResolvedValue(null)
  board.read.mockResolvedValue(null)
  vi.mocked(cloud.loadCloudEncounter).mockResolvedValue({ status: 'failed' })
  const writes = board.saveCloud.mock.calls.length
  render(
    <AuthContext.Provider value={authState({ user: { id: 'owner-b' } as User })}>
      <App />
    </AuthContext.Provider>,
  )
  await screen.findByRole('button', { name: 'Offline' })
  expect(screen.queryByRole('button', { name: 'Remove Owner guard' })).toBeNull()
  expect(board.saveCloud).toHaveBeenCalledTimes(writes)
  expect(loadOwnerSession('owner-a').snapshot?.encounter.combatants.map(nameOf)).toEqual([
    'Owner guard',
  ])
  expect(loadSession()).toEqual({ status: 'empty', snapshot: null })
})

it('restores matching owner rollback during expiry without anonymous relabeling when IndexedDB is blocked', async () => {
  const board = await startOwnerBoard()
  openAccount()
  await waitFor(() => expect(navigation.account).toHaveBeenCalledOnce())
  board.app.unmount()
  vi.mocked(IndexedDbRecovery.prototype.loadLatest).mockRejectedValue(new Error('blocked'))
  board.read.mockRejectedValue(new Error('blocked'))
  const writes = board.saveCloud.mock.calls.length
  render(
    <AuthContext.Provider value={authState({ identityExpired: true })}>
      <App />
    </AuthContext.Provider>,
  )
  await screen.findByRole('button', { name: 'Remove Owner guard' })
  expect(board.saveCloud).toHaveBeenCalledTimes(writes)
  expect(loadOwnerSession('owner-a').snapshot?.encounter.combatants.map(nameOf)).toEqual([
    'Owner guard',
  ])
  expect(loadSession()).toEqual({ status: 'empty', snapshot: null })
})

it.each([null, 'wrong-owner'])(
  'retains unknown legacy session bytes without displaying or publishing them (%s)',
  async (ownerId) => {
    saveSettings({ tutorialSuppression: 'dismissed' })
    const legacy = recoverySnapshot('legacy-private')
    legacy.encounter.combatants = [pc({ name: 'Legacy private guard' })]
    const encoded = encodeSession(legacy)
    if (encoded.status !== 'ok') throw new Error('Invalid test snapshot')
    sessionStorage.setItem('openfray:session', encoded.serialized)
    vi.spyOn(IndexedDbRecovery.prototype, 'loadLatest').mockResolvedValue(null)
    vi.spyOn(IndexedDbRecovery.prototype, 'load').mockResolvedValue(null)
    vi.spyOn(IndexedDbRecovery.prototype, 'loadConflict').mockResolvedValue(null)
    vi.spyOn(IndexedDbRecovery.prototype, 'save').mockResolvedValue({ status: 'saved' })
    vi.spyOn(cloud, 'loadCloudEncounter').mockResolvedValue({ status: 'failed' })
    const writes = vi.spyOn(cloud, 'saveCloudEncounter').mockResolvedValue({ status: 'failed' })
    render(
      <AuthContext.Provider value={authState({ user: ownerId ? ({ id: ownerId } as User) : null })}>
        <App />
      </AuthContext.Provider>,
    )
    await screen.findByRole('button', { name: ownerId ? 'Offline' : 'Save failed' })
    expect(screen.queryByRole('button', { name: 'Remove Legacy private guard' })).toBeNull()
    expect(exportRecoveryCopy('current')?.serialized).toBe(encoded.serialized)
    expect(exportRecoveryCopy('quarantine')?.serialized).toBe(encoded.serialized)
    expect(writes).not.toHaveBeenCalled()
  },
)

it('downloads current anonymous edits and retained legacy recovery independently without replacing either copy', async () => {
  saveSettings({ tutorialSuppression: 'dismissed' })
  const legacy = recoverySnapshot('unverified-legacy')
  legacy.encounter.combatants = [pc({ name: 'Unverified guard' })]
  const raw = JSON.stringify({ version: 2, snapshot: legacy })
  sessionStorage.setItem('openfray:session', raw)
  vi.spyOn(IndexedDbRecovery.prototype, 'loadLatest').mockRejectedValue(new Error('blocked'))
  const writes = vi.spyOn(cloud, 'saveCloudEncounter').mockResolvedValue({ status: 'failed' })
  const downloads: Blob[] = []
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL(blob: Blob) {
        downloads.push(blob)
        return 'blob:recovery'
      }
      static revokeObjectURL() {}
    },
  )
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  render(
    <AuthContext.Provider value={authState()}>
      <App />
    </AuthContext.Provider>,
  )
  await screen.findByRole('button', { name: 'Save failed' })
  addGuard()
  await screen.findByRole('button', { name: 'Remove Latest guard' })
  fireEvent.click(screen.getByRole('button', { name: 'Save failed' }))
  expect(screen.getByText(/unverified ownership/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Download recovery copy' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save failed' }))
  fireEvent.click(screen.getByRole('button', { name: 'Download retained recovery' }))
  const contents = await Promise.all(
    downloads.map(
      (blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.addEventListener('load', () => resolve(String(reader.result)), { once: true })
          reader.addEventListener('error', () => reject(reader.error), { once: true })
          reader.readAsText(blob)
        }),
    ),
  )
  expect(contents).toHaveLength(2)
  const current = decodeSession(contents[0])
  expect(current.status === 'ok' && current.snapshot.encounter.combatants.map(nameOf)).toEqual([
    'Latest guard',
  ])
  expect(contents[1]).toBe(raw)
  expect(exportRecoveryCopy('current')?.serialized).toBe(raw)
  expect(exportRecoveryCopy('quarantine')?.serialized).toBe(raw)
  expect(writes).not.toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: 'Remove Unverified guard' })).toBeNull()
})

it.each([
  ['device', true],
  ['cloud', true],
  ['device', false],
  ['cloud', false],
] as const)(
  'consumes resolved anonymous mirrors after %s choice and restores later owner edits with online=%s',
  async (choice, online) => {
    saveSettings({ tutorialSuppression: 'dismissed' })
    const anonymous = recoverySnapshot('resolved-anonymous')
    anonymous.encounter.combatants = [pc({ name: 'Anonymous guard' })]
    expect(saveSession(recoverySnapshot('previous-anonymous')).status).toBe('saved')
    expect(saveSession(anonymous).status).toBe('saved')
    expect(saveAuthRecovery(anonymous).status).toBe('saved')
    const remote = recoverySnapshot('resolved-cloud')
    remote.encounter.combatants = [pc({ name: 'Cloud guard' })]
    let cloudBoard = remote.encounter
    let revision = 8
    let connected = true
    vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => connected)
    let device: DeviceRecovery | null = null
    let archive: ReconciliationConflict | null = null
    vi.spyOn(IndexedDbRecovery.prototype, 'loadLatest').mockImplementation(async () => device)
    vi.spyOn(IndexedDbRecovery.prototype, 'load').mockImplementation(async () => device)
    vi.spyOn(IndexedDbRecovery.prototype, 'loadConflict').mockImplementation(async () => archive)
    vi.spyOn(IndexedDbRecovery.prototype, 'archiveConflict').mockImplementation(
      async (_owner, value) => {
        archive = structuredClone(value)
        return { status: 'saved' }
      },
    )
    vi.spyOn(IndexedDbRecovery.prototype, 'save').mockImplementation(
      async (ownerId, snapshot, savedAt) => {
        device = { ownerId, snapshot: structuredClone(snapshot), savedAt }
        return { status: 'saved' }
      },
    )
    vi.spyOn(IndexedDbRecovery.prototype, 'markSynced').mockImplementation(
      async (ownerId, snapshot, lineage) => {
        device = {
          ownerId,
          snapshot: structuredClone(snapshot),
          savedAt: new Date().toISOString(),
          lineage,
        }
        return { status: 'saved' }
      },
    )
    vi.spyOn(cloud, 'loadCloudEncounter').mockImplementation(async () =>
      connected
        ? {
            status: 'loaded',
            id: 'cloud-row',
            encounter: cloudBoard,
            revision,
            updatedAt: new Date().toISOString(),
            playerCode: null,
          }
        : { status: 'failed' },
    )
    vi.spyOn(cloud, 'acquireCloudWriter').mockImplementation(async () => ({
      status: 'acquired',
      revision,
      leaseToken: 'writer-a',
    }))
    const cloudWrite = vi
      .spyOn(cloud, 'saveCloudEncounter')
      .mockImplementation(async (_owner, _id, _revision, _writer, encounter) => {
        cloudBoard = structuredClone(encounter)
        return { status: 'saved', id: 'cloud-row', revision: ++revision, leaseToken: 'writer-a' }
      })
    const owner = authState({ user: { id: 'owner-a' } as User })
    const mount = () =>
      render(
        <AuthContext.Provider value={owner}>
          <App />
        </AuthContext.Provider>,
      )
    const app = mount()
    await screen.findByRole('dialog', { name: 'Choose a board copy' })
    fireEvent.click(
      screen.getByRole('button', {
        name: choice === 'device' ? 'Use device copy' : 'Use cloud copy',
      }),
    )
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Choose a board copy' })).toBeNull(),
    )
    expect(loadAuthRecovery().status).toBe('empty')
    expect(sessionStorage.getItem('openfray:session')).toBeNull()
    expect(sessionStorage.getItem('openfray:session:previous')).toBeNull()
    expect(archive).toMatchObject({
      unresolved: false,
      device: { snapshot: anonymous },
      cloud: { snapshot: remote },
    })
    await waitFor(() =>
      expect(loadOwnerSession('owner-a').snapshot?.encounter.encounterId).toBe(
        choice === 'device' ? anonymous.encounter.encounterId : remote.encounter.encounterId,
      ),
    )
    await screen.findByRole('button', { name: 'Saved' })
    if (!online) {
      connected = false
      act(() => window.dispatchEvent(new Event('offline')))
    }
    addGuard()
    await waitFor(() =>
      expect(device?.snapshot.encounter.combatants.map(nameOf)).toContain('Latest guard'),
    )
    if (online)
      await waitFor(() => expect(cloudBoard.combatants.map(nameOf)).toContain('Latest guard'))
    await waitFor(() =>
      expect(loadOwnerSession('owner-a').snapshot?.encounter.combatants.map(nameOf)).toContain(
        'Latest guard',
      ),
    )
    const expected = device!.snapshot.encounter
    expect(loadOwnerSession('owner-a').snapshot?.encounter.combatants.map(nameOf)).toEqual(
      expected.combatants.map(nameOf),
    )
    if (online) expect(device!.lineage?.cloudStateHash).toBe(await encounterHash(expected))
    const archivedBytes = JSON.stringify(archive)
    const writes = cloudWrite.mock.calls.length
    app.unmount()
    mount()
    await screen.findByRole('button', { name: 'Remove Latest guard' })
    expect(screen.queryByRole('dialog', { name: 'Choose a board copy' })).toBeNull()
    expect(
      screen.getByRole('button', {
        name: choice === 'device' ? 'Remove Anonymous guard' : 'Remove Cloud guard',
      }),
    ).toBeInTheDocument()
    expect(JSON.stringify(archive)).toBe(archivedBytes)
    if (!online) expect(cloudWrite).toHaveBeenCalledTimes(writes)
  },
)

it.each(['archive', 'selection', 'partial clear', 'handoff readback'] as const)(
  'keeps explicit resolution pending and all recovery branches when %s fails',
  async (failure) => {
    saveSettings({ tutorialSuppression: 'dismissed' })
    const anonymous = recoverySnapshot('pending-anonymous')
    anonymous.encounter.combatants = [pc({ name: 'Anonymous guard' })]
    saveSession(recoverySnapshot('previous-anonymous'))
    saveSession(anonymous)
    saveAuthRecovery(anonymous)
    const remote = recoverySnapshot('pending-cloud')
    remote.encounter.combatants = [pc({ name: 'Cloud guard' })]
    vi.spyOn(IndexedDbRecovery.prototype, 'loadLatest').mockResolvedValue(null)
    vi.spyOn(IndexedDbRecovery.prototype, 'load').mockResolvedValue(null)
    vi.spyOn(IndexedDbRecovery.prototype, 'loadConflict').mockResolvedValue(null)
    let archived: ReconciliationConflict | null = null
    const archive = vi
      .spyOn(IndexedDbRecovery.prototype, 'archiveConflict')
      .mockImplementation(async (_owner, value) => {
        if (failure === 'archive') return { status: 'failed', reason: 'unavailable' }
        archived = structuredClone(value)
        return { status: 'saved' }
      })
    const save = vi
      .spyOn(IndexedDbRecovery.prototype, 'save')
      .mockResolvedValue(
        failure === 'selection' ? { status: 'failed', reason: 'unavailable' } : { status: 'saved' },
      )
    vi.spyOn(IndexedDbRecovery.prototype, 'markSynced').mockResolvedValue({ status: 'saved' })
    vi.spyOn(cloud, 'loadCloudEncounter').mockResolvedValue({
      status: 'loaded',
      id: 'cloud-row',
      encounter: remote.encounter,
      revision: 8,
      updatedAt: new Date().toISOString(),
      playerCode: null,
    })
    vi.spyOn(cloud, 'acquireCloudWriter').mockResolvedValue({
      status: 'acquired',
      revision: 8,
      leaseToken: 'writer-a',
    })
    const cloudWrite = vi.spyOn(cloud, 'saveCloudEncounter').mockResolvedValue({ status: 'failed' })
    render(
      <AuthContext.Provider value={authState({ user: { id: 'owner-a' } as User })}>
        <App />
      </AuthContext.Provider>,
    )
    await screen.findByRole('dialog', { name: 'Choose a board copy' })
    const before = ['openfray:session', 'openfray:session:previous', 'openfray:auth-recovery'].map(
      (key) => sessionStorage.getItem(key),
    )
    const remove = Storage.prototype.removeItem
    if (failure === 'partial clear' || failure === 'handoff readback')
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (this: Storage, key) {
        if (
          key ===
          (failure === 'partial clear' ? 'openfray:session:previous' : 'openfray:auth-recovery')
        )
          return
        remove.call(this, key)
      })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Use cloud copy' }))
    })
    await waitFor(() => expect(archive).toHaveBeenCalled())
    expect(screen.getByRole('dialog', { name: 'Choose a board copy' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove Anonymous guard' })).toBeInTheDocument()
    expect(loadSession().snapshot?.encounter.combatants.map(nameOf)).toEqual(['Anonymous guard'])
    expect(loadAuthRecovery().snapshot?.encounter.combatants.map(nameOf)).toEqual([
      'Anonymous guard',
    ])
    expect(sessionStorage.getItem('openfray:session:previous')).not.toBeNull()
    expect(before.every((raw) => raw !== null)).toBe(true)
    expect(cloudWrite).not.toHaveBeenCalled()
    if (failure === 'archive') expect(save).not.toHaveBeenCalled()
    else
      expect(archived).toMatchObject({
        device: { snapshot: anonymous },
        cloud: { snapshot: remote },
      })
  },
)
