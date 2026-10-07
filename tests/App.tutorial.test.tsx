// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import App from '../src/App.tsx'
import { AuthContext } from '../src/auth/useAuth.ts'
import { authState } from './fixtures.ts'
import { loadSettings, saveSettings } from '../src/state/settings.ts'

/** Use the real search destination to reach Settings. */
function openSettings() {
  fireEvent.click(screen.getByRole('button', { name: 'Search references' }))
  fireEvent.click(screen.getByRole('option', { name: 'Settings' }))
}

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  localStorage.clear()
  vi.restoreAllMocks()
})

it('offers manual entry from Settings without clearing a nonempty board or its recovery copy', async () => {
  saveSettings({ tutorialSuppression: 'completed' })
  render(<App />)
  await act(() => Promise.resolve())
  expect(screen.queryByRole('dialog', { name: 'Learn the console' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Quick add' }))
  fireEvent.change(screen.getByLabelText('Quick add name'), {
    target: { value: 'Keep this guard' },
  })
  fireEvent.change(screen.getByLabelText('Max HP'), { target: { value: '30' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  const recovery = sessionStorage.getItem('openfray:session')
  openSettings()
  fireEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))
  expect(screen.getByRole('dialog', { name: 'Before starting the tutorial' })).toBeInTheDocument()
  expect(screen.getByText(/clear the board through the normal controls/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Back to the console' }))
  expect(screen.getAllByText('Keep this guard').length).toBeGreaterThan(0)
  expect(sessionStorage.getItem('openfray:session')).toBe(recovery)
  expect(loadSettings().tutorialSuppression).toBe('completed')
})

it.each([
  { libraries: ['srd-5.1', 'srd-5.2'], label: 'Basic Rules 2024' },
  { libraries: ['srd-5.1'], label: 'Basic Rules 2014' },
])(
  'finds manual entry through search and uses $label without changing settings',
  async ({ libraries, label }) => {
    saveSettings({ tutorialSuppression: 'dismissed', enabledLibraries: libraries })
    render(<App />)
    await act(() => Promise.resolve())
    const settings = loadSettings()
    fireEvent.click(screen.getByRole('button', { name: 'Search references' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Search references' }), {
      target: { value: 'tutorial' },
    })
    fireEvent.click(await screen.findByRole('option', { name: 'Start tutorial' }))
    expect(screen.getByRole('dialog', { name: 'Tutorial introduction' })).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`Tutorial examples use ${label}`))).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Exit tutorial' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, another time' }))
    expect(screen.getByText(/Nobody is on the board yet/)).toBeInTheDocument()
    expect(loadSettings()).toEqual(settings)
  },
)

it('explains missing SRD libraries without enabling one', async () => {
  saveSettings({ tutorialSuppression: 'completed', enabledLibraries: ['kobold-press-tob3'] })
  render(<App />)
  await act(() => Promise.resolve())
  const settings = loadSettings()
  openSettings()
  fireEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))
  expect(
    screen.getByText(/Enable Basic Rules 2024 or Basic Rules 2014 in Settings/),
  ).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Back to the console' }))
  expect(screen.getByText(/Nobody is on the board yet/)).toBeInTheDocument()
  expect(loadSettings()).toEqual(settings)
})

it('postpones once for the session across rerenders, board clearing, and reload', async () => {
  const app = render(<App />)
  await screen.findByRole('dialog', { name: 'Learn the console' })
  fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
  app.rerender(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Quick add' }))
  fireEvent.change(screen.getByLabelText('Quick add name'), { target: { value: 'Practice guard' } })
  fireEvent.change(screen.getByLabelText('Max HP'), { target: { value: '30' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  fireEvent.click(screen.getByRole('button', { name: 'Remove everyone and clear the log' }))
  await act(() => Promise.resolve())
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByText(/Nobody is on the board yet/)).toBeInTheDocument()
  expect(loadSettings().tutorialSuppression).toBeNull()
  app.unmount()
  render(<App />)
  await act(() => Promise.resolve())
  expect(screen.queryByRole('dialog')).toBeNull()
  openSettings()
  fireEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))
  expect(screen.getByRole('dialog', { name: 'Tutorial introduction' })).toBeInTheDocument()
})

it('permanent exit survives a new session but still permits manual restart without completion', async () => {
  const app = render(<App />)
  await screen.findByRole('dialog', { name: 'Learn the console' })
  fireEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))
  fireEvent.click(screen.getByRole('button', { name: 'Exit tutorial' }))
  fireEvent.click(screen.getByRole('button', { name: 'Never show again' }))
  expect(loadSettings().tutorialSuppression).toBe('dismissed')
  expect(screen.getByText(/Nobody is on the board yet/)).toBeInTheDocument()
  app.unmount()
  sessionStorage.clear()
  render(<App />)
  await act(() => Promise.resolve())
  expect(screen.queryByRole('dialog')).toBeNull()
  openSettings()
  fireEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))
  expect(screen.getByRole('dialog', { name: 'Tutorial introduction' })).toBeInTheDocument()
  expect(screen.queryByText(/Tutorial complete/)).toBeNull()
})

it('reload removes the guide and every manual restart opens the introduction', async () => {
  const app = render(<App />)
  await screen.findByRole('dialog', { name: 'Learn the console' })
  fireEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))
  app.unmount()
  render(<App />)
  await act(() => Promise.resolve())
  expect(screen.queryByRole('dialog')).toBeNull()
  openSettings()
  fireEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))
  expect(screen.getByRole('dialog', { name: 'Tutorial introduction' })).toBeInTheDocument()
  expect(loadSettings().tutorialSuppression).toBeNull()
})

it('explains pending readiness on manual entry and does not turn it into a silent launch', async () => {
  const app = render(
    <AuthContext.Provider value={authState({ loading: true })}>
      <App />
    </AuthContext.Provider>,
  )
  openSettings()
  fireEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))
  expect(screen.getByText(/Wait for identity and working-board recovery/)).toBeInTheDocument()
  app.rerender(
    <AuthContext.Provider value={authState()}>
      <App />
    </AuthContext.Provider>,
  )
  await act(() => Promise.resolve())
  expect(screen.getByRole('dialog', { name: 'Before starting the tutorial' })).toBeInTheDocument()
  expect(screen.getByText(/Wait for identity and working-board recovery/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Back to the console' }))
  openSettings()
  fireEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))
  expect(screen.getByRole('dialog', { name: 'Tutorial introduction' })).toBeInTheDocument()
})

it('keeps console entry and exit usable when browser storage is unavailable', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('Blocked', 'SecurityError')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Blocked', 'SecurityError')
  })
  const app = render(<App />)
  await screen.findByRole('dialog', { name: 'Learn the console' })
  fireEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))
  fireEvent.click(screen.getByRole('button', { name: 'Exit tutorial' }))
  fireEvent.click(screen.getByRole('button', { name: 'Never show again' }))
  app.rerender(<App />)
  await act(() => Promise.resolve())
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByText(/Nobody is on the board yet/)).toBeInTheDocument()
  openSettings()
  fireEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))
  expect(screen.getByRole('dialog', { name: 'Tutorial introduction' })).toBeInTheDocument()
})

it('persists the welcome checkbox when postponing and permits manual launch', async () => {
  const app = render(<App />)
  await screen.findByRole('dialog', { name: 'Learn the console' })
  fireEvent.click(screen.getByRole('checkbox', { name: 'Never show this again' }))
  fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
  expect(loadSettings().tutorialSuppression).toBe('dismissed')
  app.unmount()
  sessionStorage.clear()
  render(<App />)
  await act(() => Promise.resolve())
  expect(screen.queryByRole('dialog')).toBeNull()
  openSettings()
  fireEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))
  expect(screen.getByRole('dialog', { name: 'Tutorial introduction' })).toBeInTheDocument()
})

it('lets the welcome checkbox be changed before postponing', async () => {
  render(<App />)
  await screen.findByRole('dialog', { name: 'Learn the console' })
  const checkbox = screen.getByRole('checkbox', { name: 'Never show this again' })
  fireEvent.click(checkbox)
  fireEvent.click(checkbox)
  fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
  expect(loadSettings().tutorialSuppression).toBeNull()
})

it('gives identity and recovery priority if readiness changes while the guide is open', async () => {
  const app = render(
    <AuthContext.Provider value={authState()}>
      <App />
    </AuthContext.Provider>,
  )
  await screen.findByRole('dialog', { name: 'Learn the console' })
  fireEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))
  app.rerender(
    <AuthContext.Provider value={authState({ loading: true })}>
      <App />
    </AuthContext.Provider>,
  )
  expect(screen.queryByRole('dialog', { name: 'Tutorial introduction' })).toBeNull()
  app.rerender(
    <AuthContext.Provider value={authState()}>
      <App />
    </AuthContext.Provider>,
  )
  await act(() => Promise.resolve())
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByText(/Nobody is on the board yet/)).toBeInTheDocument()
})

it('invites after identity resolves and opens an introductory guide without changing the board', async () => {
  const app = render(
    <AuthContext.Provider value={authState({ loading: true })}>
      <App />
    </AuthContext.Provider>,
  )
  expect(screen.queryByRole('dialog', { name: 'Learn the console' })).toBeNull()
  app.rerender(
    <AuthContext.Provider value={authState()}>
      <App />
    </AuthContext.Provider>,
  )
  await screen.findByRole('dialog', { name: 'Learn the console' })
  expect(screen.getByText(/about five minutes/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('checkbox', { name: 'Never show this again' }))
  fireEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))
  expect(loadSettings().tutorialSuppression).toBe('dismissed')
  expect(screen.getByRole('dialog', { name: 'Tutorial introduction' })).toBeInTheDocument()
  expect(screen.getByText(/Basic Rules 2024/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Exit tutorial' }))
  expect(screen.getByText('Offer the tutorial again another time?')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Return to tutorial' }))
  expect(screen.getByRole('dialog', { name: 'Tutorial introduction' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Exit tutorial' }))
  fireEvent.click(screen.getByRole('button', { name: 'Yes, another time' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByText(/Nobody is on the board yet/)).toBeInTheDocument()
  expect(loadSettings().tutorialSuppression).toBe('dismissed')
  expect(sessionStorage.getItem('openfray:session')).not.toContain('tutorial')
})
