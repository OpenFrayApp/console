// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import App from '../src/App.tsx'
import { AuthContext } from '../src/auth/useAuth.ts'
import * as cloudEncounter from '../src/state/cloudEncounter.ts'
import { IndexedDbRecovery } from '../src/state/indexedDbRecovery.ts'
import { saveSession } from '../src/state/persistence.ts'
import { recoverySnapshot } from './fixtures/sessionSnapshot.ts'
import { authState, pc } from './fixtures.ts'

const owner = { id: 'tutorial-owner' } as User

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  localStorage.clear()
  vi.restoreAllMocks()
})

/** Delay an external adapter without replacing encounter or lifecycle transitions. */
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

it('waits for actual device recovery and never invites over a recovered board', async () => {
  const recovery = recoverySnapshot('recovered')
  recovery.encounter.combatants = [pc({ name: 'Recovered character' })]
  saveSession(recovery)
  const device = deferred<null>()
  vi.spyOn(IndexedDbRecovery.prototype, 'loadLatest').mockReturnValue(device.promise)
  render(<App />)
  await act(() => Promise.resolve())
  expect(screen.queryByRole('dialog', { name: 'Learn the console' })).toBeNull()
  await act(async () => {
    device.resolve(null)
  })
  expect(
    await screen.findByRole('button', { name: 'Remove Recovered character' }),
  ).toBeInTheDocument()
  expect(screen.queryByRole('dialog', { name: 'Learn the console' })).toBeNull()
  expect(sessionStorage.getItem('openfray:session')).toContain('Recovered character')
})

it('waits for signed-in cloud reconciliation before inviting on an empty board', async () => {
  const cloud = deferred<cloudEncounter.LoadedEncounter>()
  vi.spyOn(cloudEncounter, 'loadCloudEncounter').mockReturnValue(cloud.promise)
  render(
    <AuthContext.Provider value={authState({ user: owner })}>
      <App />
    </AuthContext.Provider>,
  )
  await act(() => Promise.resolve())
  expect(screen.queryByRole('dialog', { name: 'Learn the console' })).toBeNull()
  await act(async () => {
    cloud.resolve({ status: 'empty' })
  })
  await screen.findByRole('dialog', { name: 'Learn the console' })
  fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
  expect(screen.getByText(/Nobody is on the board yet/)).toBeInTheDocument()
})

it('does not use historic board readiness while another identity reconciles', async () => {
  const initial = recoverySnapshot('initial')
  initial.encounter.combatants = [pc({ name: 'First owner character' })]
  const next = deferred<cloudEncounter.LoadedEncounter>()
  vi.spyOn(cloudEncounter, 'loadCloudEncounter')
    .mockResolvedValueOnce({
      status: 'loaded',
      id: 'initial',
      encounter: initial.encounter,
      playerCode: null,
      revision: null,
      updatedAt: '2026-09-02T10:00:00Z',
    })
    .mockReturnValueOnce(next.promise)
  const app = render(
    <AuthContext.Provider value={authState({ user: owner })}>
      <App />
    </AuthContext.Provider>,
  )
  await screen.findByRole('button', { name: 'Remove First owner character' })
  expect(screen.queryByRole('dialog', { name: 'Learn the console' })).toBeNull()
  app.rerender(
    <AuthContext.Provider value={authState({ user: { id: 'next-owner' } as User })}>
      <App />
    </AuthContext.Provider>,
  )
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  fireEvent.click(screen.getByRole('button', { name: 'Remove everyone and clear the log' }))
  await act(() => Promise.resolve())
  expect(screen.getByText(/Nobody is on the board yet/)).toBeInTheDocument()
  expect(screen.queryByRole('dialog', { name: 'Learn the console' })).toBeNull()
  await act(async () => {
    next.resolve({ status: 'empty' })
  })
  await screen.findByRole('dialog', { name: 'Learn the console' })
})

it('gives a reconciliation decision priority over a pending manual entry explanation', async () => {
  const recovery = recoverySnapshot('device')
  const device = { ownerId: owner.id, snapshot: recovery, savedAt: '2026-09-02T10:00:00Z' }
  vi.spyOn(IndexedDbRecovery.prototype, 'loadLatest').mockResolvedValue(device)
  vi.spyOn(IndexedDbRecovery.prototype, 'load').mockResolvedValue(device)
  vi.spyOn(IndexedDbRecovery.prototype, 'loadConflict').mockResolvedValue(null)
  vi.spyOn(IndexedDbRecovery.prototype, 'save').mockResolvedValue({ status: 'saved' })
  const pendingCloud = deferred<cloudEncounter.LoadedEncounter>()
  vi.spyOn(cloudEncounter, 'loadCloudEncounter').mockReturnValue(pendingCloud.promise)
  render(
    <AuthContext.Provider value={authState({ user: owner })}>
      <App />
    </AuthContext.Provider>,
  )
  await act(() => Promise.resolve())
  fireEvent.click(screen.getByRole('button', { name: 'Search references' }))
  fireEvent.click(screen.getByRole('option', { name: 'Start tutorial' }))
  expect(screen.getByText(/Wait for identity and working-board recovery/)).toBeInTheDocument()
  await act(async () =>
    pendingCloud.resolve({
      status: 'loaded',
      id: 'cloud',
      encounter: recoverySnapshot('cloud').encounter,
      playerCode: null,
      revision: null,
      updatedAt: '2026-09-02T10:01:00Z',
    }),
  )
  await screen.findByRole('dialog', { name: 'Choose a board copy' })
  expect(screen.queryByRole('dialog', { name: 'Before starting the tutorial' })).toBeNull()
  expect(screen.queryByRole('dialog', { name: 'Learn the console' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  await act(() => Promise.resolve())
  expect(screen.queryByRole('dialog', { name: 'Learn the console' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Copies need attention' }))
  fireEvent.click(screen.getByRole('button', { name: 'Resolve copies' }))
  expect(screen.getByRole('dialog', { name: 'Choose a board copy' })).toBeInTheDocument()
})
