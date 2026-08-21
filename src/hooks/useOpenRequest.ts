// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useState } from 'react'

/**
 * React to a prop being bumped — the "open the already-mounted control from
 * outside" counters, and any other prop whose *change* is the event. The last
 * value seen lives in state; when `request` differs during a render, the new
 * value is recorded and `onBump(previous)` runs synchronously in that same
 * render — React's legal "adjusting state while rendering" pattern, where a
 * state set here makes React restart this component's render before touching
 * the DOM. A fresh mount never fires: the first value seen is where the
 * counting starts, so only a later bump acts.
 */
export function useOpenRequest<T>(request: T, onBump: (previous: T) => void): void {
  const [lastRequest, setLastRequest] = useState(request)
  if (request !== lastRequest) {
    setLastRequest(request)
    onBump(lastRequest)
  }
}
