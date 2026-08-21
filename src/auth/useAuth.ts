// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { createContext, useContext } from 'react'
import type { ContentLicense } from '../schema/license.ts'
import type { User } from '@supabase/supabase-js'

/** The OAuth identity providers OpenFray signs in with. */
export type OAuthProvider = 'google' | 'discord'

/** The result of an auth attempt: an error message, or null on success. */
export type AuthResult = { error: string | null }

export interface AuthState {
  /** The signed-in user, or null when anonymous. */
  user: User | null
  /**
   * The name this account publishes under: `display_name` on the user row, which Google and
   * Discord fill in at sign-in and the Game Master can change in their profile. Null only
   * when there is none and none was ever typed.
   *
   * It is a default, never a decision: the share form shows it in an editable field, the
   * profile clears it, and nothing is published until Publish is pressed.
   */
  displayName: string | null
  /**
   * The license this account's shared encounters start on, or null when it has never been
   * set. It seeds the share dialog and is always overridable there — a default that
   * replaced the control rather than filling it would publish a term nobody chose.
   */
  shareLicense: ContentLicense | null
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
  /** Set the name this account publishes under; an empty string clears it back to null. */
  setDisplayName: (name: string) => Promise<AuthResult>
  setShareLicense: (license: ContentLicense) => Promise<AuthResult>
}

export const AuthContext = createContext<AuthState | null>(null)

/** Anonymous fallback when there's no provider — auth is additive, so the app
 *  (and tests rendering it bare) still work, just signed-out. */
const ANONYMOUS: AuthState = {
  user: null,
  displayName: null,
  shareLicense: null,
  loading: false,
  configured: false,
  signInWithProvider: async () => ({
    error: 'Signing in isn’t available on this copy of OpenFray.',
  }),
  signOut: async () => {},
  deleteAccount: async () => ({ error: 'Accounts aren’t available on this copy of OpenFray.' }),
  setDisplayName: async () => ({ error: 'Accounts aren’t available on this copy of OpenFray.' }),
  setShareLicense: async () => ({ error: 'Accounts aren’t available on this copy of OpenFray.' }),
}

/** The auth state from context, or the anonymous fallback outside an AuthProvider. */
export function useAuth(): AuthState {
  return useContext(AuthContext) ?? ANONYMOUS
}
