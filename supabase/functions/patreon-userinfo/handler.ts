// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

const IDENTITY_URL =
  'https://www.patreon.com/api/oauth2/v2/identity?fields%5Buser%5D=email,full_name,image_url'
const HEADERS = { 'Cache-Control': 'no-store', Pragma: 'no-cache' }

/** Narrow a JSON value to a plain object. */
function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

/** Return a nonempty profile string when Patreon supplies one. */
function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/** Return a non-cacheable OAuth error without exposing upstream data. */
function failure(status: number, error: string, description: string): Response {
  return Response.json(
    { error, error_description: description },
    {
      status,
      headers: {
        ...HEADERS,
        ...(status === 401 ? { 'WWW-Authenticate': 'Bearer error="invalid_token"' } : {}),
        ...(status === 405 ? { Allow: 'GET' } : {}),
      },
    },
  )
}

/** Validate a Patreon bearer token and expose only the profile fields Supabase Auth reads. */
export async function handlePatreonUserinfo(
  request: Request,
  fetchProfile: typeof fetch = fetch,
): Promise<Response> {
  if (request.method !== 'GET') return failure(405, 'invalid_request', 'Use GET for UserInfo.')
  const authorization = request.headers.get('Authorization') ?? ''
  if (authorization.length > 4096 || !/^Bearer [A-Za-z0-9._~+/=-]+$/i.test(authorization)) {
    return failure(401, 'invalid_token', 'A Patreon bearer token is required.')
  }

  try {
    // Keep the destination fixed and reject redirects so bearer tokens cannot leave Patreon.
    const response = await fetchProfile(IDENTITY_URL, {
      method: 'GET',
      headers: { Authorization: authorization, Accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) {
      await response.body?.cancel()
      if (response.status === 401) {
        return failure(401, 'invalid_token', 'Patreon rejected the bearer token.')
      }
      if (response.status === 403) {
        return failure(403, 'insufficient_scope', 'Patreon denied access to the profile.')
      }
      return failure(502, 'server_error', 'The Patreon profile could not be fetched.')
    }

    const payload: unknown = await response.json()
    const data = object(object(payload)?.data)
    const attributes = object(data?.attributes)
    const sub = text(data?.id)
    if (data?.type !== 'user' || !sub || !attributes) {
      return failure(502, 'server_error', 'Patreon returned an invalid user profile.')
    }
    const email = text(attributes.email)
    if (!email || !/^[^\s@]+@[^\s@]+$/.test(email)) {
      return failure(
        422,
        'invalid_request',
        'Patreon did not share an email. Grant identity[email].',
      )
    }
    const name = text(attributes.full_name)
    const picture = text(attributes.image_url)
    return Response.json(
      {
        sub,
        email,
        // Patreon v2 does not document an email-verification claim; do not invent one.
        email_verified: false,
        ...(name ? { name } : {}),
        ...(picture ? { picture } : {}),
      },
      { headers: HEADERS },
    )
  } catch {
    return failure(502, 'server_error', 'The Patreon profile could not be fetched.')
  }
}
