// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors
// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, renderHook } from '@testing-library/react'
import { useAuth } from '../../src/auth/useAuth.ts'

afterEach(cleanup)

describe('useAuth outside an AuthProvider', () => {
  it('falls back to a signed-out, unconfigured state', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.user).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.configured).toBe(false)
  })

  it('reports sign-in as unavailable instead of throwing', async () => {
    const { result } = renderHook(() => useAuth())
    await expect(result.current.signInWithProvider('google')).resolves.toEqual({
      error: 'Signing in isn’t available on this copy of OpenFray.',
    })
  })

  it('reports account deletion as unavailable instead of throwing', async () => {
    const { result } = renderHook(() => useAuth())
    await expect(result.current.deleteAccount()).resolves.toEqual({
      error: 'Accounts aren’t available on this copy of OpenFray.',
    })
  })

  it('treats sign-out as a harmless no-op', async () => {
    const { result } = renderHook(() => useAuth())
    await expect(result.current.signOut()).resolves.toBeUndefined()
  })
})
