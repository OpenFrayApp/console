// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { createContext, useContext } from 'react'
import type { User } from '@supabase/supabase-js'

/** The result of an auth attempt: an error message, or null on success. */
export type AuthResult = { error: string | null }

export interface AuthState {
  /** The signed-in user, or null when anonymous. */
  user: User | null
  /** True until the initial session lookup resolves (avoids an auth-UI flash). */
  loading: boolean
  /** Whether Supabase is wired up at all (`.env.local` present). */
  configured: boolean
  signUp: (email: string, password: string) => Promise<AuthResult>
  signIn: (email: string, password: string) => Promise<AuthResult>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

/** Anonymous fallback when there's no provider — auth is additive, so the app
 *  (and tests rendering it bare) still work, just signed-out. */
const ANONYMOUS: AuthState = {
  user: null,
  loading: false,
  configured: false,
  signUp: async () => ({ error: 'Sign-in is not configured yet.' }),
  signIn: async () => ({ error: 'Sign-in is not configured yet.' }),
  signOut: async () => {},
}

export function useAuth(): AuthState {
  return useContext(AuthContext) ?? ANONYMOUS
}
