// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { isContentLicense, type ContentLicense } from '../schema/license.ts'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase.ts'
import { parseTutorialSuppression, type TutorialSuppression } from '../state/settings.ts'
import {
  writeTutorialAccountPreference,
  TUTORIAL_ACCOUNT_WRITE_ERROR,
} from './tutorialAccountPreference.ts'
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
  const [identityExpired, setIdentityExpired] = useState(false)
  const explicitSignOut = useRef(false)
  const identity = useRef<{ session: Session | null; generation: number }>({
    session: null,
    generation: 0,
  })
  const preferenceWrites = useRef(new Set<AbortController>())

  /** Invalidate pending tutorial writes before replacing or ending an identity. */
  const invalidatePreferenceWrites = useCallback(() => {
    identity.current.generation += 1
    for (const controller of preferenceWrites.current) controller.abort()
    preferenceWrites.current.clear()
  }, [])

  useEffect(() => {
    if (!supabase) return
    let active = true
    let authEventReceived = false
    const currentIdentity = identity.current
    /** Install auth identity while retaining confirmed suppression within the same session. */
    const installSession = (session: Session | null) => {
      const previous = identity.current.session
      const sameIdentity = previous?.user.id === session?.user.id
      if (!sameIdentity) invalidatePreferenceWrites()
      const confirmed = sameIdentity
        ? parseTutorialSuppression(previous?.user.user_metadata?.tutorial_suppression)
        : null
      const next =
        session && confirmed
          ? {
              ...session,
              user: {
                ...session.user,
                user_metadata: { ...session.user.user_metadata, tutorial_suppression: confirmed },
              },
            }
          : session
      identity.current.session = next
      setUser(next?.user ?? null)
    }
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active || authEventReceived) return
        installSession(data.session ?? null)
        if (error) setIdentityExpired(true)
        setLoading(false)
      })
      .catch(() => {
        if (!active || authEventReceived) return
        setIdentityExpired(true)
        setLoading(false)
      })
    // Fires on sign-in/out and token refresh, keeping `user` in sync across tabs.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active || event === 'INITIAL_SESSION') return
      authEventReceived = true
      if (event === 'SIGNED_OUT') invalidatePreferenceWrites()
      setIdentityExpired(event === 'SIGNED_OUT' && !explicitSignOut.current)
      installSession(session)
      setLoading(false)
    })
    return () => {
      active = false
      invalidatePreferenceWrites()
      currentIdentity.session = null
      sub.subscription.unsubscribe()
    }
  }, [invalidatePreferenceWrites])

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
    explicitSignOut.current = true
    invalidatePreferenceWrites()
    try {
      await supabase.auth.signOut()
    } finally {
      explicitSignOut.current = false
    }
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

  const identityGeneration = identity.current.generation
  /** Persist tutorial suppression without restoring a stale auth session or metadata. */
  const setTutorialSuppression = useCallback(
    async (reason: TutorialSuppression): Promise<AuthResult> => {
      const captured = identity.current
      if (
        !supabase ||
        loading ||
        identityExpired ||
        !user?.id ||
        captured.session?.user.id !== user.id ||
        captured.generation !== identityGeneration ||
        !parseTutorialSuppression(reason)
      )
        return { error: TUTORIAL_ACCOUNT_WRITE_ERROR }
      if (parseTutorialSuppression(captured.session.user.user_metadata?.tutorial_suppression))
        return { error: null }
      const controller = new AbortController()
      preferenceWrites.current.add(controller)
      const result = await writeTutorialAccountPreference(
        user.id,
        captured.session.access_token,
        reason,
        controller.signal,
      )
      preferenceWrites.current.delete(controller)
      if (
        controller.signal.aborted ||
        identity.current.generation !== identityGeneration ||
        identity.current.session?.user.id !== user.id
      )
        return { error: TUTORIAL_ACCOUNT_WRITE_ERROR }
      if (result.error) return result
      setUser((current) => {
        const session = identity.current.session
        if (
          !current ||
          !session ||
          current.id !== user.id ||
          identity.current.generation !== identityGeneration
        )
          return current
        const updated = {
          ...current,
          user_metadata: {
            ...current.user_metadata,
            tutorial_suppression:
              parseTutorialSuppression(current.user_metadata?.tutorial_suppression) ?? reason,
          },
        }
        identity.current.session = { ...session, user: updated }
        return updated
      })
      return { error: null }
    },
    [user?.id, loading, identityExpired, identityGeneration],
  )

  /** Permanently delete the account and all its data, then sign out. */
  const deleteAccount = async (): Promise<AuthResult> => {
    if (!supabase) return { error: 'Accounts aren’t available on this copy of OpenFray.' }
    // Self-delete can't use the admin API from the browser, so this calls a
    // security-definer SQL function (delete_account) that erases the caller's data
    // and auth row. On success we sign out — the session is already invalid.
    explicitSignOut.current = true
    try {
      invalidatePreferenceWrites()
      const { error } = await supabase.rpc('delete_account')
      if (error) return { error: error.message }
      await supabase.auth.signOut()
      return { error: null }
    } finally {
      explicitSignOut.current = false
    }
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
        tutorialSuppression: parseTutorialSuppression(user?.user_metadata?.tutorial_suppression),
        loading,
        identityExpired,
        configured: Boolean(supabase),
        signInWithProvider,
        signOut,
        deleteAccount,
        setDisplayName,
        setShareLicense,
        setTutorialSuppression,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
