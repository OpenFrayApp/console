// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { afterEach, expect, it, vi } from 'vitest'
import { submitFeedback } from '../../src/state/feedback.ts'

afterEach(() => vi.unstubAllGlobals())

it('submits feedback without carrying unknown or non-bug diagnostic fields', async () => {
  const network = vi.fn().mockResolvedValue(Response.json({ result: 'email' }, { status: 201 }))
  vi.stubGlobal('fetch', network)
  const result = await submitFeedback(
    {
      category: 'security',
      title: 'Private report',
      description: 'Details',
      expected: 'Hidden',
      details: {
        browser: 'Firefox',
        os: 'Linux',
        viewport: '800 × 600',
        creatures: 2,
        players: 1,
        npcs: 0,
      },
    },
    'verified',
  )
  expect(result).toEqual({ result: 'email' })
  expect(JSON.parse(network.mock.calls[0][1].body)).toEqual({
    category: 'security',
    title: 'Private report',
    description: 'Details',
    challenge: 'verified',
  })
})

it.each([
  { result: 'issue', url: 'https://evil.example/report' },
  { result: 'issue', url: 'https://github.com/OpenFrayApp/console/issues/42?token=secret' },
  { result: 'unknown' },
])('rejects untrusted success responses', async (response) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(response, { status: 201 })))
  expect(
    await submitFeedback(
      { category: 'bug', title: 'A title', description: 'A description' },
      'token',
    ),
  ).toEqual({ result: 'failed' })
})

it('never presents a public issue as success for Security', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { result: 'issue', url: 'https://github.com/OpenFrayApp/console/issues/42' },
          { status: 201 },
        ),
      ),
  )
  expect(
    await submitFeedback(
      { category: 'security', title: 'Private', description: 'Private' },
      'token',
    ),
  ).toEqual({ result: 'failed' })
})

it('returns a safe failure when the network throws or the server rejects feedback', async () => {
  const network = vi
    .fn()
    .mockRejectedValueOnce(new Error('private-detail'))
    .mockResolvedValueOnce(Response.json({ result: 'email' }, { status: 429 }))
  vi.stubGlobal('fetch', network)
  const draft = { category: 'bug' as const, title: 'A title', description: 'A description' }
  expect(await submitFeedback(draft, 'token')).toEqual({ result: 'failed' })
  expect(await submitFeedback(draft, 'token')).toEqual({ result: 'failed' })
})

it('does not send blank or over-limit input', async () => {
  const network = vi.fn()
  vi.stubGlobal('fetch', network)
  expect(
    await submitFeedback({ category: 'bug', title: ' ', description: 'Some detail' }, 'token'),
  ).toEqual({ result: 'failed' })
  expect(
    await submitFeedback(
      { category: 'bug', title: 'x'.repeat(257), description: 'Some detail' },
      'token',
    ),
  ).toEqual({ result: 'failed' })
  expect(network).not.toHaveBeenCalled()
})
