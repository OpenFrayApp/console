// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

const CALLBACK_FIELDS = new Set([
  'access_token',
  'refresh_token',
  'provider_token',
  'provider_refresh_token',
  'token_type',
  'expires_in',
  'expires_at',
  'error',
  'error_code',
  'error_description',
  'code',
  'attempt',
])

/** Drop legacy callback material without accepting or installing its session. */
function withoutCallbackMaterial(component: string): string {
  if (!component) return component
  const value = component.slice(1)
  const keys = [...new URLSearchParams(value).keys()].map((key) => key.toLowerCase())
  const callback = keys.some((key) => CALLBACK_FIELDS.has(key))
  if (!callback) {
    // A callback embedded in a route fragment cannot be cleaned as ordinary parameters.
    const query = value.indexOf('?')
    if (
      query >= 0 &&
      [...new URLSearchParams(value.slice(query + 1)).keys()].some((key) =>
        CALLBACK_FIELDS.has(key.toLowerCase()),
      )
    )
      return ''
    return component
  }
  const remaining = value
    .split('&')
    .filter((field) => {
      const key = [...new URLSearchParams(field).keys()][0]?.toLowerCase()
      return !CALLBACK_FIELDS.has(key) && key !== 'state' && key !== 'type'
    })
    .join('&')
  return remaining ? component[0] + remaining : ''
}

/** Leave in the same tab; the site alone initiates OAuth and validates the return destination. */
export function navigateToSiteSignIn(
  location: Pick<Location, 'pathname' | 'search' | 'hash' | 'assign'> = window.location,
): void {
  const returnTo =
    location.pathname +
    withoutCallbackMaterial(location.search) +
    withoutCallbackMaterial(location.hash)
  location.assign(`/sign-in/?returnTo=${encodeURIComponent(returnTo)}`)
}
