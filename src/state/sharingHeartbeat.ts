// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

export const SHARING_HEARTBEAT_MS = 10_000

/** Schedule board heartbeats outside the tab's throttled timers until sharing ends. */
export function startSharingHeartbeat(tick: () => void): () => void {
  let stopped = false
  let worker: Worker | undefined
  let timer: ReturnType<typeof setInterval> | undefined

  /** Keep sharing available when workers are unsupported or blocked by browser policy. */
  const fallback = () => {
    if (stopped || timer !== undefined) return
    timer = setInterval(tick, SHARING_HEARTBEAT_MS)
  }

  try {
    worker = new Worker(new URL('./sharingHeartbeat.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = (event: MessageEvent) => {
      if (!stopped && event.data === 'tick') tick()
    }
    worker.onerror = (event) => {
      event.preventDefault()
      if (worker) {
        worker.onmessage = null
        worker.onerror = null
        worker.terminate()
        worker = undefined
      }
      fallback()
    }
    worker.postMessage(SHARING_HEARTBEAT_MS)
  } catch {
    worker?.terminate()
    worker = undefined
    fallback()
  }

  return () => {
    stopped = true
    clearInterval(timer)
    if (worker) {
      worker.onmessage = null
      worker.onerror = null
      worker.terminate()
      worker = undefined
    }
  }
}
