// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { describe, expect, it, vi } from 'vitest'

import { handleMusicRequest, type MusicWorkerEnvironment } from '../../workers/music/worker.ts'

const bytes = new TextEncoder().encode('0123456789')

/** Build an R2 object response with production-shaped metadata. */
function r2MusicObject(range?: { offset: number; length: number }, contentType = 'audio/ogg') {
  const selected = range ? bytes.slice(range.offset, range.offset + range.length) : bytes
  return {
    body: new Blob([selected]).stream(),
    size: bytes.byteLength,
    range,
    httpEtag: '"ancient-god-etag"',
    httpMetadata: { contentType },
    /** Copy the stored media metadata into a response. */
    writeHttpMetadata(headers: Headers) {
      headers.set('Content-Type', contentType)
    },
  }
}

/** Build Worker bindings whose object read can be inspected and controlled. */
function environment(
  result:
    | ReturnType<typeof r2MusicObject>
    | Omit<ReturnType<typeof r2MusicObject>, 'body'>
    | null = r2MusicObject(),
): MusicWorkerEnvironment & { get: ReturnType<typeof vi.fn> } {
  const get = vi.fn(async () => result)
  return {
    MUSIC_BUCKET: { get },
    MUSIC_RATE_LIMITER: { limit: vi.fn(async () => ({ success: true })) },
    get,
  }
}

describe('music delivery Worker', () => {
  it('serves only an allowlisted stable track ID without exposing its object key', async () => {
    const env = environment()

    const response = await handleMusicRequest(
      new Request('https://openfray.app/console/music/ancient-god'),
      env,
    )

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('0123456789')
    expect(env.get).toHaveBeenCalledWith(
      'tracks/ancient-god/d4a1d5259ad94cba75522439c454a14e0a1ed298820460f532f0697317ceace5.ogg',
      {
        onlyIf: expect.any(Headers),
        range: expect.any(Headers),
      },
    )
    expect(response.headers.get('Content-Type')).toBe('audio/ogg')
    expect(response.headers.get('Content-Length')).toBe('10')
    expect(response.headers.get('Accept-Ranges')).toBe('bytes')
    expect(response.headers.get('ETag')).toBe('"ancient-god-etag"')
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
  })

  it.each([
    '/console/music/unknown',
    '/console/music/../secret',
    '/console/music/%2e%2e%2fsecret',
    '/console/music/ancient-god/extra',
  ])('refuses unknown and traversal path %s before reading R2', async (path) => {
    const env = environment()

    const response = await handleMusicRequest(new Request(`https://openfray.app${path}`), env)

    expect(response.status).toBe(404)
    expect(env.get).not.toHaveBeenCalled()
  })

  it('returns the requested byte range with media range metadata', async () => {
    const env = environment(r2MusicObject({ offset: 2, length: 4 }))

    const response = await handleMusicRequest(
      new Request('https://openfray.app/console/music/ancient-god', {
        headers: { Range: 'bytes=2-5' },
      }),
      env,
    )

    expect(response.status).toBe(206)
    expect(await response.text()).toBe('2345')
    expect(response.headers.get('Content-Range')).toBe('bytes 2-5/10')
    expect(response.headers.get('Content-Length')).toBe('4')
  })

  it('supports HEAD without returning audio bytes', async () => {
    const env = environment()

    const response = await handleMusicRequest(
      new Request('https://openfray.app/console/music/ancient-god', { method: 'HEAD' }),
      env,
    )

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('')
    expect(response.headers.get('Content-Length')).toBe('10')
  })

  it('refuses missing objects and objects without approved audio metadata', async () => {
    const missing = await handleMusicRequest(
      new Request('https://openfray.app/console/music/ancient-god'),
      environment(null),
    )
    const wrongType = await handleMusicRequest(
      new Request('https://openfray.app/console/music/ancient-god'),
      environment(r2MusicObject(undefined, 'text/plain')),
    )

    expect(missing.status).toBe(404)
    expect(wrongType.status).toBe(404)
  })

  it.each([
    ['If-None-Match', '"ancient-god-etag"', 304],
    ['If-Modified-Since', 'Wed, 21 Oct 2015 07:28:00 GMT', 304],
    ['If-Match', '"other-etag"', 412],
    ['If-Unmodified-Since', 'Wed, 21 Oct 2015 07:28:00 GMT', 412],
  ])('returns the correct status for a failed %s condition', async (name, value, status) => {
    const metadata: Partial<ReturnType<typeof r2MusicObject>> = { ...r2MusicObject() }
    delete metadata.body
    const response = await handleMusicRequest(
      new Request('https://openfray.app/console/music/ancient-god', {
        headers: { [name]: value },
      }),
      environment(metadata as Omit<ReturnType<typeof r2MusicObject>, 'body'>),
    )

    expect(response.status).toBe(status)
    expect(response.headers.get('ETag')).toBe('"ancient-god-etag"')
    expect(response.headers.get('Content-Length')).toBeNull()
  })

  it('limits abusive clients and rejects explicit cross-site hotlinks', async () => {
    const env = environment()
    env.MUSIC_RATE_LIMITER.limit = vi.fn(async () => ({ success: false }))
    const limited = await handleMusicRequest(
      new Request('https://openfray.app/console/music/ancient-god'),
      env,
    )
    const hotlink = await handleMusicRequest(
      new Request('https://openfray.app/console/music/ancient-god', {
        headers: { 'Sec-Fetch-Site': 'cross-site', Referer: 'https://example.com/' },
      }),
      environment(),
    )

    expect(limited.status).toBe(429)
    expect(limited.headers.get('Retry-After')).toBe('60')
    expect(hotlink.status).toBe(403)
  })

  it('allows anonymous same-origin playback and refuses unsupported methods', async () => {
    const anonymous = await handleMusicRequest(
      new Request('https://openfray.app/console/music/ancient-god', {
        headers: { 'Sec-Fetch-Site': 'same-origin' },
      }),
      environment(),
    )
    const write = await handleMusicRequest(
      new Request('https://openfray.app/console/music/ancient-god', { method: 'PUT' }),
      environment(),
    )

    expect(anonymous.status).toBe(200)
    expect(write.status).toBe(405)
    expect(write.headers.get('Allow')).toBe('GET, HEAD')
  })
})
