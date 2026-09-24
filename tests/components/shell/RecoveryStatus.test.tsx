// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installNavigationWarning } from '../../../src/state/encounterLifecycle.ts'
import { downloadRecoveryCopy } from '../../../src/state/recoveryDownload.ts'
import { RecoveryStatus } from '../../../src/components/shell/RecoveryStatus.tsx'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('RecoveryStatus', () => {
  it.each([
    ['saving', 'Saving', 'bg-amber-500'],
    ['saved', 'Saved', 'bg-emerald-500'],
    ['offline', 'Offline', 'bg-slate-400'],
    ['sign-in', 'Sign in to resume saving', 'bg-slate-400'],
    ['read-only', 'Saving elsewhere', 'bg-amber-500'],
    ['conflict', 'Copies need attention', 'bg-red-500'],
  ] as const)('shows only a colored dot for %s until hovered', (kind, label, color) => {
    render(<RecoveryStatus status={{ kind }} onRetry={vi.fn()} onDownload={vi.fn()} />)

    const dot = screen.getByRole('button', { name: label })
    expect(dot).toHaveTextContent('')
    expect(dot.firstElementChild).toHaveClass(color)
    expect(dot).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('status')).toHaveTextContent(label)
    expect(screen.queryByText(label, { selector: 'p' })).toBeNull()
    fireEvent.mouseEnter(dot)
    expect(screen.getByText(label, { selector: 'p' })).toBeVisible()
    fireEvent.mouseLeave(dot)
    expect(dot).toHaveAttribute('aria-expanded', 'false')
  })

  it('reveals the message on focus or tap and dismisses on Escape or outside press', () => {
    render(<RecoveryStatus status={{ kind: 'saved' }} onRetry={vi.fn()} onDownload={vi.fn()} />)
    const dot = screen.getByRole('button', { name: 'Saved' })
    fireEvent.focus(dot)
    expect(screen.getByText('Saved', { selector: 'p' })).toBeVisible()
    fireEvent.keyDown(dot, { key: 'Escape' })
    expect(dot).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(dot)
    expect(dot).toHaveAttribute('aria-expanded', 'true')
    fireEvent.pointerDown(document.body)
    expect(dot).toHaveAttribute('aria-expanded', 'false')
  })

  it('offers retry and recovery download without hiding the failed state', () => {
    const retry = vi.fn()
    const download = vi.fn()
    render(
      <RecoveryStatus
        status={{ kind: 'failed', reason: 'quota' }}
        onRetry={retry}
        onDownload={download}
      />,
    )

    const dot = screen.getByRole('button', { name: 'Save failed' })
    expect(dot.firstElementChild).toHaveClass('bg-red-500')
    expect(screen.queryByRole('button', { name: 'Retry saving' })).toBeNull()
    fireEvent.click(dot)
    expect(screen.getByText('Save failed', { selector: 'p' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Retry saving' }))
    expect(dot).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(dot)
    fireEvent.click(screen.getByRole('button', { name: 'Download recovery copy' }))
    expect(retry).toHaveBeenCalledOnce()
    expect(download).toHaveBeenCalledOnce()
  })

  it('downloads the exact recovery envelope with its recovery filename', async () => {
    const anchor = document.createElement('a')
    vi.spyOn(document, 'createElement').mockReturnValueOnce(anchor)
    vi.spyOn(anchor, 'click').mockImplementation(() => undefined)
    let downloaded: Blob | null = null
    const createObjectUrl = vi.fn((blob: Blob) => {
      downloaded = blob
      return 'blob:recovery'
    })
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectUrl })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })

    downloadRecoveryCopy({ filename: 'openfray-recovery.json', serialized: '{"version":3}' })

    expect(anchor.download).toBe('openfray-recovery.json')
    expect(anchor.href).toBe('blob:recovery')
    const content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.addEventListener('load', () => resolve(String(reader.result)), { once: true })
      reader.addEventListener('error', () => reject(reader.error), { once: true })
      reader.readAsText(downloaded!)
    })
    expect(content).toBe('{"version":3}')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:recovery')
  })

  it('protects navigation only while recovery is unsafe', () => {
    const removeWarning = installNavigationWarning()
    const unsafe = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(unsafe)
    expect(unsafe.defaultPrevented).toBe(true)

    removeWarning()
    const safe = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(safe)
    expect(safe.defaultPrevented).toBe(false)
  })

  it('offers explicit takeover while another client owns cloud saving', () => {
    const takeOver = vi.fn()
    render(
      <RecoveryStatus
        status={{ kind: 'read-only' }}
        onRetry={vi.fn()}
        onDownload={vi.fn()}
        onTakeOver={takeOver}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Saving elsewhere' }))
    expect(screen.getByText('Saving elsewhere', { selector: 'p' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Take over saving' }))
    expect(takeOver).toHaveBeenCalledOnce()
  })

  it('reopens copy resolution while divergence remains unresolved', () => {
    const resolve = vi.fn()
    render(
      <RecoveryStatus
        status={{ kind: 'conflict' }}
        onRetry={vi.fn()}
        onDownload={vi.fn()}
        onResolveCopies={resolve}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Copies need attention' }))
    fireEvent.click(screen.getByRole('button', { name: 'Resolve copies' }))
    expect(resolve).toHaveBeenCalledOnce()
  })

  it('opens sign-in from the anonymous durability state', () => {
    const signIn = vi.fn()
    render(
      <RecoveryStatus
        status={{ kind: 'sign-in' }}
        onRetry={vi.fn()}
        onDownload={vi.fn()}
        onSignIn={signIn}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Sign in to resume saving' }))
    expect(signIn).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(signIn).toHaveBeenCalledOnce()
  })
})
