// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useEffect, useState, type ReactNode } from 'react'
import { isContentLicense, type ContentLicense } from '../schema/license.ts'
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

  /** Start the OAuth redirect to the provider; the session lands when the browser returns. */
  const signInWithProvider = async (provider: OAuthProvider): Promise<AuthResult> => {
    if (!supabase) return { error: 'Signing in isn’t available on this copy of OpenFray.' }
    // Redirect-based flow: the browser navigates to the provider and returns to
    // the app, where supabase-js detects the session from the callback URL.
    // Return to the app's own path (origin + base, e.g. /console/), not the site
    // root. `redirectTo` must be in the project's allow-list (Authentication → URL
    // Configuration). The provider verifies the identity — no email sent by us.
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
    })
    return { error: error?.message ?? null }
  }

  /** Revoke owner publication before ending the authenticated session. */
  const signOut = async (): Promise<void> => {
    if (!supabase) return
    const { error } = await supabase.rpc('stop_all_live_views')
    if (error) {
      console.error('[openfray] revoking live views before sign-out failed', error)
      return
    }
    await supabase.auth.signOut()
  }

  /**
   * Write the name this account publishes under onto the user row (`user_metadata`), or
   * clear it. Supabase returns the updated user, so the app sees the new name at once
   * rather than waiting for the next session refresh.
   *
   * This is the same `display_name` Google and Discord filled in at sign-in, so saving here
   * replaces what they called you with what you publish as — one name, in the place the
   * database already keeps it.
   */
  const setDisplayName = async (name: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Accounts aren’t available on this copy of OpenFray.' }
    const trimmed = name.trim()
    const { data, error } = await supabase.auth.updateUser({
      data: { display_name: trimmed || null },
    })
    if (error) return { error: error.message }
    if (data.user) setUser(data.user)
    return { error: null }
  }

  /**
   * Remember what this account's shared encounters should start on. It lives beside the
   * display name in `user_metadata` rather than in a table of its own: there is no profiles
   * table to add a column to, and a preference the account already stores one of belongs
   * where that one is.
   */
  const setShareLicense = async (license: ContentLicense): Promise<AuthResult> => {
    if (!supabase) return { error: 'Accounts aren’t available on this copy of OpenFray.' }
    const { data, error } = await supabase.auth.updateUser({
      // Unstated is the absent state, so choosing it clears the default rather than
      // recording a preference for saying nothing.
      data: { share_license: license === 'unstated' ? null : license },
    })
    if (error) return { error: error.message }
    if (data.user) setUser(data.user)
    return { error: null }
  }

  /** Permanently delete the account and all its data, then sign out. */
  const deleteAccount = async (): Promise<AuthResult> => {
    if (!supabase) return { error: 'Accounts aren’t available on this copy of OpenFray.' }
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
        // Whatever the user row says — the provider's name until the Game Master changes it
        // in their profile or types a different one when publishing. Three keys because
        // three providers disagree: Supabase's own `display_name`, and the `full_name` /
        // `name` that Google and Discord actually write. Reading only the first left the
        // field empty for accounts whose name is under one of the others.
        displayName:
          ((user?.user_metadata?.display_name ??
            user?.user_metadata?.full_name ??
            user?.user_metadata?.name) as string | undefined) || null,
        // Validated rather than trusted: it is metadata, and a value the app doesn't know
        // is no answer at all. Unknown reads as "never set", which seeds nothing.
        shareLicense: isContentLicense(user?.user_metadata?.share_license)
          ? user.user_metadata.share_license
          : null,
        loading,
        configured: Boolean(supabase),
        signInWithProvider,
        signOut,
        deleteAccount,
        setDisplayName,
        setShareLicense,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
