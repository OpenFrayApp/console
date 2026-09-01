// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installNavigationWarning } from '../../../src/state/encounterLifecycle.ts'
import { downloadRecoveryCopy } from '../../../src/state/recoveryDownload.ts'
import { RecoveryStatus } from '../../../src/components/shell/RecoveryStatus.tsx'

afterEach(() => vi.restoreAllMocks())

describe('RecoveryStatus', () => {
  it.each(['saving', 'saved', 'offline'] as const)('labels the %s durability state', (kind) => {
    render(<RecoveryStatus status={{ kind }} onRetry={vi.fn()} onDownload={vi.fn()} />)

    expect(
      screen.getByText({ saving: 'Saving', saved: 'Saved', offline: 'Offline' }[kind]),
    ).toBeVisible()
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

    expect(screen.getByText('Save failed')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Retry saving' }))
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

    expect(screen.getByText('Saving elsewhere')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Take over saving' }))
    expect(takeOver).toHaveBeenCalledOnce()
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
    expect(signIn).toHaveBeenCalledOnce()
  })
})
