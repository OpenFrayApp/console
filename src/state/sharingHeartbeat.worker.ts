// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

let started = false

// Only timing crosses this boundary; the worker never receives board data or credentials.
globalThis.onmessage = (event: MessageEvent<unknown>) => {
  if (started || typeof event.data !== 'number' || !Number.isFinite(event.data) || event.data <= 0)
    return
  started = true
  setInterval(() => globalThis.postMessage('tick'), event.data)
}
