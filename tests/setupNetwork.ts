// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { afterEach } from 'vitest'
import { createTestNetwork } from './testNetwork.ts'

const network = createTestNetwork(globalThis.fetch)
// Assign the baseline directly so vi.unstubAllGlobals() restores the guard, not native fetch.
globalThis.fetch = network.fetch

afterEach(() => {
  const blocked = network.takeBlockedRequests()
  if (blocked.length) {
    throw new Error(`Unmocked external fetches were blocked:\n${blocked.join('\n')}`)
  }
})
