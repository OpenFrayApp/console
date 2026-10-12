// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

/** Leave in the same tab; the site alone initiates OAuth and validates the return destination. */
export function navigateToSiteSignIn(
  location: Pick<Location, 'pathname' | 'search' | 'hash' | 'assign'> = window.location,
): void {
  const returnTo = location.pathname + location.search + location.hash
  location.assign(`/sign-in/?returnTo=${encodeURIComponent(returnTo)}`)
}
