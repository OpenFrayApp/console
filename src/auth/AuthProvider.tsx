// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase.ts'
import { AuthContext, type AuthResult } from './useAuth.ts'

/**
 * Tracks the Supabase auth session and exposes sign-up / sign-in / sign-out.
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

  const signUp = async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Sign-in is not configured yet.' }
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message ?? null }
  }

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Sign-in is not configured yet.' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signOut = async (): Promise<void> => {
    await supabase?.auth.signOut()
  }

  const updateEmail = async (email: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Sign-in is not configured yet.' }
    // Supabase doesn't change the email until the user confirms via the link(s) it
    // sends; success here just means the confirmation email is on its way.
    const { error } = await supabase.auth.updateUser({ email })
    return { error: error?.message ?? null }
  }

  const updatePassword = async (password: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Sign-in is not configured yet.' }
    const { error } = await supabase.auth.updateUser({ password })
    return { error: error?.message ?? null }
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
        signUp,
        signIn,
        signOut,
        updateEmail,
        updatePassword,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
