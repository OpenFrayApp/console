// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { createContext, useContext } from 'react'
import type { User } from '@supabase/supabase-js'

/** The OAuth identity providers OpenFray signs in with. */
export type OAuthProvider = 'google' | 'discord'

/** The result of an auth attempt: an error message, or null on success. */
export type AuthResult = { error: string | null }

export interface AuthState {
  /** The signed-in user, or null when anonymous. */
  user: User | null
  /** True until the initial session lookup resolves (avoids an auth-UI flash). */
  loading: boolean
  /** Whether Supabase is wired up at all (`.env.local` present). */
  configured: boolean
  /** Start an OAuth sign-in. Redirects to the provider; the session lands on
   *  return. First sign-in with a provider creates the account automatically. */
  signInWithProvider: (provider: OAuthProvider) => Promise<AuthResult>
  signOut: () => Promise<void>
  /** Permanently delete the account and all its data, then sign out (GDPR erasure). */
  deleteAccount: () => Promise<AuthResult>
}

export const AuthContext = createContext<AuthState | null>(null)

/** Anonymous fallback when there's no provider — auth is additive, so the app
 *  (and tests rendering it bare) still work, just signed-out. */
const ANONYMOUS: AuthState = {
  user: null,
  loading: false,
  configured: false,
  signInWithProvider: async () => ({ error: 'Sign-in is not configured yet.' }),
  signOut: async () => {},
  deleteAccount: async () => ({ error: 'Sign-in is not configured yet.' }),
}

export function useAuth(): AuthState {
  return useContext(AuthContext) ?? ANONYMOUS
}
