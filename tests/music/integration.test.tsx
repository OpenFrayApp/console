// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone
// @vitest-environment jsdom

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { encodeSession } from '../../src/codecs/session.ts'
import { recoverySnapshot } from '../fixtures/sessionSnapshot.ts'

class FakeAudio extends EventTarget {
  static instances: FakeAudio[] = []
  src = ''
  loop = false
  preload = ''
  volume = 1
  currentTime = 0
  play = vi.fn(async () => {})
  pause = vi.fn()
  load = vi.fn()

  /** Capture each application-level media element for integration assertions. */
  constructor() {
    super()
    FakeAudio.instances.push(this)
  }

  /** Match the source release behavior used by a native audio element. */
  removeAttribute(name: string) {
    if (name === 'src') this.src = ''
  }
}

vi.stubGlobal('Audio', FakeAudio)

let App: typeof import('../../src/App.tsx').default

beforeAll(async () => {
  ;({ default: App } = await import('../../src/App.tsx'))
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  sessionStorage.clear()
  FakeAudio.instances.length = 0
})

describe('application music player', () => {
  it('persists the selected track without persisting playback state', async () => {
    render(<App />)
    await screen.findByRole('button', { name: 'Sign in to resume saving' })

    fireEvent.change(screen.getByLabelText('Music track'), { target: { value: 'ancient-god' } })
    await act(() => Promise.resolve())

    const stored = sessionStorage.getItem('openfray:session') ?? ''
    expect(stored).toContain('"musicTrackId":"ancient-god"')
    expect(stored).not.toContain('musicPlaying')
    expect(stored).not.toContain('musicPosition')
  })

  it('clears a restored catalog ID that is no longer available', async () => {
    const saved = recoverySnapshot()
    saved.encounter.musicTrackId = 'removed-track'
    const encoded = encodeSession(saved)
    expect(encoded.status).toBe('ok')
    if (encoded.status !== 'ok') return
    sessionStorage.setItem('openfray:session', encoded.serialized)

    render(<App />)

    expect(
      await screen.findByText('That track is unavailable. Choose another track or try again.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Music track')).toHaveValue('')
    await waitFor(() =>
      expect(sessionStorage.getItem('openfray:session')).not.toContain('removed-track'),
    )
  })

  it('keeps playing while the Game Master visits the compendium', async () => {
    render(<App />)
    await waitFor(() => expect(FakeAudio.instances).toHaveLength(1))
    const audio = FakeAudio.instances[0]

    fireEvent.change(screen.getByLabelText('Music track'), { target: { value: 'ancient-god' } })
    fireEvent.click(screen.getByRole('button', { name: 'Play music' }))
    expect(audio.src).toBe('/console/music/ancient-god')
    audio.dispatchEvent(new Event('playing'))
    expect(screen.getByRole('button', { name: 'Pause music' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Show the compendium' }))
    expect(screen.getByRole('button', { name: 'Show the encounter' })).toBeInTheDocument()
    expect(audio.pause).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Show the encounter' }))
    expect(screen.getByRole('button', { name: 'Pause music' })).toBeInTheDocument()
  })
})
