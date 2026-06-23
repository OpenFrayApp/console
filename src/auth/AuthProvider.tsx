// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase.ts'
import { AuthContext, type AuthResult, type OAuthProvider } from './useAuth.ts'

/**
 * Tracks the Supabase auth session and exposes OAuth sign-in / sign-out / delete.
 * When Supabase isn't configured, it resolves immediately to the anonymous state
 * so the app runs exactly as before — auth is purely additive.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  // Only "loading" if there's a session to look up; otherwise we're anon at once.
  const [loading, setLoading] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    // Fires on sign-in/out and token refresh, keeping `user` in sync across tabs.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signInWithProvider = async (provider: OAuthProvider): Promise<AuthResult> => {
    if (!supabase) return { error: 'Sign-in is not configured yet.' }
    // Redirect-based flow: the browser navigates to the provider and returns to
    // the app, where supabase-js detects the session from the callback URL.
    // `redirectTo` must be in the project's allow-list (Authentication → URL
    // Configuration). The provider verifies the identity — no email sent by us.
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    })
    return { error: error?.message ?? null }
  }

  const signOut = async (): Promise<void> => {
    await supabase?.auth.signOut()
  }

  const deleteAccount = async (): Promise<AuthResult> => {
    if (!supabase) return { error: 'Sign-in is not configured yet.' }
    // Self-delete can't use the admin API from the browser, so this calls a
    // security-definer SQL function (delete_account) that erases the caller's data
    // and auth row. On success we sign out — the session is already invalid.
    const { error } = await supabase.rpc('delete_account')
    if (error) return { error: error.message }
    await supabase.auth.signOut()
    return { error: null }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        configured: Boolean(supabase),
        signInWithProvider,
        signOut,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
