// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase.ts'
import { AuthContext, type AuthResult, type CampaignSettings } from './useAuth.ts'

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

  const updateCampaign = async (settings: CampaignSettings): Promise<AuthResult> => {
    if (!supabase) return { error: 'Sign-in is not configured yet.' }
    // Campaign settings live in the user's metadata — no extra table needed; they
    // sync with the account. onAuthStateChange fires USER_UPDATED, refreshing `user`.
    const { error } = await supabase.auth.updateUser({
      data: { campaignName: settings.name, edition: settings.edition },
    })
    return { error: error?.message ?? null }
  }

  const campaign: CampaignSettings = {
    name: (user?.user_metadata?.campaignName as string | undefined) || undefined,
    edition: (user?.user_metadata?.edition as '5.0' | '5.5' | undefined) || undefined,
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, configured: Boolean(supabase), campaign, signUp, signIn, signOut, updateCampaign }}
    >
      {children}
    </AuthContext.Provider>
  )
}
