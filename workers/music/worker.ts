// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { musicTrackIdFromPath } from '../../src/music/catalog.ts'
import { curatedMusicCatalog } from './catalog.ts'

interface MusicObjectRange {
  offset: number
  length: number
}

interface MusicObject {
  body: ReadableStream
  size: number
  range?: MusicObjectRange
  httpEtag: string
  httpMetadata?: { contentType?: string }
  writeHttpMetadata(headers: Headers): void
}

type MusicConditionalObject = Omit<MusicObject, 'body'>

interface MusicBucket {
  get(
    key: string,
    options: { onlyIf: Headers; range: Headers },
  ): Promise<MusicObject | MusicConditionalObject | null>
}

interface MusicRateLimiter {
  limit(input: { key: string }): Promise<{ success: boolean }>
}

export interface MusicWorkerEnvironment {
  MUSIC_BUCKET: MusicBucket
  MUSIC_RATE_LIMITER: MusicRateLimiter
}

const cacheControl = 'public, max-age=31536000, immutable'

/** Return a response that reveals no bucket or catalog internals. */
function plainResponse(status: number, body: string, headers?: HeadersInit): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...headers },
  })
}

/** Accept requests from the console while discouraging direct cross-site embedding. */
function isAllowedPlaybackRequest(request: Request): boolean {
  const fetchSite = request.headers.get('Sec-Fetch-Site')
  if (fetchSite === 'cross-site') return false

  const referrer = request.headers.get('Referer')
  if (!referrer) return true
  try {
    return new URL(referrer).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

/** Identify a client for the Cloudflare location-local abuse limit. */
function rateLimitKey(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? 'anonymous'
}

/** Build media headers from an approved R2 object without forwarding unsafe metadata. */
function mediaHeaders(object: MusicObject | MusicConditionalObject, contentType: string): Headers {
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('Accept-Ranges', 'bytes')
  headers.set('Cache-Control', cacheControl)
  headers.set('Content-Type', contentType)
  headers.set('ETag', object.httpEtag)
  headers.set('X-Content-Type-Options', 'nosniff')

  if (object.range) {
    const end = object.range.offset + object.range.length - 1
    headers.set('Content-Length', String(object.range.length))
    headers.set('Content-Range', `bytes ${object.range.offset}-${end}/${object.size}`)
  } else {
    headers.set('Content-Length', String(object.size))
  }
  return headers
}

/** Serve one allowlisted catalog track from private R2 storage. */
export async function handleMusicRequest(
  request: Request,
  env: MusicWorkerEnvironment,
): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return plainResponse(405, 'Method not allowed.', { Allow: 'GET, HEAD' })
  }

  const trackId = musicTrackIdFromPath(new URL(request.url).pathname)
  if (!trackId) return plainResponse(404, 'Track not found.')
  const track = curatedMusicCatalog[trackId as keyof typeof curatedMusicCatalog]
  if (!track) return plainResponse(404, 'Track not found.')
  if (!isAllowedPlaybackRequest(request)) return plainResponse(403, 'Playback refused.')

  const rateLimit = await env.MUSIC_RATE_LIMITER.limit({ key: rateLimitKey(request) })
  if (!rateLimit.success) {
    return plainResponse(429, 'Too many music requests.', { 'Retry-After': '60' })
  }

  let object: MusicObject | MusicConditionalObject | null
  try {
    object = await env.MUSIC_BUCKET.get(track.objectKey, {
      onlyIf: request.headers,
      range: request.headers,
    })
  } catch {
    return plainResponse(503, 'Music is temporarily unavailable.', { 'Retry-After': '60' })
  }
  if (!object || object.httpMetadata?.contentType !== track.contentType) {
    return plainResponse(404, 'Track not found.')
  }

  const headers = mediaHeaders(object, track.contentType)
  if (!('body' in object)) {
    headers.delete('Content-Length')
    headers.delete('Content-Range')
    const failedMutationCondition =
      request.headers.has('If-Match') || request.headers.has('If-Unmodified-Since')
    return new Response(null, { status: failedMutationCondition ? 412 : 304, headers })
  }
  const status = object.range ? 206 : 200
  return new Response(request.method === 'HEAD' ? null : object.body, { status, headers })
}

export default {
  /** Route Cloudflare Worker requests through the narrow music handler. */
  fetch: handleMusicRequest,
}
