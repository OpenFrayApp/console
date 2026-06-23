// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { createContext, useContext } from 'react'
import type { User } from '@supabase/supabase-js'

/**
 * The result of an auth attempt: an error message, or null on success. For sign-up,
 * `needsConfirmation` is true when the account was created but a session wasn't —
 * i.e. the project requires email confirmation, so the user must click the link
 * before they can sign in.
 */
export type AuthResult = { error: string | null; needsConfirmation?: boolean }

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
  /** Change the account email (Supabase emails a confirmation link first). */
  updateEmail: (email: string) => Promise<AuthResult>
  /** Set a new password (subject to the project's strength/leaked-password rules). */
  updatePassword: (password: string) => Promise<AuthResult>
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
  signUp: async () => ({ error: 'Sign-in is not configured yet.' }),
  signIn: async () => ({ error: 'Sign-in is not configured yet.' }),
  signOut: async () => {},
  updateEmail: async () => ({ error: 'Sign-in is not configured yet.' }),
  updatePassword: async () => ({ error: 'Sign-in is not configured yet.' }),
  deleteAccount: async () => ({ error: 'Sign-in is not configured yet.' }),
}

export function useAuth(): AuthState {
  return useContext(AuthContext) ?? ANONYMOUS
}
