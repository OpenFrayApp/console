// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SHARING_HEARTBEAT_MS, startSharingHeartbeat } from '../../src/state/sharingHeartbeat.ts'

class HeartbeatWorker {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  postMessage = vi.fn()
  terminate = vi.fn()
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('sharing heartbeat scheduler', () => {
  it('accepts only worker ticks, sends only an interval, and ignores queued ticks after stopping', () => {
    const worker = new HeartbeatWorker()
    const constructor = vi.fn(function () {
      return worker
    })
    vi.stubGlobal('Worker', constructor)
    const tick = vi.fn()
    const stop = startSharingHeartbeat(tick)
    expect(constructor).toHaveBeenCalledWith(expect.any(URL), { type: 'module' })
    expect(worker.postMessage).toHaveBeenCalledExactlyOnceWith(SHARING_HEARTBEAT_MS)
    const receive = worker.onmessage!
    receive(new MessageEvent('message', { data: 'unexpected' }))
    vi.advanceTimersByTime(60_000)
    expect(tick).not.toHaveBeenCalled()
    receive(new MessageEvent('message', { data: 'tick' }))
    expect(tick).toHaveBeenCalledOnce()
    stop()
    stop()
    receive(new MessageEvent('message', { data: 'tick' }))
    expect(tick).toHaveBeenCalledOnce()
    expect(worker.terminate).toHaveBeenCalledOnce()
    expect(worker.onmessage).toBeNull()
    expect(worker.onerror).toBeNull()
  })

  it.each(['unsupported', 'blocked', 'post-failed'])(
    'falls back when a worker is %s and clears the timer',
    (failure) => {
      const worker = new HeartbeatWorker()
      if (failure === 'post-failed')
        worker.postMessage.mockImplementation(() => {
          throw new Error('blocked')
        })
      vi.stubGlobal(
        'Worker',
        failure === 'unsupported'
          ? undefined
          : vi.fn(function () {
              if (failure === 'blocked') throw new Error('blocked')
              return worker
            }),
      )
      const tick = vi.fn()
      const stop = startSharingHeartbeat(tick)
      vi.advanceTimersByTime(SHARING_HEARTBEAT_MS * 3)
      expect(tick).toHaveBeenCalledTimes(3)
      stop()
      vi.advanceTimersByTime(SHARING_HEARTBEAT_MS)
      expect(tick).toHaveBeenCalledTimes(3)
      if (failure === 'post-failed') expect(worker.terminate).toHaveBeenCalledOnce()
    },
  )

  it('terminates a failed worker and starts exactly one fallback timer', () => {
    const worker = new HeartbeatWorker()
    vi.stubGlobal(
      'Worker',
      vi.fn(function () {
        return worker
      }),
    )
    const tick = vi.fn()
    const stop = startSharingHeartbeat(tick)
    const error = worker.onerror!
    const preventDefault = vi.fn()
    error({ preventDefault } as unknown as ErrorEvent)
    error({ preventDefault } as unknown as ErrorEvent)
    expect(worker.terminate).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(SHARING_HEARTBEAT_MS)
    expect(tick).toHaveBeenCalledOnce()
    stop()
    error({ preventDefault } as unknown as ErrorEvent)
    vi.advanceTimersByTime(SHARING_HEARTBEAT_MS)
    expect(tick).toHaveBeenCalledOnce()
  })
})
