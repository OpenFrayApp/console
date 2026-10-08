// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { describe, expect, it, vi } from 'vitest'
import { handlePatreonUserinfo } from '../../supabase/functions/patreon-userinfo/handler.ts'
import entrypoint from '../../supabase/functions/patreon-userinfo/index.ts'

const profile = {
  data: {
    id: 'patreon-user-123',
    type: 'user',
    attributes: {
      email: 'gm@example.com',
      full_name: 'Game Master',
      image_url: 'https://example.com/avatar.png',
      about: 'Private profile text',
    },
    relationships: { memberships: { data: [{ id: 'private-membership' }] } },
  },
  included: [{ private: true }],
}

/** Create a UserInfo request using a synthetic Patreon token. */
function request(authorization: string | null = 'Bearer test-patreon-token', method = 'GET') {
  return new Request('https://example.com/functions/v1/patreon-userinfo', {
    method,
    headers: authorization === null ? {} : { Authorization: authorization },
  })
}

/** Return a mocked HTTP fetch with a chosen upstream response. */
function upstream(body: unknown = profile, status = 200) {
  return vi.fn<typeof fetch>().mockResolvedValue(Response.json(body, { status }))
}

/** Assert that neither successful profiles nor errors can be cached. */
function expectNoCache(response: Response) {
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect(response.headers.get('Pragma')).toBe('no-cache')
}

describe('Patreon UserInfo adapter', () => {
  it('unwraps the nested Patreon profile into top-level Supabase claims', async () => {
    const fetchProfile = upstream()
    const response = await handlePatreonUserinfo(request(), fetchProfile)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      sub: 'patreon-user-123',
      email: 'gm@example.com',
      email_verified: false,
      name: 'Game Master',
      picture: 'https://example.com/avatar.png',
    })
    expectNoCache(response)
    expect(response.headers.has('Access-Control-Allow-Origin')).toBe(false)
    expect(fetchProfile).toHaveBeenCalledExactlyOnceWith(
      'https://www.patreon.com/api/oauth2/v2/identity?fields%5Buser%5D=email,full_name,image_url',
      {
        method: 'GET',
        headers: { Authorization: 'Bearer test-patreon-token', Accept: 'application/json' },
        redirect: 'error',
        signal: expect.any(AbortSignal),
      },
    )
  })

  it('never accepts a caller-controlled upstream URL or token in query parameters', async () => {
    const fetchProfile = upstream()
    const response = await handlePatreonUserinfo(
      new Request('https://example.com/?url=https://attacker.example&access_token=secret'),
      fetchProfile,
    )
    expect(response.status).toBe(401)
    expect(fetchProfile).not.toHaveBeenCalled()
  })

  it.each([
    null,
    '',
    'Basic test',
    'Bearer',
    'Bearer token with spaces',
    `Bearer ${'a'.repeat(4096)}`,
  ])('rejects missing or malformed bearer credentials (%s)', async (authorization) => {
    const fetchProfile = upstream()
    const response = await handlePatreonUserinfo(request(authorization), fetchProfile)
    expect(response.status).toBe(401)
    expect(response.headers.get('WWW-Authenticate')).toBe('Bearer error="invalid_token"')
    expectNoCache(response)
    expect(fetchProfile).not.toHaveBeenCalled()
  })

  it.each(['POST', 'PUT', 'DELETE', 'OPTIONS'])(
    'rejects %s before fetching a profile',
    async (method) => {
      const fetchProfile = upstream()
      const response = await handlePatreonUserinfo(request(undefined, method), fetchProfile)
      expect(response.status).toBe(405)
      expect(response.headers.get('Allow')).toBe('GET')
      expectNoCache(response)
      expect(fetchProfile).not.toHaveBeenCalled()
    },
  )

  it.each([
    [401, 401, 'invalid_token'],
    [403, 403, 'insufficient_scope'],
    [429, 502, 'server_error'],
    [500, 502, 'server_error'],
    [302, 502, 'server_error'],
  ])('sanitizes Patreon status %s', async (upstreamStatus, status, error) => {
    const response = await handlePatreonUserinfo(
      request(),
      upstream({ error: 'private upstream details and token' }, upstreamStatus as number),
    )
    expect(response.status).toBe(status)
    expect(await response.json()).toMatchObject({ error })
    expectNoCache(response)
  })

  it.each([
    null,
    [],
    {},
    { data: { ...profile.data, id: '' } },
    { data: { ...profile.data, type: 'campaign' } },
    { data: { ...profile.data, attributes: [] } },
  ])('rejects an invalid identity structure (%j)', async (body) => {
    const response = await handlePatreonUserinfo(request(), upstream(body))
    expect(response.status).toBe(502)
  })

  it.each([undefined, null, '', 'invalid-email', 123])('requires an email (%s)', async (email) => {
    const response = await handlePatreonUserinfo(
      request(),
      upstream({ data: { ...profile.data, attributes: { email } } }),
    )
    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({
      error: 'invalid_request',
      error_description: 'Patreon did not share an email. Grant identity[email].',
    })
  })

  it('keeps optional fields absent and does not invent email verification', async () => {
    const response = await handlePatreonUserinfo(
      request(),
      upstream({
        data: {
          ...profile.data,
          attributes: {
            email: 'gm@example.com',
            is_email_verified: true,
            full_name: null,
            image_url: 123,
          },
        },
      }),
    )
    expect(await response.json()).toEqual({
      sub: 'patreon-user-123',
      email: 'gm@example.com',
      email_verified: false,
    })
  })

  it.each([
    new Error('private network detail'),
    new DOMException('private timeout', 'TimeoutError'),
  ])('sanitizes network errors and timeouts', async (error) => {
    const response = await handlePatreonUserinfo(
      request(),
      vi.fn<typeof fetch>().mockRejectedValue(error),
    )
    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({
      error: 'server_error',
      error_description: 'The Patreon profile could not be fetched.',
    })
    expectNoCache(response)
  })

  it('sanitizes non-JSON upstream responses', async () => {
    const response = await handlePatreonUserinfo(
      request(),
      vi.fn<typeof fetch>().mockResolvedValue(new Response('private upstream HTML')),
    )
    expect(response.status).toBe(502)
  })

  it('exports the Edge Runtime fetch entrypoint', async () => {
    expect((await entrypoint.fetch(request(null))).status).toBe(401)
  })
})
