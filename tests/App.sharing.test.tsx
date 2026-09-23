// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from '../src/App.tsx'
import { emptyEncounter } from '../src/state/encounter.ts'

const mocks = vi.hoisted(() => ({
  broadcast: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  resume: vi.fn(),
  writable: true,
  ownerId: 'owner' as string | null,
  authLoading: false,
  identify: vi.fn(),
}))

vi.mock('../src/auth/useAuth.ts', () => ({
  useAuth: () => ({
    user: mocks.ownerId ? { id: mocks.ownerId } : null,
    loading: mocks.authLoading,
    identityExpired: false,
  }),
}))
vi.mock('../src/state/playerChannel.ts', () => ({
  useBoardBroadcast: mocks.broadcast,
  playerViewAvailable: () => true,
}))
vi.mock('../src/state/liveViewAuthority.ts', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  startLiveView: mocks.start,
  stopLiveView: mocks.stop,
  resumeLiveView: mocks.resume,
}))
vi.mock('../src/state/cloudEncounter.ts', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  claimPlayerCode: async () => 'ok',
}))
vi.mock('../src/state/encounterLifecycle.ts', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  createBrowserEncounterLifecycle: () => ({
    saveStatus: () => ({ kind: 'saved' }),
    subscribe: () => () => {},
    identify: mocks.identify,
    commit: async () => {},
    conflict: () => null,
    ensureCloudEncounter: async () => 'encounter',
    writableEncounter: () => (mocks.writable ? { ownerId: 'owner', id: 'encounter' } : null),
  }),
}))

const active = {
  status: 'ok' as const,
  capability: 'a'.repeat(43),
  capabilityHash: 'b'.repeat(64),
  generation: 1,
}

beforeEach(() => {
  mocks.writable = true
  mocks.ownerId = 'owner'
  mocks.authLoading = false
  mocks.identify.mockReset().mockResolvedValue({
    ownerId: 'owner',
    snapshot: { encounter: emptyEncounter(), theme: 'dark', view: 'encounter', selectedId: null },
    playerCode: 'test-table',
  })
  mocks.broadcast.mockClear()
  mocks.start.mockReset().mockResolvedValue(active)
  mocks.stop.mockReset().mockResolvedValue(true)
  mocks.resume.mockReset().mockResolvedValue(active)
})
afterEach(() => {
  cleanup()
  sessionStorage.clear()
  localStorage.clear()
})

/** Start sharing through the real app controls after encounter restoration. */
async function share() {
  fireEvent.click(screen.getByRole('button', { name: 'Share with players' }))
  await act(() => Promise.resolve())
  fireEvent.click(screen.getByRole('button', { name: 'Start sharing' }))
  await screen.findByRole('button', { name: 'Stop sharing' })
}

it('resumes publication after a document remount without rotating the player URL', async () => {
  const first = render(<App />)
  await share()
  const href = screen
    .getByRole('link', { name: 'Open the player view in a new tab' })
    .getAttribute('href')
  first.unmount()
  mocks.broadcast.mockClear()

  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Share with players' }))
  await screen.findByRole('button', { name: 'Stop sharing' })
  expect(
    screen.getByRole('link', { name: 'Open the player view in a new tab' }).getAttribute('href'),
  ).toBe(href)
  expect(mocks.start).toHaveBeenCalledTimes(1)
  expect(
    mocks.broadcast.mock.calls.some(([session]) => session?.capability === active.capability),
  ).toBe(true)
})

it('does not resume after the GM explicitly stops sharing', async () => {
  const first = render(<App />)
  await share()
  fireEvent.click(screen.getByRole('button', { name: 'Stop sharing' }))
  await screen.findByRole('button', { name: 'Start sharing' })
  first.unmount()
  render(<App />)
  await act(() => Promise.resolve())
  expect(mocks.resume).not.toHaveBeenCalled()
  expect(mocks.broadcast.mock.calls.at(-1)?.[0]).toBeNull()
})

it.each(['read-only', 'revoked', 'other owner'] as const)(
  'does not republish a %s session after reload',
  async (reason) => {
    const first = render(<App />)
    await share()
    first.unmount()
    mocks.broadcast.mockClear()
    if (reason === 'read-only') mocks.writable = false
    if (reason === 'revoked') mocks.resume.mockResolvedValue({ status: 'unauthorized' })
    if (reason === 'other owner') mocks.ownerId = 'other'
    render(<App />)
    await act(() => Promise.resolve())
    expect(mocks.broadcast.mock.calls.every(([session]) => session === null)).toBe(true)
    expect(mocks.start).toHaveBeenCalledTimes(1)
    if (reason === 'revoked') expect(sessionStorage.getItem('openfray:live-view')).toBeNull()
    else expect(mocks.resume).not.toHaveBeenCalled()
  },
)

it('waits for authentication and encounter recovery before checking the stored authority', async () => {
  const first = render(<App />)
  await share()
  first.unmount()
  mocks.authLoading = true
  const next = render(<App />)
  await act(() => Promise.resolve())
  expect(mocks.resume).not.toHaveBeenCalled()
  mocks.authLoading = false
  next.rerender(<App />)
  await waitFor(() => expect(mocks.resume).toHaveBeenCalledOnce())
})

it('ignores a delayed resume result after the GM starts a replacement session', async () => {
  const first = render(<App />)
  await share()
  first.unmount()
  let resolve!: (value: typeof active) => void
  mocks.resume.mockReturnValue(
    new Promise((done) => {
      resolve = done
    }),
  )
  render(<App />)
  await waitFor(() => expect(mocks.resume).toHaveBeenCalledOnce())
  const replacement = { ...active, capability: 'c'.repeat(43), generation: 2 }
  mocks.start.mockResolvedValue(replacement)
  await share()
  await act(() => resolve(active))
  expect(mocks.broadcast.mock.calls.at(-1)?.[0]?.capability).toBe(replacement.capability)
})
