// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { afterEach, describe, expect, it, vi } from 'vitest'
import { reportShare } from '../../src/state/reports.ts'

afterEach(() => vi.unstubAllGlobals())

describe('report submission', () => {
  it('posts the challenge and bounded fields only to the server boundary', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 201 }))
    vi.stubGlobal('fetch', fetcher)

    await expect(
      reportShare('k7mqx3rt9p', 'spam', 'A note', 'reader@example.com', 'challenge-token'),
    ).resolves.toBe('ok')
    expect(fetcher).toHaveBeenCalledWith('/api/reports', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code: 'k7mqx3rt9p',
        reason: 'spam',
        message: 'A note',
        replyTo: 'reader@example.com',
        challenge: 'challenge-token',
      }),
    })
  })

  it.each([
    [503, 'unavailable'],
    [400, 'failed'],
    [403, 'failed'],
    [409, 'failed'],
    [429, 'failed'],
  ] as const)('preserves the public outcome for HTTP %s', async (status, outcome) => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status })))
    await expect(reportShare('k7mqx3rt9p', 'spam', '', '', 'challenge-token')).resolves.toBe(
      outcome,
    )
  })

  it('reports a network failure without exposing request content', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new Error('offline')))
    await expect(reportShare('k7mqx3rt9p', 'spam', 'private note', '', 'token')).resolves.toBe(
      'failed',
    )
  })
})
