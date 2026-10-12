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
