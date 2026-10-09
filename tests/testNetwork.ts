// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

/** Restrict real fetches to local fixtures; tests can replace this fetch with a mock. */
export function createTestNetwork(nativeFetch: typeof fetch) {
  const blocked: string[] = []
  const guardedFetch: typeof fetch = async (input, init) => {
    const value = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const url = new URL(value, globalThis.location?.href ?? 'http://localhost/')
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    if (!local || !['http:', 'https:'].includes(url.protocol)) {
      // Never include credentials, query parameters, bodies, or headers in the failure.
      const destination = `${url.protocol}//${url.host}${url.pathname}`
      blocked.push(destination)
      throw new Error(
        `Unmocked external fetch blocked: ${destination}. Mock the request in this test.`,
      )
    }
    // A local fixture must not redirect the native fetch to an external service.
    return nativeFetch(input, { ...init, redirect: 'error' })
  }
  return {
    fetch: guardedFetch,
    /** Drain violations so a caught fetch rejection still fails its originating test. */
    takeBlockedRequests: () => blocked.splice(0),
  }
}
