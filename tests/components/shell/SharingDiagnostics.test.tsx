// @vitest-environment jsdom
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { SharingDiagnostics } from '../../../src/components/shell/SharingDiagnostics.tsx'
import { clearSharingDiagnostics } from '../../../src/state/sharingDiagnostics.ts'

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

beforeEach(() => {
  history.replaceState(null, '', '/?sharingDiagnostics=1')
  clearSharingDiagnostics()
})

afterEach(() => {
  cleanup()
  history.replaceState(null, '', '/')
  clearSharingDiagnostics()
  vi.restoreAllMocks()
  if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard)
  else Reflect.deleteProperty(navigator, 'clipboard')
})

it('renders nothing without staging diagnostics opt-in', () => {
  history.replaceState(null, '', '/')
  const { container } = render(<SharingDiagnostics role="gm" />)
  expect(container.textContent).toBe('')
})

it('copies metadata and records visibility changes without encounter details', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
  render(<SharingDiagnostics role="gm" />)
  screen.getByText('Sharing diagnostics (staging)').closest('details')!.open = true
  fireEvent(document, new Event('visibilitychange'))
  fireEvent.click(screen.getByRole('button', { name: 'Copy diagnostics' }))
  await waitFor(() => expect(screen.getByText('Copied.')).toBeInTheDocument())
  const report = JSON.parse(writeText.mock.calls[0][0])
  expect(report.events.map((event: { event: string }) => event.event)).toEqual([
    'capture-started',
    'visibility-change',
  ])
  expect(screen.getByRole('textbox', { name: 'Sharing diagnostics report' })).toHaveValue(
    writeText.mock.calls[0][0],
  )
})

it('leaves selectable report text when iPad clipboard access fails', async () => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockRejectedValue(new Error('Clipboard denied')) },
  })
  render(<SharingDiagnostics role="player" />)
  screen.getByText('Sharing diagnostics (staging)').closest('details')!.open = true
  fireEvent.click(screen.getByRole('button', { name: 'Copy diagnostics' }))
  const text = await screen.findByRole('textbox', { name: 'Sharing diagnostics report' })
  expect(JSON.parse((text as HTMLTextAreaElement).value).events[0]).toMatchObject({
    event: 'capture-started',
    role: 'player',
  })
  expect(screen.queryByText('Copied.')).toBeNull()
})
