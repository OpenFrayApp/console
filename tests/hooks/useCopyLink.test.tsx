// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useCopyLink } from '../../src/hooks/useCopyLink.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

/** Swap the clipboard for one that answers `result`. */
const stubClipboard = (result: Promise<void>) => {
  const writeText = vi.fn().mockReturnValue(result)
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
  return writeText
}

/** A minimal copy control: one button per key, the flag and the failure on screen. */
function CopyButton({
  url,
  copyKey,
  onFail,
}: {
  url: string
  copyKey?: string
  onFail?: (message: string) => void
}) {
  const { copied, error, copy } = useCopyLink(onFail)
  return (
    <div>
      <button onClick={() => copy(url, copyKey)}>{copied ? `Copied ${copied}` : 'Copy'}</button>
      {error && <p>{error}</p>}
    </div>
  )
}

describe('useCopyLink', () => {
  it('marks a successful copy, and lets it go after two seconds', async () => {
    vi.useFakeTimers()
    const writeText = stubClipboard(Promise.resolve())
    render(<CopyButton url="https://openfray.app/s/abc" />)
    fireEvent.click(screen.getByText('Copy'))
    // Let the clipboard promise settle; the timers stay frozen.
    await act(async () => {})
    expect(writeText).toHaveBeenCalledWith('https://openfray.app/s/abc')
    expect(screen.getByText('Copied https://openfray.app/s/abc')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1999))
    expect(screen.getByText(/Copied/)).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByText('Copy')).toBeInTheDocument()
  })

  it('marks the given key rather than the URL, for a page of rows', async () => {
    stubClipboard(Promise.resolve())
    render(<CopyButton url="https://openfray.app/s/abc" copyKey="abc" />)
    fireEvent.click(screen.getByText('Copy'))
    expect(await screen.findByText('Copied abc')).toBeInTheDocument()
  })

  it('surfaces the failure sentence instead of claiming it copied', async () => {
    stubClipboard(Promise.reject(new Error('denied')))
    render(<CopyButton url="https://openfray.app/s/abc" />)
    fireEvent.click(screen.getByText('Copy'))
    await screen.findByText('Couldn’t copy. Select the link and copy it yourself.')
    expect(screen.queryByText(/Copied/)).toBeNull()
  })

  it('hands the failure to onFail when the caller keeps its own message slot', async () => {
    stubClipboard(Promise.reject(new Error('denied')))
    const onFail = vi.fn()
    render(<CopyButton url="https://openfray.app/s/abc" onFail={onFail} />)
    fireEvent.click(screen.getByText('Copy'))
    await act(async () => {})
    expect(onFail).toHaveBeenCalledWith('Couldn’t copy. Select the link and copy it yourself.')
    // The sentence went to the caller, not to the hook's own error.
    expect(screen.queryByText(/Couldn’t copy/)).toBeNull()
  })

  it('drops the pending reset on unmount', async () => {
    vi.useFakeTimers()
    stubClipboard(Promise.resolve())
    const { unmount } = render(<CopyButton url="https://openfray.app/s/abc" />)
    fireEvent.click(screen.getByText('Copy'))
    await act(async () => {})
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
