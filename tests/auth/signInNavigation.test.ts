// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { expect, it, vi } from 'vitest'
import { navigateToSiteSignIn } from '../../src/auth/signInNavigation.ts'

it('uses same-tab site sign-in with the current root-relative path, query, and hash', () => {
  const assign = vi.fn()
  navigateToSiteSignIn({
    pathname: '/console/',
    search: '?cast=encounter%20notes',
    hash: '#tracker',
    assign,
  })
  expect(assign).toHaveBeenCalledExactlyOnceWith(
    '/sign-in/?returnTo=%2Fconsole%2F%3Fcast%3Dencounter%2520notes%23tracker',
  )
})

it('never forwards legacy implicit callback tokens in return navigation', () => {
  const assign = vi.fn()
  navigateToSiteSignIn({
    pathname: '/console/',
    search: '',
    hash: '#access_token=legacy-secret&refresh_token=refresh-secret&provider_token=provider-secret&provider_refresh_token=provider-refresh&token_type=bearer&expires_in=3600&expires_at=1780000000',
    assign,
  })
  expect(assign).toHaveBeenCalledExactlyOnceWith('/sign-in/?returnTo=%2Fconsole%2F')
})

it('preserves ordinary route components while dropping recognized callback material from mixed query and hash', () => {
  const assign = vi.fn()
  navigateToSiteSignIn({
    pathname: '/console/',
    search: '?cast=encounter%20notes&access_token=secret&refresh_token=refresh&state=callback',
    hash: '#pane=tracker&error=access_denied&error_code=cancelled&error_description=cancelled',
    assign,
  })
  expect(assign).toHaveBeenCalledExactlyOnceWith(
    '/sign-in/?returnTo=%2Fconsole%2F%3Fcast%3Dencounter%2520notes%23pane%3Dtracker',
  )
})

it('does not mistake ordinary route state and anchor text for an OAuth callback', () => {
  const assign = vi.fn()
  navigateToSiteSignIn({
    pathname: '/console/',
    search: '?state=ordinary&cast=note',
    hash: '#tracker',
    assign,
  })
  expect(assign).toHaveBeenCalledExactlyOnceWith(
    '/sign-in/?returnTo=%2Fconsole%2F%3Fstate%3Dordinary%26cast%3Dnote%23tracker',
  )
})

it('drops callback-shaped route fragments that cannot be selectively cleaned', () => {
  const assign = vi.fn()
  navigateToSiteSignIn({
    pathname: '/console/',
    search: '?cast=notes',
    hash: '#tracker?access_token=secret&refresh_token=refresh',
    assign,
  })
  expect(assign).toHaveBeenCalledExactlyOnceWith('/sign-in/?returnTo=%2Fconsole%2F%3Fcast%3Dnotes')
})
