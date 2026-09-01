// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  LIVE_VIEW_CAPABILITY_BYTES,
  hashLiveViewCapability,
  liveViewCapabilityFromHash,
  liveViewTopics,
  mintLiveViewCapability,
  startLiveView,
  stopLiveView,
} from '../../src/state/liveViewAuthority.ts'
import { makeSupabaseStub } from './supabaseMock.ts'

const supa = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('../../src/lib/supabase.ts', () => ({
  get supabase() {
    return supa.client
  },
}))

beforeEach(() => {
  supa.client = null
})

describe('live-view capabilities', () => {
  it('encodes all 256 random bits into a URL-safe capability', () => {
    const bytes = Uint8Array.from({ length: LIVE_VIEW_CAPABILITY_BYTES }, (_, index) => index)
    const capability = mintLiveViewCapability(bytes)

    expect(capability).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(mintLiveViewCapability(bytes)).toBe(capability)
    expect(() => mintLiveViewCapability(bytes.slice(1))).toThrow(RangeError)
  })

  it('keeps the raw capability and PIN out of Realtime topics', async () => {
    const capability = mintLiveViewCapability(new Uint8Array(LIVE_VIEW_CAPABILITY_BYTES).fill(7))
    const open = await liveViewTopics(capability, null)
    const locked = await liveViewTopics(capability, '0420')

    expect(open.lobby).toMatch(/^player:[a-f0-9]{64}:lobby$/)
    expect(open.board).toBe(open.lobby)
    expect(locked.board).toMatch(/^player:[a-f0-9]{64}:board:[a-f0-9]{64}$/)
    expect(JSON.stringify(locked)).not.toContain(capability)
    expect(JSON.stringify(locked)).not.toContain('0420')
  })

  it('reads only a complete capability from the URL fragment', () => {
    const capability = mintLiveViewCapability(new Uint8Array(LIVE_VIEW_CAPABILITY_BYTES).fill(9))

    expect(liveViewCapabilityFromHash(`#live=${capability}`)).toBe(capability)
    expect(liveViewCapabilityFromHash(`#other=x&live=${capability}`)).toBe(capability)
    expect(liveViewCapabilityFromHash('#live=short')).toBeNull()
    expect(liveViewCapabilityFromHash('')).toBeNull()
  })
})

describe('live-view authority adapter', () => {
  it('starts an owner session with only the capability hash and encounter id', async () => {
    const { client, rpcs } = makeSupabaseStub({ data: 3, error: null })
    supa.client = client
    const random = new Uint8Array(LIVE_VIEW_CAPABILITY_BYTES).fill(5)

    const result = await startLiveView('encounter-id', 'tuesday-game', random)

    expect(result).toMatchObject({ status: 'ok', generation: 3 })
    expect(result.status === 'ok' && result.capability).toHaveLength(43)
    expect(rpcs).toEqual([
      {
        fn: 'start_live_view',
        args: {
          want_encounter: 'encounter-id',
          want_code: 'tuesday-game',
          want_capability_hash: await hashLiveViewCapability(mintLiveViewCapability(random)),
        },
      },
    ])
  })

  it('revokes exactly the active capability and fails closed without authentication', async () => {
    const capability = mintLiveViewCapability(new Uint8Array(LIVE_VIEW_CAPABILITY_BYTES).fill(6))
    const signedOut = makeSupabaseStub()
    signedOut.signedOut()
    supa.client = signedOut.client

    await expect(startLiveView('encounter-id', 'code')).resolves.toEqual({ status: 'unauthorized' })

    const active = makeSupabaseStub({ data: true, error: null })
    supa.client = active.client
    await expect(stopLiveView(capability)).resolves.toBe(true)
    expect(active.rpcs).toEqual([
      {
        fn: 'stop_live_view',
        args: { want_capability_hash: await hashLiveViewCapability(capability) },
      },
    ])
  })
})
