// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { describe, expect, it, vi } from 'vitest'
import { createMusicController, type MusicAudio } from '../../src/music/player.ts'
import type { MusicTrack } from '../../src/music/catalog.ts'

const ancientGod: MusicTrack = {
  id: 'ancient-god',
  title: 'Ancient God',
  src: '/console/music/ancient-god.ogg',
}
const nextTrack: MusicTrack = {
  id: 'next-track',
  title: 'Next Track',
  src: '/console/music/next-track.ogg',
}

class FakeAudio implements MusicAudio {
  private source = ''
  srcAssignments = 0
  loop = false
  preload = ''
  volume = 1
  currentTime = 0
  play = vi.fn(() => Promise.resolve())
  pause = vi.fn()
  load = vi.fn()
  removeAttribute = vi.fn((name: string) => {
    if (name === 'src') this.source = ''
  })
  private listeners = new Map<string, Set<() => void>>()

  /** Read the fake's current media source. */
  get src() {
    return this.source
  }

  /** Record each source replacement the controller requests. */
  set src(value: string) {
    this.source = value
    this.srcAssignments += 1
  }

  /** Register one media event listener. */
  addEventListener(name: string, listener: () => void) {
    const listeners = this.listeners.get(name) ?? new Set()
    listeners.add(listener)
    this.listeners.set(name, listeners)
  }

  /** Remove one media event listener. */
  removeEventListener(name: string, listener: () => void) {
    this.listeners.get(name)?.delete(listener)
  }

  /** Dispatch one media event to the controller. */
  emit(name: string) {
    for (const listener of this.listeners.get(name) ?? []) listener()
  }
}

/** Build a controller around an observable fake media element. */
function setup(online: boolean | (() => boolean) = true) {
  const audio = new FakeAudio()
  const onPlayed = vi.fn()
  const controller = createMusicController({
    audio,
    tracks: [ancientGod, nextTrack],
    initialVolume: 0.7,
    isOnline: () => (typeof online === 'function' ? online() : online),
    onPlayed,
  })
  return { audio, controller, onPlayed }
}

describe('music controller', () => {
  it('queues a selection without loading or playing it', () => {
    const { audio, controller } = setup()

    controller.select('ancient-god')

    expect(controller.getSnapshot()).toMatchObject({ selectedId: 'ancient-god', status: 'queued' })
    expect(audio.src).toBe('')
    expect(audio.play).not.toHaveBeenCalled()
  })

  it('restores a catalog selection without restoring playback', () => {
    const { audio, controller } = setup()

    expect(controller.restore('ancient-god')).toBe(true)

    expect(controller.getSnapshot()).toMatchObject({ selectedId: 'ancient-god', status: 'queued' })
    expect(audio.src).toBe('')
    expect(audio.play).not.toHaveBeenCalled()
  })

  it('clears a missing restored selection and explains that it is unavailable', () => {
    const { audio, controller } = setup()

    expect(controller.restore('removed-track')).toBe(false)

    expect(controller.getSnapshot()).toMatchObject({
      selectedId: null,
      status: 'idle',
      error: 'unavailable',
    })
    expect(audio.play).not.toHaveBeenCalled()
  })

  it('plays the queued track on a continuous native loop', async () => {
    const { audio, controller, onPlayed } = setup()
    controller.select('ancient-god')

    await controller.play()
    expect(audio.src).toBe('/console/music/ancient-god.ogg')
    expect(audio.loop).toBe(true)
    expect(controller.getSnapshot().status).toBe('loading')

    audio.emit('playing')
    expect(controller.getSnapshot().status).toBe('playing')
    expect(onPlayed).toHaveBeenCalledOnce()
    expect(onPlayed).toHaveBeenCalledWith('ancient-god')
  })

  it('starts queued music for combat without restarting active playback', async () => {
    const { audio, controller } = setup()
    controller.select('ancient-god')

    controller.startCombat()
    await Promise.resolve()
    audio.emit('playing')
    controller.startCombat()
    await Promise.resolve()

    expect(audio.play).toHaveBeenCalledOnce()
    expect(controller.getSnapshot().status).toBe('playing')
  })

  it('starts combat silently when no track is selected', async () => {
    const { audio, controller } = setup()

    controller.startCombat()
    await Promise.resolve()

    expect(audio.play).not.toHaveBeenCalled()
  })

  it('resumes only music paused by combat', async () => {
    const { audio, controller } = setup()
    controller.select('ancient-god')
    controller.startCombat()
    await Promise.resolve()
    audio.emit('playing')

    controller.pauseForCombat()
    controller.resumeForCombat()
    await Promise.resolve()
    expect(audio.play).toHaveBeenCalledTimes(2)

    audio.emit('playing')
    controller.pause()
    controller.resumeForCombat()
    await Promise.resolve()
    expect(audio.play).toHaveBeenCalledTimes(2)
  })

  it('starts a new fight after a manual music pause', async () => {
    const { audio, controller } = setup()
    controller.select('ancient-god')
    await controller.play()
    audio.emit('playing')
    controller.pause()

    controller.startCombat()
    await Promise.resolve()

    expect(audio.play).toHaveBeenCalledTimes(2)
  })

  it('stops and rewinds music when combat ends', async () => {
    const { audio, controller } = setup()
    controller.select('ancient-god')
    await controller.play()
    audio.emit('playing')
    audio.currentTime = 42

    controller.endCombat()

    expect(audio.pause).toHaveBeenCalledOnce()
    expect(audio.currentTime).toBe(0)
    expect(controller.getSnapshot()).toMatchObject({ selectedId: 'ancient-god', status: 'queued' })
  })

  it('clears the queued selection with the board', async () => {
    const { audio, controller } = setup()
    controller.select('ancient-god')
    await controller.play()
    audio.currentTime = 42

    controller.clearBoard()

    expect(audio.currentTime).toBe(0)
    expect(controller.getSnapshot()).toMatchObject({ selectedId: null, status: 'idle' })
  })

  it('pauses manually and leaves a later selection queued', async () => {
    const { audio, controller } = setup()
    controller.select('ancient-god')
    await controller.play()
    audio.emit('playing')

    controller.pause()
    controller.select('next-track')

    expect(audio.pause).toHaveBeenCalledOnce()
    expect(audio.play).toHaveBeenCalledOnce()
    expect(controller.getSnapshot()).toMatchObject({ selectedId: 'next-track', status: 'queued' })
  })

  it('resumes a paused track without replacing its loaded source', async () => {
    const { audio, controller } = setup()
    controller.select('ancient-god')
    await controller.play()
    audio.emit('playing')
    audio.currentTime = 42

    controller.pause()
    await controller.play()

    expect(audio.srcAssignments).toBe(1)
    expect(audio.currentTime).toBe(42)
    expect(audio.play).toHaveBeenCalledTimes(2)
  })

  it('switches tracks immediately while playing', async () => {
    const { audio, controller } = setup()
    controller.select('ancient-god')
    await controller.play()
    audio.emit('playing')

    controller.select('next-track')
    await Promise.resolve()

    expect(audio.src).toBe('/console/music/next-track.ogg')
    expect(audio.play).toHaveBeenCalledTimes(2)
    audio.emit('playing')
    expect(controller.getSnapshot()).toMatchObject({ selectedId: 'next-track', status: 'playing' })
  })

  it('stops the previous track when an offline switch cannot start the next one', async () => {
    let online = true
    const { audio, controller } = setup(() => online)
    controller.select('ancient-god')
    await controller.play()
    audio.emit('playing')

    online = false
    controller.select('next-track')

    expect(audio.pause).toHaveBeenCalledOnce()
    expect(controller.getSnapshot()).toMatchObject({
      selectedId: 'next-track',
      status: 'error',
      error: 'offline',
    })
  })

  it('applies a clamped volume without restarting playback', () => {
    const { audio, controller } = setup()

    controller.setVolume(1.4)
    expect(audio.volume).toBe(1)
    expect(controller.getSnapshot().volume).toBe(1)
    controller.setVolume(-0.2)
    expect(audio.volume).toBe(0)
    expect(audio.play).not.toHaveBeenCalled()
  })

  it('distinguishes offline, unavailable, and rejected playback', async () => {
    const offline = setup(false)
    offline.controller.select('ancient-god')
    await offline.controller.play()
    expect(offline.controller.getSnapshot()).toMatchObject({ status: 'error', error: 'offline' })

    const unavailable = setup()
    unavailable.controller.select('ancient-god')
    void unavailable.controller.play()
    unavailable.audio.emit('error')
    expect(unavailable.controller.getSnapshot()).toMatchObject({
      status: 'error',
      error: 'unavailable',
    })

    const rejected = setup()
    rejected.audio.play.mockRejectedValueOnce(new Error('gesture required'))
    rejected.controller.select('ancient-god')
    await rejected.controller.play()
    expect(rejected.controller.getSnapshot()).toMatchObject({ status: 'error', error: 'rejected' })
  })

  it('detaches and releases its media element on cleanup', async () => {
    const { audio, controller } = setup()
    controller.select('ancient-god')
    await controller.play()

    controller.destroy()
    audio.emit('playing')

    expect(audio.pause).toHaveBeenCalledOnce()
    expect(audio.removeAttribute).toHaveBeenCalledWith('src')
    expect(audio.load).toHaveBeenCalledOnce()
    expect(controller.getSnapshot().status).toBe('queued')
  })
})
