// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { describe, expect, it, vi } from 'vitest'
import { createTestNetwork } from '../testNetwork.ts'

describe('test fetch boundary', () => {
  it.each([
    'https://production.supabase.co/rest/v1/encounters',
    new URL('https://example.com/api'),
    new Request('https://example.com/api'),
    'https://localhost.example.com/api',
    'https://127.0.0.1.example.com/api',
    'https://192.168.1.2/api',
    'file:///private/config',
  ])('rejects an unmocked non-loopback destination (%s)', async (input) => {
    const native = vi.fn<typeof fetch>()
    const network = createTestNetwork(native)
    await expect(network.fetch(input)).rejects.toThrow('Unmocked external fetch blocked')
    expect(native).not.toHaveBeenCalled()
    expect(network.takeBlockedRequests()).toHaveLength(1)
    expect(network.takeBlockedRequests()).toEqual([])
  })

  it.each([
    'http://localhost:5199/fixture',
    'http://127.0.0.1:5199/fixture',
    'http://[::1]:5199/fixture',
    '/console/compendium/index.json',
  ])('allows local fixtures without following redirects (%s)', async (input) => {
    const response = new Response('{}')
    const native = vi.fn<typeof fetch>().mockResolvedValue(response)
    const network = createTestNetwork(native)
    expect(await network.fetch(input, { method: 'POST', redirect: 'follow' })).toBe(response)
    expect(native).toHaveBeenCalledExactlyOnceWith(input, { method: 'POST', redirect: 'error' })
    expect(network.takeBlockedRequests()).toEqual([])
  })

  it('redacts credentials and query parameters and remembers caught failures', async () => {
    const network = createTestNetwork(vi.fn<typeof fetch>())
    const url = 'https://user:secret@example.com/api?token=secret#secret'
    await expect(network.fetch(url)).rejects.toThrow(
      'Unmocked external fetch blocked: https://example.com/api.',
    )
    expect(network.takeBlockedRequests()).toEqual(['https://example.com/api'])
  })
})
