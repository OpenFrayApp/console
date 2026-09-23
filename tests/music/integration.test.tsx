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
  vi.restoreAllMocks()
})

/** Put one quick-add foe on the board. */
function addFoe(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Quick add' }))
  fireEvent.change(screen.getByLabelText('Quick add name'), { target: { value: 'Bandit' } })
  fireEvent.change(screen.getByLabelText('Max HP'), { target: { value: '10' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
}

/** Confirm the initiative prompt and begin combat. */
function startCombat(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Begin' }))
  fireEvent.click(screen.getByRole('button', { name: 'Start combat' }))
}

/** Reduce the selected foe to 0 hit points through the stat-block editor. */
function defeatFoe(container: HTMLElement): void {
  const statBlock = container.querySelectorAll('section')[1]
  fireEvent.click(statBlock.querySelector('button[title^="Set hit points"]') as HTMLElement)
  const input = statBlock.querySelector('input.w-14') as HTMLInputElement
  fireEvent.change(input, { target: { value: '0' } })
  fireEvent.keyDown(input, { key: 'Enter' })
}

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

  it('starts, pauses, and resumes music with combat while respecting a manual pause', async () => {
    render(<App />)
    await waitFor(() => expect(FakeAudio.instances).toHaveLength(1))
    const audio = FakeAudio.instances[0]
    addFoe()
    fireEvent.change(screen.getByLabelText('Music track'), { target: { value: 'ancient-god' } })

    startCombat()
    await waitFor(() => expect(audio.play).toHaveBeenCalledOnce())
    audio.dispatchEvent(new Event('playing'))
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(audio.pause).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    await waitFor(() => expect(audio.play).toHaveBeenCalledTimes(2))

    audio.dispatchEvent(new Event('playing'))
    fireEvent.click(screen.getByRole('button', { name: 'Pause music' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    await Promise.resolve()
    expect(audio.play).toHaveBeenCalledTimes(2)
  })

  it('keeps music playing through a combat pause when configured', async () => {
    localStorage.setItem('openfray-settings', JSON.stringify({ pauseMusicWithCombat: false }))
    render(<App />)
    await waitFor(() => expect(FakeAudio.instances).toHaveLength(1))
    const audio = FakeAudio.instances[0]
    addFoe()
    fireEvent.change(screen.getByLabelText('Music track'), { target: { value: 'ancient-god' } })
    startCombat()
    await waitFor(() => expect(audio.play).toHaveBeenCalledOnce())
    audio.dispatchEvent(new Event('playing'))

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))

    expect(audio.pause).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Pause music' })).toBeInTheDocument()
  })

  it('does not let rejected playback block combat', async () => {
    render(<App />)
    await waitFor(() => expect(FakeAudio.instances).toHaveLength(1))
    const audio = FakeAudio.instances[0]
    audio.play.mockRejectedValueOnce(new Error('gesture required'))
    addFoe()
    fireEvent.change(screen.getByLabelText('Music track'), { target: { value: 'ancient-god' } })

    startCombat()

    expect(screen.getByRole('heading', { name: /Round 1/ })).toBeInTheDocument()
    expect(
      await screen.findByText('Playback was blocked. Press Play to try again.'),
    ).toBeInTheDocument()
  })

  it('changes nothing when ending combat is canceled', async () => {
    const { container } = render(<App />)
    await waitFor(() => expect(FakeAudio.instances).toHaveLength(1))
    const audio = FakeAudio.instances[0]
    addFoe()
    fireEvent.change(screen.getByLabelText('Music track'), { target: { value: 'ancient-god' } })
    startCombat()
    await waitFor(() => expect(audio.play).toHaveBeenCalledOnce())
    audio.dispatchEvent(new Event('playing'))
    audio.currentTime = 42
    defeatFoe(container)

    fireEvent.click(await screen.findByRole('button', { name: 'Keep fighting' }))

    expect(audio.pause).not.toHaveBeenCalled()
    expect(audio.currentTime).toBe(42)
    expect(screen.getByRole('button', { name: 'Pause music' })).toBeInTheDocument()
  })

  it('stops and rewinds music when ending combat is confirmed', async () => {
    const { container } = render(<App />)
    await waitFor(() => expect(FakeAudio.instances).toHaveLength(1))
    const audio = FakeAudio.instances[0]
    addFoe()
    fireEvent.change(screen.getByLabelText('Music track'), { target: { value: 'ancient-god' } })
    startCombat()
    await waitFor(() => expect(audio.play).toHaveBeenCalledOnce())
    audio.dispatchEvent(new Event('playing'))
    audio.currentTime = 42
    defeatFoe(container)

    fireEvent.click(await screen.findByRole('button', { name: 'End combat' }))

    expect(audio.pause).toHaveBeenCalledOnce()
    expect(audio.currentTime).toBe(0)
    expect(screen.getByRole('button', { name: 'Play music' })).toBeInTheDocument()
  })

  it('stops music and clears its selection with the board', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App />)
    await waitFor(() => expect(FakeAudio.instances).toHaveLength(1))
    const audio = FakeAudio.instances[0]
    addFoe()
    fireEvent.change(screen.getByLabelText('Music track'), { target: { value: 'ancient-god' } })
    fireEvent.click(screen.getByRole('button', { name: 'Play music' }))
    audio.dispatchEvent(new Event('playing'))
    audio.currentTime = 42

    fireEvent.click(screen.getByRole('button', { name: 'Remove everyone and clear the log' }))

    expect(audio.pause).toHaveBeenCalled()
    expect(audio.currentTime).toBe(0)
    expect(screen.getByLabelText('Music track')).toHaveValue('')
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
