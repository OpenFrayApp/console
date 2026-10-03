// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { expect, it, vi } from 'vitest'
import { startSharingHeartbeat } from '../../src/state/sharingHeartbeat.ts'

it('receives a real bundled worker tick while main-thread timers do not advance', async () => {
  vi.useFakeTimers()
  const tick = vi.fn()
  let stop: (() => void) | undefined
  try {
    await new Promise<void>((resolve) => {
      stop = startSharingHeartbeat(() => {
        tick()
        resolve()
      })
      expect(tick).not.toHaveBeenCalled()
    })
    expect(tick).toHaveBeenCalledOnce()
    stop!()
    vi.advanceTimersByTime(60_000)
    expect(tick).toHaveBeenCalledOnce()
  } finally {
    stop?.()
    vi.useRealTimers()
  }
}, 20_000)
